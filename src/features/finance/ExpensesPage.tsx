import React, { useMemo, useState } from 'react';
import { CheckCircle2, Paperclip, Plus, RotateCcw, ShieldAlert } from 'lucide-react';
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
import type {
  Expense,
  ExpenseApprovalStatus,
  ExpenseCategory,
  PaymentMode,
} from '@/src/types';

const CATEGORIES: ExpenseCategory[] = [
  'Materials',
  'Labour Wages',
  'Subcontractor',
  'Equipment & Shuttering',
  'Transport & Unloading',
  'Site Utilities & Approvals',
];

const PAYMENT_MODES: PaymentMode[] = ['Bank Transfer', 'UPI', 'Cheque', 'Cash', 'Other'];

export function ExpensesPage() {
  const { projects, expenses, recordExpense, updateExpenseApproval } = useBuildFlow();

  const [projectFilter, setProjectFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [reversalExpense, setReversalExpense] = useState<Expense | undefined>();

  // Form fields
  const [projectId, setProjectId] = useState(projects[0]?.id ?? '');
  const [category, setCategory] = useState<ExpenseCategory>('Materials');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState('2026-11-24');
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('UPI');
  const [vendorName, setVendorName] = useState('');
  const [billNumber, setBillNumber] = useState('');
  const [approvalStatus, setApprovalStatus] = useState<ExpenseApprovalStatus>('Pending Approval');
  const [attachmentName, setAttachmentName] = useState('');
  const [formError, setFormError] = useState('');

  const filtered = useMemo(() => {
    return expenses
      .filter((e) => {
        if (projectFilter !== 'all' && e.projectId !== projectFilter) return false;
        if (categoryFilter !== 'all' && e.category !== categoryFilter) return false;
        return true;
      })
      .sort((a, b) => (a.date < b.date ? 1 : -1));
  }, [expenses, projectFilter, categoryFilter]);

  const totals = useMemo(() => {
    const total = filtered.reduce((s, e) => s + e.amount, 0);
    const approved = filtered
      .filter((e) => (e.approvalStatus ?? 'Approved') === 'Approved')
      .reduce((s, e) => s + e.amount, 0);
    const pendingApproval = filtered.filter((e) => e.approvalStatus === 'Pending Approval').length;
    return { total, approved, pendingApproval };
  }, [filtered]);

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Number(amount);
    if (!projectId || !vendorName.trim() || !description.trim() || !Number.isFinite(amt) || amt <= 0) {
      setFormError('Fill in project, vendor/paid-to, description, and a positive amount.');
      return;
    }
    recordExpense({
      projectId,
      date,
      category,
      description: description.trim(),
      vendorName: vendorName.trim(),
      amount: amt,
      paidAmount: amt,
      paymentMode,
      paymentStatus: 'Paid',
      approvalStatus,
      receiptAttachmentName: attachmentName.trim() || `Receipt_${date}.pdf`,
      billNumber: billNumber.trim() || `EXP-${Date.now().toString().slice(-4)}`,
    });
    setCreateOpen(false);
    setDescription('');
    setAmount('');
    setVendorName('');
    setBillNumber('');
    setAttachmentName('');
    setFormError('');
  };

  const getProjectName = (id: string) => projects.find((p) => p.id === id)?.name ?? 'Project';

  return (
    <PageContainer>
      <PageHeader
        title="Expenses"
        description="Track site material bills, labour payroll, subcontractor payouts, approvals, and receipt attachments."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Select value={projectFilter} onValueChange={setProjectFilter}>
              <SelectTrigger className="w-[180px] bg-white">
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

            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[180px] bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" />
              Record Expense
            </Button>
          </div>
        }
      />

      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="p-5">
          <p className="text-xs font-medium text-[#64748B]">Total Recorded Expenses</p>
          <p className="mt-1.5 font-mono text-xl font-semibold text-[#0F172A] tabular-nums">
            {formatINR(totals.total)}
          </p>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-medium text-[#64748B]">Approved Expenditure</p>
          <p className="mt-1.5 font-mono text-xl font-semibold text-[#15803D] tabular-nums">
            {formatINR(totals.approved)}
          </p>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-medium text-[#64748B]">Pending Approval</p>
          <p className="mt-1.5 font-mono text-xl font-semibold text-[#B45309] tabular-nums">
            {totals.pendingApproval} voucher(s)
          </p>
        </Card>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date & Bill</TableHead>
                <TableHead>Project & Category</TableHead>
                <TableHead>Paid To & Description</TableHead>
                <TableHead>Mode & Receipt</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Approval</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((exp) => {
                const approval = exp.approvalStatus ?? 'Approved';
                return (
                  <TableRow key={exp.id}>
                    <TableCell className="whitespace-nowrap">
                      <p className="text-xs font-medium text-[#0F172A] tabular-nums">
                        {formatIndianDate(exp.date)}
                      </p>
                      <p className="font-mono text-[11px] text-[#64748B]">{exp.billNumber}</p>
                    </TableCell>
                    <TableCell>
                      <p className="text-xs font-semibold text-[#0F172A]">
                        {getProjectName(exp.projectId)}
                      </p>
                      <p className="text-xs text-[#64748B]">{exp.category}</p>
                    </TableCell>
                    <TableCell className="max-w-[260px]">
                      <p className="font-medium text-[#0F172A] truncate">{exp.vendorName}</p>
                      <p className="text-xs text-[#64748B] truncate">{exp.description}</p>
                    </TableCell>
                    <TableCell className="text-xs text-[#475569]">
                      <p>{exp.paymentMode}</p>
                      {exp.receiptAttachmentName && (
                        <p className="mt-0.5 inline-flex items-center gap-1 font-mono text-[11px] text-[#A65229]">
                          <Paperclip className="h-3 w-3" />
                          {exp.receiptAttachmentName}
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-mono font-semibold text-[#0F172A] tabular-nums">
                      {formatINR(exp.amount)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          approval === 'Approved'
                            ? 'success'
                            : approval === 'Rejected'
                              ? 'danger'
                              : getPaymentStatusVariant('Pending')
                        }
                      >
                        {approval}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {approval === 'Pending Approval' ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateExpenseApproval(exp.id, 'Approved')}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5 text-[#15803D]" />
                          Approve
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setReversalExpense(exp)}
                        >
                          <RotateCcw className="h-3.5 w-3.5 text-[#64748B]" />
                          Adjust
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Record Expense Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Record Project Expense</DialogTitle>
            <DialogDescription>
              Log a site voucher, vendor bill, or labour payout against a residential project.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateSubmit} className="flex flex-col overflow-hidden">
            <div className="overflow-y-auto px-6 py-5 space-y-4">
              {formError && (
                <div className="rounded-md border border-[#FECACA] bg-[#FEF2F2] px-3 py-2 text-xs text-[#B91C1C]">
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Project *</Label>
                  <Select value={projectId} onValueChange={setProjectId}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {projects.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Expense Category *</Label>
                  <Select value={category} onValueChange={(v) => setCategory(v as ExpenseCategory)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Paid To (Vendor / Payee) *</Label>
                  <Input
                    value={vendorName}
                    onChange={(e) => setVendorName(e.target.value)}
                    placeholder="Supplier or contractor name"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Bill / Voucher Number</Label>
                  <Input
                    value={billNumber}
                    onChange={(e) => setBillNumber(e.target.value)}
                    placeholder="e.g. INV-9941"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Amount (₹) *</Label>
                  <Input
                    type="number"
                    min={1}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="font-mono tabular-nums"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Date *</Label>
                  <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Payment Method *</Label>
                  <Select value={paymentMode} onValueChange={(v) => setPaymentMode(v as PaymentMode)}>
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
                  <Label>Approval Status</Label>
                  <Select
                    value={approvalStatus}
                    onValueChange={(v) => setApprovalStatus(v as ExpenseApprovalStatus)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Pending Approval">Pending Approval</SelectItem>
                      <SelectItem value="Approved">Approved</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Description *</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Material quantities, work stage, or payout details"
                />
              </div>

              <div className="rounded-md border border-dashed border-[#CBD5E1] bg-[#F8FAFC] p-3.5 space-y-2">
                <Label className="flex items-center gap-1.5">
                  <Paperclip className="h-3.5 w-3.5 text-[#64748B]" />
                  Receipt Attachment Placeholder (Mock Reference)
                </Label>
                <Input
                  value={attachmentName}
                  onChange={(e) => setAttachmentName(e.target.value)}
                  placeholder="e.g. Cement_Challan_24Nov.pdf (stored locally as metadata)"
                  className="bg-white text-xs"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Record Expense</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Reversal Placeholder Dialog */}
      <Dialog
        open={Boolean(reversalExpense)}
        onOpenChange={(o) => !o && setReversalExpense(undefined)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-[#B45309]" />
              Expense Adjustment Placeholder
            </DialogTitle>
            <DialogDescription>
              Approved vouchers cannot be permanently deleted from the accounting ledger.
            </DialogDescription>
          </DialogHeader>
          <div className="px-6 py-4 text-xs leading-relaxed text-[#334155]">
            Voucher <span className="font-mono font-semibold">{reversalExpense?.billNumber}</span> (
            {formatINR(reversalExpense?.amount ?? 0)}) will support audited reversal / adjustment
            entries once connected to the backend finance API.
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReversalExpense(undefined)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
