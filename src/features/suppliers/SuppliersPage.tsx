import React, { useMemo, useState } from 'react';
import { IndianRupee, Phone } from 'lucide-react';
import { PageContainer, PageHeader } from '@/src/components/layout/PageContainer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';
import { Badge, getPaymentStatusVariant } from '@/src/components/ui/badge';
import { Input, Label } from '@/src/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/src/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/src/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/src/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/src/components/ui/table';
import { useBuildFlow } from '@/src/context/BuildFlowContext';
import { formatINR, formatIndianDate } from '@/src/lib/utils';
import type { PaymentMode } from '@/src/types';

export function SuppliersPage() {
  const {
    suppliers,
    purchaseOrders,
    expenses,
    supplierPayments,
    supplierRates,
    catalogueMaterials,
    recordSupplierPayment,
  } = useBuildFlow();

  const [selectedSupplierId, setSelectedSupplierId] = useState(suppliers[0]?.id ?? '');
  const [payOpen, setPayOpen] = useState(false);

  // Payment form state
  const [payBillNo, setPayBillNo] = useState('');
  const [payAmount, setPayAmount] = useState('');
  const [payDate, setPayDate] = useState('2026-11-24');
  const [payMode, setPayMode] = useState<PaymentMode>('Bank Transfer');
  const [payRef, setPayRef] = useState('');

  const selectedSupplier =
    suppliers.find((s) => s.id === selectedSupplierId) ?? suppliers[0];

  const supplierPos = useMemo(
    () => purchaseOrders.filter((po) => po.supplierId === selectedSupplier?.id),
    [purchaseOrders, selectedSupplier],
  );

  const supplierBills = useMemo(
    () => expenses.filter((e) => e.supplierId === selectedSupplier?.id),
    [expenses, selectedSupplier],
  );

  const paymentsMade = useMemo(
    () => supplierPayments.filter((p) => p.supplierId === selectedSupplier?.id),
    [supplierPayments, selectedSupplier],
  );

  const totalOutstanding = useMemo(
    () => suppliers.reduce((s, sup) => s + sup.outstandingBalance, 0),
    [suppliers],
  );

  // Build material price comparison rows
  const priceComparisonRows = useMemo(() => {
    return catalogueMaterials
      .map((mat) => {
        const quotes = supplierRates
          .filter((r) => r.materialId === mat.id)
          .map((r) => ({
            ...r,
            supplierName: suppliers.find((s) => s.id === r.supplierId)?.name ?? 'Supplier',
          }))
          .sort((a, b) => a.unitPrice - b.unitPrice);
        return { material: mat, quotes };
      })
      .filter((row) => row.quotes.length > 0);
  }, [catalogueMaterials, supplierRates, suppliers]);

  const handlePaySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Number(payAmount);
    if (!selectedSupplier || !Number.isFinite(amt) || amt <= 0) return;

    recordSupplierPayment({
      supplierId: selectedSupplier.id,
      billNumber: payBillNo.trim() || 'ON-ACCOUNT',
      amount: amt,
      date: payDate,
      mode: payMode,
      referenceNo: payRef.trim() || `UTR-${Date.now().toString().slice(-6)}`,
    });

    setPayOpen(false);
    setPayBillNo('');
    setPayAmount('');
    setPayRef('');
  };

  return (
    <PageContainer>
      <PageHeader
        title="Suppliers & Procurement"
        description="Manage construction material vendors, payment terms, bill settlements, and comparative rate cards."
        actions={
          selectedSupplier && (
            <Button
              size="sm"
              onClick={() => {
                const openBill = supplierBills.find((b) => b.amount > b.paidAmount);
                setPayBillNo(openBill?.billNumber ?? '');
                setPayAmount(
                  openBill ? String(openBill.amount - openBill.paidAmount) : String(selectedSupplier.outstandingBalance),
                );
                setPayOpen(true);
              }}
            >
              <IndianRupee className="h-4 w-4" />
              Pay {selectedSupplier.name.split(' ')[0]}
            </Button>
          )
        }
      />

      {/* Summary Strip */}
      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="p-5">
          <p className="text-xs font-medium text-[#64748B]">Active Material Suppliers</p>
          <p className="mt-1.5 font-mono text-xl font-semibold text-[#0F172A] tabular-nums">
            {suppliers.length}
          </p>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-medium text-[#64748B]">Total Outstanding Payables</p>
          <p className="mt-1.5 font-mono text-xl font-semibold text-[#B45309] tabular-nums">
            {formatINR(totalOutstanding)}
          </p>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-medium text-[#64748B]">Cumulative Material Supplied</p>
          <p className="mt-1.5 font-mono text-xl font-semibold text-[#0F172A] tabular-nums">
            {formatINR(suppliers.reduce((s, sup) => s + sup.totalSupplied, 0))}
          </p>
        </Card>
      </div>

      <Tabs defaultValue="directory">
        <TabsList>
          <TabsTrigger value="directory">Suppliers & Account Ledger</TabsTrigger>
          <TabsTrigger value="comparison">Material Price Comparison</TabsTrigger>
        </TabsList>

        <TabsContent value="directory">
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
            {/* Supplier List */}
            <Card className="lg:col-span-5">
              <CardHeader className="border-b border-[#F1F5F9]">
                <CardTitle>Vendor Directory</CardTitle>
                <CardDescription>Select a supplier to inspect bills and payment history</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <ul className="divide-y divide-[#F1F5F9]">
                  {suppliers.map((sup) => {
                    const active = sup.id === selectedSupplier?.id;
                    return (
                      <li key={sup.id}>
                        <button
                          type="button"
                          onClick={() => setSelectedSupplierId(sup.id)}
                          className={`w-full text-left px-5 py-3.5 transition-colors cursor-pointer ${
                            active ? 'bg-[#FBF1EC]' : 'hover:bg-[#FAF8F3]'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-[#0F172A] truncate">
                                {sup.name}
                              </p>
                              <p className="mt-0.5 text-xs text-[#64748B]">
                                {(sup.categories ?? [sup.category]).join(' · ')}
                              </p>
                            </div>
                            <span
                              className={`font-mono text-xs font-semibold tabular-nums shrink-0 ${
                                sup.outstandingBalance > 0 ? 'text-[#B45309]' : 'text-[#15803D]'
                              }`}
                            >
                              {formatINR(sup.outstandingBalance)}
                            </span>
                          </div>
                          <p className="mt-1 text-[11px] text-[#64748B]">
                            {sup.contactPerson} · {sup.paymentTerms ?? 'Net 15 Days'} · {sup.city}
                          </p>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </CardContent>
            </Card>

            {/* Supplier Detail Workspace */}
            {selectedSupplier && (
              <div className="lg:col-span-7 space-y-5">
                <Card>
                  <CardHeader className="border-b border-[#F1F5F9]">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <CardTitle className="text-base">{selectedSupplier.name}</CardTitle>
                        <CardDescription>
                          GSTIN: {selectedSupplier.gstNumber} · Terms:{' '}
                          {selectedSupplier.paymentTerms ?? 'Net 15 Days'}
                        </CardDescription>
                      </div>
                      <Badge variant={selectedSupplier.outstandingBalance > 0 ? 'warning' : 'success'}>
                        Due: {formatINR(selectedSupplier.outstandingBalance)}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 text-xs">
                      <div>
                        <dt className="text-[#64748B]">Primary Contact</dt>
                        <dd className="mt-0.5 font-medium text-[#0F172A] flex items-center gap-1.5">
                          <Phone className="h-3.5 w-3.5 text-[#64748B]" />
                          {selectedSupplier.contactPerson} ({selectedSupplier.phone})
                        </dd>
                      </div>
                      <div>
                        <dt className="text-[#64748B]">Email & Dispatch Yard</dt>
                        <dd className="mt-0.5 font-medium text-[#0F172A]">
                          {selectedSupplier.email ?? 'accounts@vendor.in'}
                        </dd>
                        <dd className="text-[#64748B]">{selectedSupplier.address ?? selectedSupplier.city}</dd>
                      </div>
                      <div>
                        <dt className="text-[#64748B]">Material Categories</dt>
                        <dd className="mt-0.5 font-medium text-[#0F172A]">
                          {(selectedSupplier.categories ?? [selectedSupplier.category]).join(', ')}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-[#64748B]">Total Supplied / Next Due</dt>
                        <dd className="mt-0.5 font-mono font-semibold text-[#0F172A] tabular-nums">
                          {formatINR(selectedSupplier.totalSupplied)} ·{' '}
                          {selectedSupplier.dueDate ? formatIndianDate(selectedSupplier.dueDate) : '—'}
                        </dd>
                      </div>
                    </dl>
                  </CardContent>
                </Card>

                {/* Supplier Bills */}
                <Card>
                  <CardHeader className="border-b border-[#F1F5F9]">
                    <CardTitle>Supplier Bills ({supplierBills.length})</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Bill # & Date</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead className="text-right">Billed</TableHead>
                          <TableHead className="text-right">Balance</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {supplierBills.map((bill) => {
                          const bal = Math.max(0, bill.amount - bill.paidAmount);
                          return (
                            <TableRow key={bill.id}>
                              <TableCell className="whitespace-nowrap">
                                <p className="font-mono text-xs font-medium">{bill.billNumber}</p>
                                <p className="text-[11px] text-[#64748B] tabular-nums">
                                  {formatIndianDate(bill.date)}
                                </p>
                              </TableCell>
                              <TableCell className="text-xs text-[#475569] max-w-[200px] truncate">
                                {bill.description}
                              </TableCell>
                              <TableCell className="text-right font-mono text-xs tabular-nums">
                                {formatINR(bill.amount)}
                              </TableCell>
                              <TableCell className="text-right font-mono text-xs font-semibold tabular-nums">
                                {formatINR(bal)}
                              </TableCell>
                              <TableCell>
                                <Badge variant={getPaymentStatusVariant(bill.paymentStatus)}>
                                  {bill.paymentStatus}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>

                {/* Purchase History & Payments Made */}
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <Card>
                    <CardHeader className="border-b border-[#F1F5F9]">
                      <CardTitle>Purchase Orders ({supplierPos.length})</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      <ul className="divide-y divide-[#F1F5F9] text-xs">
                        {supplierPos.length === 0 ? (
                          <li className="px-4 py-5 text-[#64748B]">No recent POs</li>
                        ) : (
                          supplierPos.map((po) => (
                            <li key={po.id} className="flex items-center justify-between px-4 py-3">
                              <div>
                                <p className="font-mono font-semibold text-[#0F172A]">{po.poNumber}</p>
                                <p className="text-[#64748B] tabular-nums">
                                  {formatIndianDate(po.orderDate)} · {po.status}
                                </p>
                              </div>
                              <span className="font-mono font-semibold tabular-nums">
                                {formatINR(po.totalAmount)}
                              </span>
                            </li>
                          ))
                        )}
                      </ul>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="border-b border-[#F1F5F9]">
                      <CardTitle>Payments Made ({paymentsMade.length})</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      <ul className="divide-y divide-[#F1F5F9] text-xs">
                        {paymentsMade.length === 0 ? (
                          <li className="px-4 py-5 text-[#64748B]">No settlements logged yet</li>
                        ) : (
                          paymentsMade.map((pm) => (
                            <li key={pm.id} className="flex items-center justify-between px-4 py-3">
                              <div>
                                <p className="font-medium text-[#0F172A]">Bill {pm.billNumber}</p>
                                <p className="text-[#64748B] tabular-nums">
                                  {formatIndianDate(pm.date)} · {pm.mode}
                                </p>
                              </div>
                              <span className="font-mono font-semibold text-[#15803D] tabular-nums">
                                {formatINR(pm.amount)}
                              </span>
                            </li>
                          ))
                        )}
                      </ul>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="comparison">
          <Card>
            <CardHeader className="border-b border-[#F1F5F9]">
              <CardTitle>Supplier Material Price Comparison</CardTitle>
              <CardDescription>
                Compare quoted unit rates and delivery lead times across empanelled vendors
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Material</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead>Quoted Vendors & Rates</TableHead>
                    <TableHead className="text-right">Best Rate</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {priceComparisonRows.map(({ material, quotes }) => {
                    const best = quotes[0];
                    return (
                      <TableRow key={material.id}>
                        <TableCell>
                          <p className="font-medium text-[#0F172A]">{material.name}</p>
                          <p className="text-xs text-[#64748B]">{material.category}</p>
                        </TableCell>
                        <TableCell className="text-xs text-[#475569]">{material.unit}</TableCell>
                        <TableCell>
                          <div className="space-y-1.5">
                            {quotes.map((q, idx) => (
                              <div
                                key={q.id}
                                className="flex items-center justify-between gap-4 text-xs"
                              >
                                <span className={idx === 0 ? 'font-semibold text-[#0F172A]' : 'text-[#475569]'}>
                                  {q.supplierName}{' '}
                                  <span className="text-[#64748B]">
                                    ({q.leadTimeDays}d lead · {formatIndianDate(q.lastQuotedDate)})
                                  </span>
                                </span>
                                <span
                                  className={`font-mono tabular-nums ${
                                    idx === 0 ? 'font-semibold text-[#15803D]' : 'text-[#475569]'
                                  }`}
                                >
                                  {formatINR(q.unitPrice)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <p className="font-mono text-sm font-semibold text-[#15803D] tabular-nums">
                            {formatINR(best.unitPrice)}
                          </p>
                          <p className="text-[11px] text-[#64748B]">{best.supplierName.split(' ')[0]}</p>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Record Supplier Payment Dialog */}
      <Dialog open={payOpen} onOpenChange={setPayOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Record Supplier Payment</DialogTitle>
            <DialogDescription>
              Settle pending invoice balance for {selectedSupplier?.name}.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handlePaySubmit} className="flex flex-col overflow-hidden">
            <div className="px-6 py-5 space-y-4">
              <div className="space-y-1.5">
                <Label>Bill Number</Label>
                <Input
                  value={payBillNo}
                  onChange={(e) => setPayBillNo(e.target.value)}
                  placeholder="e.g. SB-26-845"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Amount (₹) *</Label>
                  <Input
                    type="number"
                    min={1}
                    value={payAmount}
                    onChange={(e) => setPayAmount(e.target.value)}
                    className="font-mono tabular-nums"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Date *</Label>
                  <Input type="date" value={payDate} onChange={(e) => setPayDate(e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Payment Mode</Label>
                  <Select value={payMode} onValueChange={(v) => setPayMode(v as PaymentMode)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                      <SelectItem value="UPI">UPI</SelectItem>
                      <SelectItem value="Cheque">Cheque</SelectItem>
                      <SelectItem value="Cash">Cash</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>UTR / Reference</Label>
                  <Input value={payRef} onChange={(e) => setPayRef(e.target.value)} />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setPayOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Record Payment</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
