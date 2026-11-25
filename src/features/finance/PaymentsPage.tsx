import React, { useMemo, useState } from 'react';
import { Plus, Printer, RotateCcw, ShieldAlert } from 'lucide-react';
import { PageContainer, PageHeader } from '@/src/components/layout/PageContainer';
import { Card, CardContent } from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';
import { Badge, getPaymentStatusVariant } from '@/src/components/ui/badge';
import { Input, Label, Textarea } from '@/src/components/ui/input';
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
import type { CustomerPayment, PaymentMode } from '@/src/types';

const PAYMENT_MODES: PaymentMode[] = ['Bank Transfer', 'UPI', 'Cheque', 'Cash', 'Other'];

export function PaymentsPage() {
  const { projects, payments, recordCustomerPayment } = useBuildFlow();

  const [projectFilter, setProjectFilter] = useState('all');
  const [recordOpen, setRecordOpen] = useState(false);
  const [receiptPayment, setReceiptPayment] = useState<CustomerPayment | undefined>();
  const [reversalPayment, setReversalPayment] = useState<CustomerPayment | undefined>();

  // Form state
  const [projectId, setProjectId] = useState(projects[0]?.id ?? '');
  const [selectedPendingId, setSelectedPendingId] = useState('custom');
  const [stage, setStage] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState('2026-11-24');
  const [mode, setMode] = useState<PaymentMode>('Bank Transfer');
  const [referenceNo, setReferenceNo] = useState('');
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState('');

  const filteredPayments = useMemo(() => {
    return payments
      .filter((p) => projectFilter === 'all' || p.projectId === projectFilter)
      .sort((a, b) => ((a.paidDate ?? a.dueDate) < (b.paidDate ?? b.dueDate) ? 1 : -1));
  }, [payments, projectFilter]);

  const pendingForSelectedProject = useMemo(
    () => payments.filter((p) => p.projectId === projectId && p.status !== 'Received'),
    [payments, projectId],
  );

  const summary = useMemo(() => {
    const received = filteredPayments
      .filter((p) => p.status === 'Received')
      .reduce((s, p) => s + p.amount, 0);
    const pending = filteredPayments
      .filter((p) => p.status !== 'Received')
      .reduce((s, p) => s + p.amount, 0);
    const overdue = filteredPayments
      .filter((p) => p.status === 'Overdue')
      .reduce((s, p) => s + p.amount, 0);
    return { received, pending, overdue };
  }, [filteredPayments]);

  const handleSelectPending = (val: string) => {
    setSelectedPendingId(val);
    if (val === 'custom') {
      setStage('');
      setAmount('');
      return;
    }
    const found = payments.find((p) => p.id === val);
    if (found) {
      setStage(found.stage);
      setAmount(String(found.amount));
    }
  };

  const handleRecordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numericAmount = Number(amount);
    if (!projectId || !stage.trim() || !Number.isFinite(numericAmount) || numericAmount <= 0) {
      setFormError('Select a project, milestone description, and enter a valid positive amount.');
      return;
    }
    const created = recordCustomerPayment({
      projectId,
      existingPaymentId: selectedPendingId !== 'custom' ? selectedPendingId : undefined,
      stage: stage.trim(),
      amount: numericAmount,
      date,
      mode,
      referenceNo: referenceNo.trim() || `REF-${Date.now().toString().slice(-6)}`,
      notes: notes.trim(),
    });
    setRecordOpen(false);
    setFormError('');
    setSelectedPendingId('custom');
    setStage('');
    setAmount('');
    setReferenceNo('');
    setNotes('');
    setReceiptPayment(created);
  };

  const getProjectName = (id: string) => projects.find((p) => p.id === id)?.name ?? 'Project';

  return (
    <PageContainer>
      <PageHeader
        title="Customer Payments"
        description="Record stage-linked customer receipts, generate printable receipts, and monitor overdue balances."
        actions={
          <div className="flex items-center gap-2">
            <Select value={projectFilter} onValueChange={setProjectFilter}>
              <SelectTrigger className="w-[200px] bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Projects</SelectItem>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={() => setRecordOpen(true)}>
              <Plus className="h-4 w-4" />
              Record Payment
            </Button>
          </div>
        }
      />

      {/* Summary Cards */}
      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="p-5">
          <p className="text-xs font-medium text-[#64748B]">Total Received</p>
          <p className="mt-1.5 font-mono text-xl font-semibold text-[#15803D] tabular-nums">
            {formatINR(summary.received)}
          </p>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-medium text-[#64748B]">Scheduled & Pending</p>
          <p className="mt-1.5 font-mono text-xl font-semibold text-[#0F172A] tabular-nums">
            {formatINR(summary.pending)}
          </p>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-medium text-[#64748B]">Overdue Invoices</p>
          <p className="mt-1.5 font-mono text-xl font-semibold text-[#B91C1C] tabular-nums">
            {formatINR(summary.overdue)}
          </p>
        </Card>
      </div>

      {/* Payments Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice / Receipt</TableHead>
                <TableHead>Project & Customer</TableHead>
                <TableHead>Milestone Stage</TableHead>
                <TableHead>Date & Mode</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPayments.map((pay) => (
                <TableRow key={pay.id}>
                  <TableCell>
                    <p className="font-mono text-xs font-semibold text-[#0F172A]">
                      {pay.receiptNumber ?? pay.invoiceNumber}
                    </p>
                    <p className="font-mono text-[11px] text-[#64748B]">
                      {pay.referenceNo ?? pay.invoiceNumber}
                    </p>
                  </TableCell>
                  <TableCell>
                    <p className="font-medium text-[#0F172A]">{getProjectName(pay.projectId)}</p>
                    <p className="text-xs text-[#64748B]">{pay.customerName}</p>
                  </TableCell>
                  <TableCell className="text-xs text-[#334155] max-w-[240px]">
                    {pay.stage}
                  </TableCell>
                  <TableCell className="text-xs text-[#475569] tabular-nums">
                    {pay.paidDate ? (
                      <>
                        <p>{formatIndianDate(pay.paidDate)}</p>
                        <p className="text-[11px] text-[#64748B]">{pay.mode}</p>
                      </>
                    ) : (
                      <p>Due {formatIndianDate(pay.dueDate)}</p>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-mono font-semibold text-[#0F172A] tabular-nums">
                    {formatINR(pay.amount)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={getPaymentStatusVariant(pay.status)}>{pay.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {pay.status === 'Received' ? (
                      <div className="inline-flex items-center gap-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setReceiptPayment(pay)}
                        >
                          <Printer className="h-3.5 w-3.5" />
                          Receipt
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setReversalPayment(pay)}
                          title="Approved payments cannot be deleted; request reversal or adjustment"
                        >
                          <RotateCcw className="h-3.5 w-3.5 text-[#64748B]" />
                          Adjust
                        </Button>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setProjectId(pay.projectId);
                          setSelectedPendingId(pay.id);
                          setStage(pay.stage);
                          setAmount(String(pay.amount));
                          setRecordOpen(true);
                        }}
                      >
                        Record Receipt
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Record Customer Payment Dialog */}
      <Dialog open={recordOpen} onOpenChange={setRecordOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Record Customer Payment</DialogTitle>
            <DialogDescription>
              Log a received milestone payment and generate an official printable receipt.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleRecordSubmit} className="flex flex-col overflow-hidden">
            <div className="overflow-y-auto px-6 py-5 space-y-4">
              {formError && (
                <div className="rounded-md border border-[#FECACA] bg-[#FEF2F2] px-3 py-2 text-xs text-[#B91C1C]">
                  {formError}
                </div>
              )}

              <div className="space-y-1.5">
                <Label>Project *</Label>
                <Select
                  value={projectId}
                  onValueChange={(v) => {
                    setProjectId(v);
                    setSelectedPendingId('custom');
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name} ({p.customerName})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Payment Milestone</Label>
                <Select value={selectedPendingId} onValueChange={handleSelectPending}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose scheduled milestone or custom" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="custom">Custom / Unscheduled Payment</SelectItem>
                    {pendingForSelectedProject.map((pm) => (
                      <SelectItem key={pm.id} value={pm.id}>
                        {pm.invoiceNumber} — {pm.stage} ({formatINR(pm.amount)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Milestone / Stage Description *</Label>
                <Input
                  value={stage}
                  onChange={(e) => setStage(e.target.value)}
                  placeholder="e.g. First Floor Slab Milestone"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Amount Received (₹) *</Label>
                  <Input
                    type="number"
                    min={1}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="font-mono tabular-nums"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Payment Date *</Label>
                  <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Payment Method *</Label>
                  <Select value={mode} onValueChange={(v) => setMode(v as PaymentMode)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PAYMENT_MODES.map((m) => (
                        <SelectItem key={m} value={m}>
                          {m}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Transaction Reference / UTR / Cheque No.</Label>
                  <Input
                    value={referenceNo}
                    onChange={(e) => setReferenceNo(e.target.value)}
                    placeholder="UTR / UPI Ref / Cheque #"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Notes</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Optional payment remarks..."
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setRecordOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Save & Generate Receipt</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Printable Receipt Preview Dialog */}
      <Dialog open={Boolean(receiptPayment)} onOpenChange={(o) => !o && setReceiptPayment(undefined)}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Payment Receipt Preview</DialogTitle>
            <DialogDescription>
              Official customer acknowledgement for residential construction billing
            </DialogDescription>
          </DialogHeader>
          {receiptPayment && (
            <div className="px-6 py-5">
              <div className="rounded-lg border border-[#CBD5E1] bg-white p-6 space-y-5 text-sm">
                <div className="flex items-start justify-between border-b border-[#E2E8F0] pb-4">
                  <div>
                    <h3 className="text-base font-bold text-[#252A27]">Kulkarni Homes Pvt. Ltd.</h3>
                    <p className="text-xs text-[#64748B]">GSTIN: 29AABCK9012M1Z4 · Bengaluru</p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-xs font-semibold text-[#15803D]">PAYMENT RECEIPT</p>
                    <p className="font-mono text-xs text-[#0F172A] mt-0.5">
                      {receiptPayment.receiptNumber ?? receiptPayment.invoiceNumber}
                    </p>
                  </div>
                </div>

                <dl className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <dt className="text-[#64748B]">Received From</dt>
                    <dd className="mt-0.5 font-semibold text-[#0F172A]">
                      {receiptPayment.customerName}
                    </dd>
                  </div>
                  <div className="text-right">
                    <dt className="text-[#64748B]">Receipt Date</dt>
                    <dd className="mt-0.5 font-medium text-[#0F172A] tabular-nums">
                      {formatIndianDate(receiptPayment.paidDate ?? receiptPayment.dueDate)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[#64748B]">Project</dt>
                    <dd className="mt-0.5 font-medium text-[#0F172A]">
                      {getProjectName(receiptPayment.projectId)}
                    </dd>
                  </div>
                  <div className="text-right">
                    <dt className="text-[#64748B]">Payment Mode & Ref</dt>
                    <dd className="mt-0.5 font-mono text-[#0F172A]">
                      {receiptPayment.mode} · {receiptPayment.referenceNo ?? '—'}
                    </dd>
                  </div>
                </dl>

                <div className="rounded-md bg-[#F8FAFC] border border-[#E2E8F0] p-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-[#64748B]">Towards Construction Stage</p>
                    <p className="font-medium text-[#0F172A] mt-0.5">{receiptPayment.stage}</p>
                  </div>
                  <p className="font-mono text-xl font-bold text-[#15803D] tabular-nums">
                    {formatINR(receiptPayment.amount)}
                  </p>
                </div>

                {receiptPayment.notes && (
                  <p className="text-xs text-[#475569]">Notes: {receiptPayment.notes}</p>
                )}

                <div className="flex items-end justify-between border-t border-[#E2E8F0] pt-4 text-[11px] text-[#64748B]">
                  <span>Computer-generated receipt · BuildFlow Ledger</span>
                  <span className="font-medium text-[#0F172A]">Authorized Signatory</span>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setReceiptPayment(undefined)}>
              Close
            </Button>
            <Button onClick={() => window.print()}>
              <Printer className="h-4 w-4" />
              Print Receipt
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Immutable Audit / Reversal Placeholder Dialog */}
      <Dialog open={Boolean(reversalPayment)} onOpenChange={(o) => !o && setReversalPayment(undefined)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-[#B45309]" />
              Reversal & Adjustment Policy
            </DialogTitle>
            <DialogDescription>
              Approved financial receipts are immutable for audit compliance.
            </DialogDescription>
          </DialogHeader>
          <div className="px-6 py-4 space-y-3 text-xs leading-relaxed text-[#334155]">
            <p>
              Receipt{' '}
              <span className="font-mono font-semibold text-[#0F172A]">
                {reversalPayment?.receiptNumber ?? reversalPayment?.invoiceNumber}
              </span>{' '}
              ({formatINR(reversalPayment?.amount ?? 0)}) cannot be permanently deleted.
            </p>
            <p className="rounded-md border border-[#FDE68A] bg-[#FFFBEB] p-3 text-[#92400E]">
              When connected to the Express + PostgreSQL accounting ledger, reversal and credit
              adjustment journal entries will be created with full audit trail attribution.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReversalPayment(undefined)}>
              Understood
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
