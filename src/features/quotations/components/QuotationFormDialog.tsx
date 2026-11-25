import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/src/components/ui/dialog';
import { Button } from '@/src/components/ui/button';
import { Input, Label, Textarea } from '@/src/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/src/components/ui/select';
import { formatINR } from '@/src/lib/utils';
import type {
  ProjectQuotation,
  ProjectType,
  QuotationItem,
  QuotationMilestone,
  QuotationStatus,
} from '@/src/types';

interface QuotationFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialQuotation?: ProjectQuotation;
  onSave: (
    payload: Omit<ProjectQuotation, 'id' | 'quotationNumber'>,
    revisionSummary?: string,
  ) => void;
}

const PROJECT_TYPES: ProjectType[] = [
  'Independent House',
  'Duplex Villa',
  'G+2 Residence',
  'Renovation & Extension',
  'Farmhouse Residence',
];

const QUOTATION_STATUSES: QuotationStatus[] = ['Draft', 'Sent', 'Approved', 'Revised'];

export function QuotationFormDialog({
  open,
  onOpenChange,
  initialQuotation,
  onSave,
}: QuotationFormDialogProps) {
  const [title, setTitle] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('+91 ');
  const [siteAddress, setSiteAddress] = useState('');
  const [projectType, setProjectType] = useState<ProjectType>('Independent House');
  const [builtUpAreaSqFt, setBuiltUpAreaSqFt] = useState('2400');
  const [floors, setFloors] = useState('2');
  const [validUntil, setValidUntil] = useState('2026-12-31');
  const [status, setStatus] = useState<QuotationStatus>('Draft');
  const [discountType, setDiscountType] = useState<'amount' | 'percent'>('amount');
  const [discountValue, setDiscountValue] = useState('0');
  const [taxPercent, setTaxPercent] = useState('18');
  const [items, setItems] = useState<QuotationItem[]>([]);
  const [includedText, setIncludedText] = useState('');
  const [excludedText, setExcludedText] = useState('');
  const [milestones, setMilestones] = useState<Array<{ id: string; stage: string; percentage: number }>>([]);
  const [notes, setNotes] = useState('');
  const [revisionSummary, setRevisionSummary] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setError('');
    if (initialQuotation) {
      setTitle(initialQuotation.title ?? '');
      setCustomerName(initialQuotation.customerName ?? '');
      setCustomerPhone(initialQuotation.customerPhone ?? '+91 ');
      setSiteAddress(initialQuotation.siteAddress ?? '');
      setProjectType(initialQuotation.projectType ?? 'Independent House');
      setBuiltUpAreaSqFt(String(initialQuotation.builtUpAreaSqFt ?? 2400));
      setFloors(String(initialQuotation.floors ?? 2));
      setValidUntil(initialQuotation.validUntil);
      setStatus(initialQuotation.status === 'Converted' ? 'Approved' : initialQuotation.status);
      setDiscountType(initialQuotation.discountType ?? 'amount');
      setDiscountValue(String(initialQuotation.discountValue ?? 0));
      setTaxPercent(String(initialQuotation.taxPercent ?? 18));
      setItems(initialQuotation.items.map((it) => ({ ...it })));
      setIncludedText((initialQuotation.includedWork ?? []).join('\n'));
      setExcludedText((initialQuotation.excludedWork ?? []).join('\n'));
      setMilestones(
        (initialQuotation.paymentMilestones ?? []).map((m) => ({
          id: m.id,
          stage: m.stage,
          percentage: m.percentage,
        })),
      );
      setNotes(initialQuotation.notes ?? '');
      setRevisionSummary('Updated scope and commercial pricing');
    } else {
      setTitle('');
      setCustomerName('');
      setCustomerPhone('+91 ');
      setSiteAddress('');
      setProjectType('Independent House');
      setBuiltUpAreaSqFt('2400');
      setFloors('2');
      setValidUntil('2026-12-31');
      setStatus('Draft');
      setDiscountType('amount');
      setDiscountValue('0');
      setTaxPercent('18');
      setItems([
        {
          id: 'item-1',
          workPackage: 'Substructure & RCC Structural Frame',
          specification: 'M25 concrete, JSW Fe550D steel, isolated footings & slabs',
          quantity: 2400,
          unit: 'sq.ft',
          rate: 1050,
          amount: 2520000,
        },
        {
          id: 'item-2',
          workPackage: 'Masonry, Plastering & Finishing Package',
          specification: 'AAC blocks, double-coat plaster, vitrified flooring, MEP & paint',
          quantity: 2400,
          unit: 'sq.ft',
          rate: 950,
          amount: 2280000,
        },
      ]);
      setIncludedText(
        'Civil structure with UltraTech OPC 53 & Fe550D steel\nConcealed Finolex wiring & Astral CPVC plumbing\nTerrace & bathroom waterproofing',
      );
      setExcludedText(
        'Municipal plan sanction & utility connection deposits\nModular kitchen & interior wardrobes',
      );
      setMilestones([
        { id: 'm-1', stage: 'Booking & Mobilization Advance', percentage: 15 },
        { id: 'm-2', stage: 'Plinth & Ground Roof Slab', percentage: 30 },
        { id: 'm-3', stage: 'Superstructure, Masonry & Plaster', percentage: 30 },
        { id: 'm-4', stage: 'Flooring, Painting & Handover', percentage: 25 },
      ]);
      setNotes('');
      setRevisionSummary('');
    }
  }, [open, initialQuotation]);

  const financials = useMemo(() => {
    const subtotal = items.reduce((sum, it) => sum + Math.round(it.quantity * it.rate), 0);
    const dVal = Math.max(0, Number(discountValue) || 0);
    const discountAmount =
      discountType === 'percent' ? Math.round((subtotal * Math.min(100, dVal)) / 100) : Math.min(subtotal, dVal);
    const taxableBase = Math.max(0, subtotal - discountAmount);
    const tPct = Math.max(0, Number(taxPercent) || 0);
    const taxAmount = Math.round((taxableBase * tPct) / 100);
    const totalAmount = taxableBase + taxAmount;
    return { subtotal, discountAmount, taxableBase, taxAmount, totalAmount };
  }, [items, discountType, discountValue, taxPercent]);

  const updateItem = (idx: number, field: keyof QuotationItem, val: string | number) => {
    setItems((prev) =>
      prev.map((it, i) => {
        if (i !== idx) return it;
        const next = { ...it, [field]: val };
        const qty = Number(next.quantity) || 0;
        const rate = Number(next.rate) || 0;
        next.amount = Math.round(qty * rate);
        return next;
      }),
    );
  };

  const addItem = () => {
    setItems((prev) => [
      ...prev,
      {
        id: `item-${Date.now()}`,
        workPackage: '',
        specification: '',
        quantity: 1,
        unit: 'sq.ft',
        rate: 0,
        amount: 0,
      },
    ]);
  };

  const removeItem = (idx: number) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const addMilestone = () => {
    setMilestones((prev) => [
      ...prev,
      { id: `m-${Date.now()}`, stage: '', percentage: 0 },
    ]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !customerName.trim()) {
      setError('Quotation title and customer name are required.');
      return;
    }
    if (items.some((it) => !it.workPackage.trim() || it.quantity <= 0 || it.rate <= 0)) {
      setError('Every line item requires a description, positive quantity, and positive rate.');
      return;
    }
    const milestoneSum = milestones.reduce((s, m) => s + (Number(m.percentage) || 0), 0);
    if (milestones.length > 0 && milestoneSum !== 100) {
      setError(`Payment milestone percentages must total 100% (currently ${milestoneSum}%).`);
      return;
    }

    const computedMilestones: QuotationMilestone[] = milestones
      .filter((m) => m.stage.trim())
      .map((m) => ({
        id: m.id,
        stage: m.stage.trim(),
        percentage: Number(m.percentage),
        amount: Math.round((financials.totalAmount * Number(m.percentage)) / 100),
      }));

    onSave(
      {
        projectId: initialQuotation?.projectId ?? '',
        title: title.trim(),
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        siteAddress: siteAddress.trim(),
        projectType,
        builtUpAreaSqFt: Number(builtUpAreaSqFt) || 2000,
        floors: Number(floors) || 2,
        version: initialQuotation?.version ?? 'Rev 1',
        issuedDate: initialQuotation?.issuedDate ?? '2026-11-24',
        validUntil,
        status,
        subtotal: financials.subtotal,
        discountType,
        discountValue: Number(discountValue) || 0,
        taxPercent: Number(taxPercent) || 0,
        taxAmount: financials.taxAmount,
        totalAmount: financials.totalAmount,
        items: items.map((it) => ({
          ...it,
          quantity: Number(it.quantity),
          rate: Number(it.rate),
          amount: Math.round(Number(it.quantity) * Number(it.rate)),
        })),
        includedWork: includedText
          .split('\n')
          .map((s) => s.trim())
          .filter(Boolean),
        excludedWork: excludedText
          .split('\n')
          .map((s) => s.trim())
          .filter(Boolean),
        paymentMilestones: computedMilestones,
        notes: notes.trim(),
      },
      initialQuotation ? revisionSummary.trim() || 'Revised quotation items' : undefined,
    );

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>
            {initialQuotation
              ? `Edit Quotation — ${initialQuotation.quotationNumber}`
              : 'Create New Construction Quotation'}
          </DialogTitle>
          <DialogDescription>
            Build an itemized BOQ estimate with discount, GST, scope inclusions/exclusions, and
            payment milestones.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col overflow-hidden">
          <div className="overflow-y-auto px-6 py-5 space-y-6">
            {error && (
              <div className="rounded-md border border-[#FECACA] bg-[#FEF2F2] px-3.5 py-2.5 text-xs font-medium text-[#B91C1C]">
                {error}
              </div>
            )}

            {/* Client & Project Info */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="sm:col-span-2 space-y-1.5">
                <Label>Quotation Title *</Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Sharma G+1 Turnkey Residence"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={status} onValueChange={(v) => setStatus(v as QuotationStatus)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {QUOTATION_STATUSES.map((st) => (
                      <SelectItem key={st} value={st}>
                        {st}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Customer Name *</Label>
                <Input
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Client full name"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Customer Phone</Label>
                <Input
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Valid Until *</Label>
                <Input
                  type="date"
                  value={validUntil}
                  onChange={(e) => setValidUntil(e.target.value)}
                />
              </div>
              <div className="sm:col-span-2 space-y-1.5">
                <Label>Site Address</Label>
                <Input
                  value={siteAddress}
                  onChange={(e) => setSiteAddress(e.target.value)}
                  placeholder="Plot, layout, city"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Project Type</Label>
                <Select
                  value={projectType}
                  onValueChange={(v) => setProjectType(v as ProjectType)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PROJECT_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Built-up Area (sq.ft)</Label>
                <Input
                  type="number"
                  value={builtUpAreaSqFt}
                  onChange={(e) => setBuiltUpAreaSqFt(e.target.value)}
                  className="tabular-nums"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Floors</Label>
                <Input
                  type="number"
                  min={1}
                  max={6}
                  value={floors}
                  onChange={(e) => setFloors(e.target.value)}
                  className="tabular-nums"
                />
              </div>
            </div>

            {/* Line Items */}
            <div className="border-t border-[#E2E8F0] pt-5">
              <div className="mb-3 flex items-center justify-between">
                <h4 className="text-sm font-semibold text-[#0F172A]">Quotation Line Items</h4>
                <Button type="button" variant="outline" size="sm" onClick={addItem}>
                  <Plus className="h-3.5 w-3.5" />
                  Add Item
                </Button>
              </div>

              <div className="space-y-3">
                {items.map((item, idx) => (
                  <div
                    key={item.id}
                    className="grid grid-cols-12 gap-2.5 rounded-md border border-[#E2E8F0] bg-[#F8FAFC] p-3 items-end"
                  >
                    <div className="col-span-12 sm:col-span-4 space-y-1">
                      <Label>Item Description</Label>
                      <Input
                        value={item.workPackage}
                        onChange={(e) => updateItem(idx, 'workPackage', e.target.value)}
                        placeholder="Work package title"
                        className="bg-white"
                      />
                    </div>
                    <div className="col-span-4 sm:col-span-2 space-y-1">
                      <Label>Qty</Label>
                      <Input
                        type="number"
                        min={0}
                        step="any"
                        value={item.quantity}
                        onChange={(e) => updateItem(idx, 'quantity', Number(e.target.value))}
                        className="bg-white tabular-nums"
                      />
                    </div>
                    <div className="col-span-4 sm:col-span-1 space-y-1">
                      <Label>Unit</Label>
                      <Input
                        value={item.unit}
                        onChange={(e) => updateItem(idx, 'unit', e.target.value)}
                        className="bg-white"
                      />
                    </div>
                    <div className="col-span-4 sm:col-span-2 space-y-1">
                      <Label>Rate (₹)</Label>
                      <Input
                        type="number"
                        min={0}
                        step="any"
                        value={item.rate}
                        onChange={(e) => updateItem(idx, 'rate', Number(e.target.value))}
                        className="bg-white font-mono tabular-nums"
                      />
                    </div>
                    <div className="col-span-10 sm:col-span-2 space-y-1">
                      <Label>Amount</Label>
                      <div className="flex h-9 items-center justify-end rounded-md border border-[#E2E8F0] bg-white px-2.5 font-mono text-xs font-semibold text-[#0F172A] tabular-nums">
                        {formatINR(item.amount)}
                      </div>
                    </div>
                    <div className="col-span-2 sm:col-span-1 flex justify-end">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        disabled={items.length <= 1}
                        onClick={() => removeItem(idx)}
                        aria-label="Remove item"
                      >
                        <Trash2 className="h-4 w-4 text-[#64748B]" />
                      </Button>
                    </div>
                    <div className="col-span-12 space-y-1">
                      <Input
                        value={item.specification}
                        onChange={(e) => updateItem(idx, 'specification', e.target.value)}
                        placeholder="Material brands & technical specification (optional)"
                        className="bg-white text-xs h-8"
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Totals Calculator */}
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-12">
                <div className="sm:col-span-7 grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="space-y-1.5">
                    <Label>Discount Type</Label>
                    <Select
                      value={discountType}
                      onValueChange={(v) => setDiscountType(v as 'amount' | 'percent')}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="amount">Flat (₹)</SelectItem>
                        <SelectItem value="percent">Percent (%)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Discount Value</Label>
                    <Input
                      type="number"
                      min={0}
                      value={discountValue}
                      onChange={(e) => setDiscountValue(e.target.value)}
                      className="font-mono tabular-nums"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Applicable GST (%)</Label>
                    <Input
                      type="number"
                      min={0}
                      max={28}
                      value={taxPercent}
                      onChange={(e) => setTaxPercent(e.target.value)}
                      className="font-mono tabular-nums"
                    />
                  </div>
                </div>

                <div className="sm:col-span-5 rounded-md border border-[#E2E8F0] bg-[#F8FAFC] p-4 space-y-1.5 text-xs">
                  <div className="flex justify-between text-[#475569]">
                    <span>Subtotal</span>
                    <span className="font-mono tabular-nums">{formatINR(financials.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-[#475569]">
                    <span>Discount</span>
                    <span className="font-mono text-[#15803D] tabular-nums">
                      -{formatINR(financials.discountAmount)}
                    </span>
                  </div>
                  <div className="flex justify-between text-[#475569]">
                    <span>GST ({taxPercent || 0}%)</span>
                    <span className="font-mono tabular-nums">{formatINR(financials.taxAmount)}</span>
                  </div>
                  <div className="flex justify-between border-t border-[#E2E8F0] pt-2 text-sm font-semibold text-[#0F172A]">
                    <span>Final Quotation Total</span>
                    <span className="font-mono tabular-nums">{formatINR(financials.totalAmount)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Scope Inclusions & Exclusions */}
            <div className="border-t border-[#E2E8F0] pt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Included Work (one item per line)</Label>
                <Textarea
                  value={includedText}
                  onChange={(e) => setIncludedText(e.target.value)}
                  rows={4}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Excluded Work (one item per line)</Label>
                <Textarea
                  value={excludedText}
                  onChange={(e) => setExcludedText(e.target.value)}
                  rows={4}
                />
              </div>
            </div>

            {/* Payment Milestones */}
            <div className="border-t border-[#E2E8F0] pt-5">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-semibold text-[#0F172A]">Payment Milestones</h4>
                  <p className="text-xs text-[#64748B]">
                    Total must equal 100% (Current:{' '}
                    <span className="font-mono font-semibold text-[#0F172A]">
                      {milestones.reduce((s, m) => s + (Number(m.percentage) || 0), 0)}%
                    </span>
                    )
                  </p>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={addMilestone}>
                  <Plus className="h-3.5 w-3.5" />
                  Add Milestone
                </Button>
              </div>
              <div className="space-y-2">
                {milestones.map((m, idx) => (
                  <div key={m.id} className="grid grid-cols-12 gap-2 items-center">
                    <Input
                      className="col-span-7"
                      placeholder="Milestone stage name"
                      value={m.stage}
                      onChange={(e) =>
                        setMilestones((prev) =>
                          prev.map((row, i) => (i === idx ? { ...row, stage: e.target.value } : row)),
                        )
                      }
                    />
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      className="col-span-2 font-mono tabular-nums"
                      value={m.percentage}
                      onChange={(e) =>
                        setMilestones((prev) =>
                          prev.map((row, i) =>
                            i === idx ? { ...row, percentage: Number(e.target.value) } : row,
                          ),
                        )
                      }
                    />
                    <div className="col-span-2 text-right font-mono text-xs text-[#475569] tabular-nums">
                      {formatINR(Math.round((financials.totalAmount * (m.percentage || 0)) / 100))}
                    </div>
                    <div className="col-span-1 flex justify-end">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => setMilestones((prev) => prev.filter((_, i) => i !== idx))}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-[#64748B]" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {initialQuotation && (
              <div className="border-t border-[#E2E8F0] pt-4 space-y-1.5">
                <Label>Revision Note (saved in version history)</Label>
                <Input
                  value={revisionSummary}
                  onChange={(e) => setRevisionSummary(e.target.value)}
                  placeholder="Describe what changed in this revision"
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">
              {initialQuotation ? 'Save Revision' : 'Create Quotation'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
