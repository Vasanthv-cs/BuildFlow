import React, { useEffect, useMemo, useState } from 'react';
import { Paperclip, Plus, Trash2 } from 'lucide-react';
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
import type { MaterialCatalogueItem, Project, PurchaseOrder, Supplier } from '@/src/types';

interface CreatePurchaseOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  suppliers: Supplier[];
  projects: Project[];
  catalogueMaterials: MaterialCatalogueItem[];
  onCreate: (payload: {
    supplierId: string;
    projectId: string;
    expectedDeliveryDate: string;
    items: Array<{
      materialId: string;
      materialName: string;
      unit: string;
      orderedQuantity: number;
      unitPrice: number;
    }>;
    supplierBillAttachment?: string;
    notes?: string;
  }) => void;
}

export function CreatePurchaseOrderDialog({
  open,
  onOpenChange,
  suppliers,
  projects,
  catalogueMaterials,
  onCreate,
}: CreatePurchaseOrderDialogProps) {
  const [supplierId, setSupplierId] = useState(suppliers[0]?.id ?? '');
  const [projectId, setProjectId] = useState(projects[0]?.id ?? '');
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState('2026-11-29');
  const [billAttachment, setBillAttachment] = useState('');
  const [notes, setNotes] = useState('');
  const [rows, setRows] = useState<Array<{ materialId: string; quantity: number; unitPrice: number }>>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setError('');
    const firstMat = catalogueMaterials[0];
    setSupplierId(suppliers[0]?.id ?? '');
    setProjectId(projects[0]?.id ?? '');
    setExpectedDeliveryDate('2026-11-29');
    setBillAttachment('');
    setNotes('');
    setRows(
      firstMat
        ? [{ materialId: firstMat.id, quantity: 50, unitPrice: firstMat.standardUnitCost }]
        : [],
    );
  }, [open, suppliers, projects, catalogueMaterials]);

  const total = useMemo(
    () => rows.reduce((s, r) => s + Math.round((Number(r.quantity) || 0) * (Number(r.unitPrice) || 0)), 0),
    [rows],
  );

  const handleMaterialChange = (idx: number, matId: string) => {
    const mat = catalogueMaterials.find((m) => m.id === matId);
    setRows((prev) =>
      prev.map((r, i) =>
        i === idx ? { ...r, materialId: matId, unitPrice: mat?.standardUnitCost ?? r.unitPrice } : r,
      ),
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierId || !projectId || rows.length === 0) {
      setError('Select a supplier, project, and at least one material line item.');
      return;
    }
    if (rows.some((r) => !r.materialId || r.quantity <= 0 || r.unitPrice <= 0)) {
      setError('Each material row must have a positive quantity and unit price.');
      return;
    }

    onCreate({
      supplierId,
      projectId,
      expectedDeliveryDate,
      items: rows.map((r) => {
        const mat = catalogueMaterials.find((m) => m.id === r.materialId)!;
        return {
          materialId: mat.id,
          materialName: mat.name,
          unit: mat.unit,
          orderedQuantity: Number(r.quantity),
          unitPrice: Number(r.unitPrice),
        };
      }),
      supplierBillAttachment: billAttachment.trim() || undefined,
      notes: notes.trim() || undefined,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Create Purchase Order</DialogTitle>
          <DialogDescription>
            Issue a supplier material order with expected delivery tracking and bill reference.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col overflow-hidden">
          <div className="overflow-y-auto px-6 py-5 space-y-5">
            {error && (
              <div className="rounded-md border border-[#FECACA] bg-[#FEF2F2] px-3 py-2 text-xs text-[#B91C1C]">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label>Supplier *</Label>
                <Select value={supplierId} onValueChange={setSupplierId}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
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
                <Label>Expected Delivery *</Label>
                <Input
                  type="date"
                  value={expectedDeliveryDate}
                  onChange={(e) => setExpectedDeliveryDate(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-3 border-t border-[#E2E8F0] pt-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-[#0F172A]">Order Items</h4>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const mat = catalogueMaterials[0];
                    if (mat) {
                      setRows((prev) => [
                        ...prev,
                        { materialId: mat.id, quantity: 10, unitPrice: mat.standardUnitCost },
                      ]);
                    }
                  }}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Material
                </Button>
              </div>

              {rows.map((row, idx) => {
                const mat = catalogueMaterials.find((m) => m.id === row.materialId);
                return (
                  <div
                    key={idx}
                    className="grid grid-cols-12 gap-2.5 items-end rounded-md border border-[#E2E8F0] bg-[#F8FAFC] p-3"
                  >
                    <div className="col-span-12 sm:col-span-5 space-y-1">
                      <Label>Material</Label>
                      <Select
                        value={row.materialId}
                        onValueChange={(v) => handleMaterialChange(idx, v)}
                      >
                        <SelectTrigger className="bg-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {catalogueMaterials.map((m) => (
                            <SelectItem key={m.id} value={m.id}>
                              {m.name} ({m.unit})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-4 sm:col-span-2 space-y-1">
                      <Label>Qty ({mat?.unit ?? ''})</Label>
                      <Input
                        type="number"
                        step="any"
                        min={0.1}
                        value={row.quantity}
                        onChange={(e) =>
                          setRows((prev) =>
                            prev.map((r, i) =>
                              i === idx ? { ...r, quantity: Number(e.target.value) } : r,
                            ),
                          )
                        }
                        className="bg-white tabular-nums"
                      />
                    </div>
                    <div className="col-span-4 sm:col-span-2 space-y-1">
                      <Label>Unit Price (₹)</Label>
                      <Input
                        type="number"
                        min={1}
                        value={row.unitPrice}
                        onChange={(e) =>
                          setRows((prev) =>
                            prev.map((r, i) =>
                              i === idx ? { ...r, unitPrice: Number(e.target.value) } : r,
                            ),
                          )
                        }
                        className="bg-white font-mono tabular-nums"
                      />
                    </div>
                    <div className="col-span-3 sm:col-span-2 text-right font-mono text-xs font-semibold text-[#0F172A] pb-2 tabular-nums">
                      {formatINR(Math.round(row.quantity * row.unitPrice))}
                    </div>
                    <div className="col-span-1 flex justify-end pb-0.5">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        disabled={rows.length <= 1}
                        onClick={() => setRows((prev) => prev.filter((_, i) => i !== idx))}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-[#64748B]" />
                      </Button>
                    </div>
                  </div>
                );
              })}

              <div className="flex justify-end border-t border-[#F1F5F9] pt-3">
                <div className="text-right">
                  <p className="text-xs text-[#64748B]">Purchase Order Total</p>
                  <p className="font-mono text-lg font-bold text-[#0F172A] tabular-nums">
                    {formatINR(total)}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 border-t border-[#E2E8F0] pt-4">
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5">
                  <Paperclip className="h-3.5 w-3.5 text-[#64748B]" />
                  Supplier Bill Attachment Placeholder
                </Label>
                <Input
                  value={billAttachment}
                  onChange={(e) => setBillAttachment(e.target.value)}
                  placeholder="e.g. Supplier_Proforma_Nov24.pdf"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Delivery Instructions</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Unloading time window, gate instructions..."
                  className="min-h-[38px]"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">Issue Purchase Order</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface ReceiveDeliveryDialogProps {
  po?: PurchaseOrder;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (
    poId: string,
    receivedByItemId: Record<string, number>,
    deliveryDate: string,
    notes?: string,
  ) => void;
}

export function ReceiveDeliveryDialog({
  po,
  open,
  onOpenChange,
  onConfirm,
}: ReceiveDeliveryDialogProps) {
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [deliveryDate, setDeliveryDate] = useState('2026-11-24');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!po || !open) return;
    const init: Record<string, number> = {};
    for (const item of po.items) {
      init[item.id] = Math.max(0, Math.round((item.orderedQuantity - item.receivedQuantity) * 100) / 100);
    }
    setQuantities(init);
    setDeliveryDate('2026-11-24');
    setNotes('');
  }, [po, open]);

  if (!po) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm(po.id, quantities, deliveryDate, notes.trim() || undefined);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Record Delivery — {po.poNumber}</DialogTitle>
          <DialogDescription>
            Receive full or partial quantities from {po.supplierName}. Accepted quantities are
            automatically posted to the inventory stock ledger.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col overflow-hidden">
          <div className="px-6 py-5 space-y-4">
            <div className="space-y-2.5">
              {po.items.map((item) => {
                const remaining = Math.max(
                  0,
                  Math.round((item.orderedQuantity - item.receivedQuantity) * 100) / 100,
                );
                return (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-4 rounded-md border border-[#E2E8F0] p-3"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[#0F172A] truncate">
                        {item.materialName}
                      </p>
                      <p className="text-xs text-[#64748B] tabular-nums">
                        Ordered: {item.orderedQuantity} · Already received: {item.receivedQuantity}{' '}
                        · Remaining: {remaining} {item.unit}
                      </p>
                    </div>
                    <Input
                      type="number"
                      step="any"
                      min={0}
                      max={remaining}
                      value={quantities[item.id] ?? 0}
                      onChange={(e) =>
                        setQuantities((prev) => ({
                          ...prev,
                          [item.id]: Number(e.target.value),
                        }))
                      }
                      className="w-28 font-mono tabular-nums shrink-0"
                    />
                  </div>
                );
              })}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Delivery Date</Label>
                <Input
                  type="date"
                  value={deliveryDate}
                  onChange={(e) => setDeliveryDate(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Challan / Unloading Notes</Label>
                <Input
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Challan # or quality check remarks"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">Post Receipt to Inventory</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
