import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeftRight,
  CalendarClock,
  PackageCheck,
  Plus,
} from 'lucide-react';
import { PageContainer, PageHeader } from '@/src/components/layout/PageContainer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';
import { Badge, getPaymentStatusVariant } from '@/src/components/ui/badge';
import { Input, Label, Textarea } from '@/src/components/ui/input';
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
import {
  CreatePurchaseOrderDialog,
  ReceiveDeliveryDialog,
} from './components/PurchaseOrderDialogs';
import type { MaterialCategory, PurchaseOrder, StockMovementType } from '@/src/types';

const MOVEMENT_TYPES: StockMovementType[] = [
  'Purchase Receipt',
  'Material Issue to Project',
  'Material Return',
  'Stock Adjustment',
  'Transfer Between Projects',
  'Damaged or Wasted',
];

const MATERIAL_CATEGORIES: MaterialCategory[] = [
  'Cement',
  'Steel & TMT',
  'Aggregates & Sand',
  'Bricks & Blocks',
  'Plumbing & Sanitary',
  'Electrical',
  'Flooring & Paint',
];

export function MaterialsPage() {
  const {
    projects,
    suppliers,
    catalogueMaterials,
    computedCatalogueStock,
    stockMovements,
    purchaseOrders,
    addCatalogueMaterial,
    recordStockMovement,
    createPurchaseOrder,
    recordPurchaseOrderDelivery,
  } = useBuildFlow();

  const [movementOpen, setMovementOpen] = useState(false);
  const [addMatOpen, setAddMatOpen] = useState(false);
  const [createPoOpen, setCreatePoOpen] = useState(false);
  const [receivingPo, setReceivingPo] = useState<PurchaseOrder | undefined>();

  // Movement form state
  const [mvMaterialId, setMvMaterialId] = useState(catalogueMaterials[0]?.id ?? '');
  const [mvType, setMvType] = useState<StockMovementType>('Material Issue to Project');
  const [mvQty, setMvQty] = useState('');
  const [mvUnitCost, setMvUnitCost] = useState('');
  const [mvDate, setMvDate] = useState('2026-11-24');
  const [mvProjectId, setMvProjectId] = useState(projects[0]?.id ?? '');
  const [mvTargetProjectId, setMvTargetProjectId] = useState(projects[1]?.id ?? '');
  const [mvNotes, setMvNotes] = useState('');

  // Add catalogue material form state
  const [matName, setMatName] = useState('');
  const [matCategory, setMatCategory] = useState<MaterialCategory>('Cement');
  const [matUnit, setMatUnit] = useState('Bags (50kg)');
  const [matSupplierId, setMatSupplierId] = useState(suppliers[0]?.id ?? '');
  const [matMinStock, setMatMinStock] = useState('50');
  const [matReorder, setMatReorder] = useState('100');
  const [matCost, setMatCost] = useState('400');

  const lowStockItems = useMemo(
    () => computedCatalogueStock.filter((item) => item.isLowStock),
    [computedCatalogueStock],
  );

  const expectedDeliveries = useMemo(
    () =>
      purchaseOrders
        .filter((po) => po.status === 'Ordered' || po.status === 'Partially Delivered')
        .sort((a, b) => (a.expectedDeliveryDate > b.expectedDeliveryDate ? 1 : -1)),
    [purchaseOrders],
  );

  const getSupplierName = (id: string) => suppliers.find((s) => s.id === id)?.name ?? '—';
  const getProjectName = (id?: string) => projects.find((p) => p.id === id)?.name ?? 'Central Yard';
  const getMaterialName = (id: string) =>
    catalogueMaterials.find((m) => m.id === id)?.name ?? 'Material';

  const handleMovementSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const mat = catalogueMaterials.find((m) => m.id === mvMaterialId);
    const qty = Number(mvQty);
    if (!mat || !Number.isFinite(qty) || qty === 0) return;

    recordStockMovement({
      materialId: mat.id,
      movementType: mvType,
      quantity: mvType === 'Stock Adjustment' ? qty : Math.abs(qty),
      unit: mat.unit,
      unitCost: mvType === 'Purchase Receipt' ? Number(mvUnitCost) || mat.standardUnitCost : undefined,
      date: mvDate,
      projectId: mvProjectId || undefined,
      targetProjectId: mvType === 'Transfer Between Projects' ? mvTargetProjectId : undefined,
      notes: mvNotes.trim() || `${mvType} recorded`,
      recordedBy: 'Site Storekeeper',
    });

    setMovementOpen(false);
    setMvQty('');
    setMvNotes('');
  };

  const handleAddMaterial = (e: React.FormEvent) => {
    e.preventDefault();
    if (!matName.trim()) return;
    addCatalogueMaterial({
      name: matName.trim(),
      category: matCategory,
      unit: matUnit.trim() || 'Units',
      defaultSupplierId: matSupplierId,
      minimumStock: Number(matMinStock) || 10,
      reorderPoint: Number(matReorder) || 25,
      standardUnitCost: Number(matCost) || 100,
    });
    setAddMatOpen(false);
    setMatName('');
  };

  return (
    <PageContainer>
      <PageHeader
        title="Materials & Inventory"
        description="Ledger-calculated construction inventory, stock movements across sites, and supplier purchase orders."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setAddMatOpen(true)}>
              <Plus className="h-4 w-4" />
              Add Material
            </Button>
            <Button variant="outline" size="sm" onClick={() => setMovementOpen(true)}>
              <ArrowLeftRight className="h-4 w-4" />
              Stock Movement
            </Button>
            <Button size="sm" onClick={() => setCreatePoOpen(true)}>
              <Plus className="h-4 w-4" />
              New Purchase Order
            </Button>
          </div>
        }
      />

      {/* Low Stock Alerts & Expected Deliveries Widgets */}
      <div className="mb-6 grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3 border-b border-[#F1F5F9] flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-[#B45309]" />
                Low-Stock Alerts
              </CardTitle>
              <CardDescription>Materials at or below reorder point</CardDescription>
            </div>
            <Badge variant={lowStockItems.length > 0 ? 'warning' : 'success'}>
              {lowStockItems.length} Alerts
            </Badge>
          </CardHeader>
          <CardContent className="p-0">
            {lowStockItems.length === 0 ? (
              <p className="px-5 py-6 text-xs text-[#64748B]">All catalogue materials are above reorder levels.</p>
            ) : (
              <ul className="divide-y divide-[#F1F5F9] max-h-[210px] overflow-y-auto">
                {lowStockItems.map(({ material, currentStock, isBelowMinimum }) => (
                  <li key={material.id} className="flex items-center justify-between gap-3 px-5 py-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[#0F172A] truncate">{material.name}</p>
                      <p className="text-xs text-[#64748B]">
                        Reorder at {material.reorderPoint} {material.unit} · {getSupplierName(material.defaultSupplierId)}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={`font-mono text-sm font-semibold tabular-nums ${isBelowMinimum ? 'text-[#B91C1C]' : 'text-[#B45309]'}`}>
                        {currentStock} {material.unit}
                      </p>
                      <span className="text-[11px] text-[#64748B]">
                        {isBelowMinimum ? 'Below min' : 'Reorder'}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3 border-b border-[#F1F5F9] flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CalendarClock className="h-4 w-4 text-[#A65229]" />
                Expected Deliveries
              </CardTitle>
              <CardDescription>Open purchase orders scheduled for site arrival</CardDescription>
            </div>
            <Badge variant="info">{expectedDeliveries.length} Open POs</Badge>
          </CardHeader>
          <CardContent className="p-0">
            {expectedDeliveries.length === 0 ? (
              <p className="px-5 py-6 text-xs text-[#64748B]">No pending purchase order deliveries.</p>
            ) : (
              <ul className="divide-y divide-[#F1F5F9] max-h-[210px] overflow-y-auto">
                {expectedDeliveries.map((po) => (
                  <li key={po.id} className="flex items-center justify-between gap-3 px-5 py-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[#0F172A] truncate">
                        {po.poNumber} · {po.supplierName}
                      </p>
                      <p className="text-xs text-[#64748B] truncate">
                        {getProjectName(po.projectId)} · Expected {formatIndianDate(po.expectedDeliveryDate)}
                      </p>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => setReceivingPo(po)}>
                      <PackageCheck className="h-3.5 w-3.5" />
                      Receive
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Main Materials Workspace Tabs */}
      <Tabs defaultValue="catalogue">
        <TabsList>
          <TabsTrigger value="catalogue">
            Material Catalogue ({computedCatalogueStock.length})
          </TabsTrigger>
          <TabsTrigger value="ledger">
            Inventory Movements ({stockMovements.length})
          </TabsTrigger>
          <TabsTrigger value="pos">
            Purchase Orders ({purchaseOrders.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="catalogue">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Material</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Default Supplier</TableHead>
                    <TableHead className="text-right">Current Stock</TableHead>
                    <TableHead className="text-right">Min / Reorder</TableHead>
                    <TableHead className="text-right">Avg Purchase Cost</TableHead>
                    <TableHead>Health</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {computedCatalogueStock.map(
                    ({ material, currentStock, averagePurchaseCost, isLowStock, isBelowMinimum }) => (
                      <TableRow key={material.id}>
                        <TableCell>
                          <p className="font-medium text-[#0F172A]">{material.name}</p>
                          <p className="font-mono text-[11px] text-[#64748B]">
                            {material.code} · {material.unit}
                          </p>
                        </TableCell>
                        <TableCell className="text-xs text-[#475569]">{material.category}</TableCell>
                        <TableCell className="text-xs text-[#334155]">
                          {getSupplierName(material.defaultSupplierId)}
                        </TableCell>
                        <TableCell className="text-right font-mono font-semibold text-[#0F172A] tabular-nums">
                          {currentStock} {material.unit}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs text-[#64748B] tabular-nums">
                          {material.minimumStock} / {material.reorderPoint}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs font-medium tabular-nums">
                          {formatINR(averagePurchaseCost)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={isBelowMinimum ? 'danger' : isLowStock ? 'warning' : 'success'}
                          >
                            {isBelowMinimum ? 'Critical' : isLowStock ? 'Low Stock' : 'Healthy'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ),
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ledger">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Movement Type</TableHead>
                    <TableHead>Material</TableHead>
                    <TableHead>Project / Route</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stockMovements.map((mv) => {
                    const isPositive =
                      mv.movementType === 'Purchase Receipt' ||
                      mv.movementType === 'Material Return' ||
                      (mv.movementType === 'Stock Adjustment' && mv.quantity > 0);
                    const isTransfer = mv.movementType === 'Transfer Between Projects';
                    return (
                      <TableRow key={mv.id}>
                        <TableCell className="text-xs text-[#475569] tabular-nums whitespace-nowrap">
                          {formatIndianDate(mv.date)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              isTransfer
                                ? 'info'
                                : isPositive
                                  ? 'success'
                                  : mv.movementType === 'Damaged or Wasted'
                                    ? 'danger'
                                    : 'neutral'
                            }
                          >
                            {mv.movementType}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium text-[#0F172A]">
                          {getMaterialName(mv.materialId)}
                        </TableCell>
                        <TableCell className="text-xs text-[#475569]">
                          {isTransfer
                            ? `${getProjectName(mv.projectId)} → ${getProjectName(mv.targetProjectId)}`
                            : getProjectName(mv.projectId)}
                        </TableCell>
                        <TableCell
                          className={`text-right font-mono font-semibold tabular-nums whitespace-nowrap ${
                            isTransfer
                              ? 'text-[#A65229]'
                              : isPositive
                                ? 'text-[#15803D]'
                                : 'text-[#0F172A]'
                          }`}
                        >
                          {isTransfer ? '' : isPositive ? '+' : '-'}
                          {Math.abs(mv.quantity)} {mv.unit}
                        </TableCell>
                        <TableCell className="text-xs text-[#64748B] max-w-[260px] truncate">
                          {mv.notes}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pos">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>PO Number</TableHead>
                    <TableHead>Supplier & Project</TableHead>
                    <TableHead>Delivery Progress</TableHead>
                    <TableHead>Expected Date</TableHead>
                    <TableHead className="text-right">PO Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {purchaseOrders.map((po) => {
                    const totalOrdered = po.items.reduce((s, i) => s + i.orderedQuantity, 0);
                    const totalReceived = po.items.reduce((s, i) => s + i.receivedQuantity, 0);
                    const pct = totalOrdered > 0 ? Math.round((totalReceived / totalOrdered) * 100) : 0;
                    return (
                      <TableRow key={po.id}>
                        <TableCell>
                          <p className="font-mono text-xs font-semibold text-[#0F172A]">
                            {po.poNumber}
                          </p>
                          <p className="text-[11px] text-[#64748B] tabular-nums">
                            {formatIndianDate(po.orderDate)}
                          </p>
                        </TableCell>
                        <TableCell>
                          <p className="font-medium text-[#0F172A]">{po.supplierName}</p>
                          <p className="text-xs text-[#64748B]">
                            {getProjectName(po.projectId)} · {po.items.length} item(s)
                          </p>
                        </TableCell>
                        <TableCell className="text-xs text-[#475569] tabular-nums">
                          {pct}% received
                          <p className="text-[11px] text-[#64748B] truncate max-w-[200px]">
                            {po.items.map((i) => `${i.materialName} (${i.receivedQuantity}/${i.orderedQuantity})`).join(', ')}
                          </p>
                        </TableCell>
                        <TableCell className="text-xs text-[#475569] tabular-nums">
                          {formatIndianDate(po.expectedDeliveryDate)}
                        </TableCell>
                        <TableCell className="text-right font-mono font-semibold text-[#0F172A] tabular-nums">
                          {formatINR(po.totalAmount)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              po.status === 'Delivered'
                                ? 'success'
                                : po.status === 'Partially Delivered'
                                  ? 'info'
                                  : getPaymentStatusVariant(po.status)
                            }
                          >
                            {po.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {po.status !== 'Delivered' && po.status !== 'Cancelled' ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setReceivingPo(po)}
                            >
                              Record Delivery
                            </Button>
                          ) : (
                            <span className="text-xs text-[#64748B]">Complete</span>
                          )}
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

      {/* Record Stock Movement Dialog */}
      <Dialog open={movementOpen} onOpenChange={setMovementOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Record Stock Movement</DialogTitle>
            <DialogDescription>
              All inventory balances are strictly calculated from ledger movements.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleMovementSubmit} className="flex flex-col overflow-hidden">
            <div className="px-6 py-5 space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Movement Type *</Label>
                  <Select
                    value={mvType}
                    onValueChange={(v) => setMvType(v as StockMovementType)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MOVEMENT_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Date *</Label>
                  <Input type="date" value={mvDate} onChange={(e) => setMvDate(e.target.value)} />
                </div>
                <div className="sm:col-span-2 space-y-1.5">
                  <Label>Material *</Label>
                  <Select value={mvMaterialId} onValueChange={setMvMaterialId}>
                    <SelectTrigger>
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
                <div className="space-y-1.5">
                  <Label>
                    Quantity {mvType === 'Stock Adjustment' ? '(use - for reduction)' : '*'}
                  </Label>
                  <Input
                    type="number"
                    step="any"
                    value={mvQty}
                    onChange={(e) => setMvQty(e.target.value)}
                    placeholder="e.g. 50"
                    className="font-mono tabular-nums"
                  />
                </div>
                {mvType === 'Purchase Receipt' && (
                  <div className="space-y-1.5">
                    <Label>Unit Purchase Cost (₹)</Label>
                    <Input
                      type="number"
                      value={mvUnitCost}
                      onChange={(e) => setMvUnitCost(e.target.value)}
                      placeholder="Auto uses standard cost"
                      className="font-mono tabular-nums"
                    />
                  </div>
                )}
                <div className="space-y-1.5">
                  <Label>
                    {mvType === 'Transfer Between Projects' ? 'From Project' : 'Project'}
                  </Label>
                  <Select value={mvProjectId} onValueChange={setMvProjectId}>
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
                {mvType === 'Transfer Between Projects' && (
                  <div className="space-y-1.5">
                    <Label>To Project</Label>
                    <Select value={mvTargetProjectId} onValueChange={setMvTargetProjectId}>
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
                )}
              </div>
              <div className="space-y-1.5">
                <Label>Movement Notes *</Label>
                <Textarea
                  value={mvNotes}
                  onChange={(e) => setMvNotes(e.target.value)}
                  placeholder="Specify stage usage, challan reference, or wastage cause..."
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setMovementOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Post Ledger Movement</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Catalogue Material Dialog */}
      <Dialog open={addMatOpen} onOpenChange={setAddMatOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Construction Material</DialogTitle>
            <DialogDescription>
              Register a material SKU in the catalogue. Initial stock starts at 0 until a Purchase
              Receipt is posted.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddMaterial} className="flex flex-col overflow-hidden">
            <div className="px-6 py-5 space-y-4">
              <div className="space-y-1.5">
                <Label>Material Name *</Label>
                <Input
                  value={matName}
                  onChange={(e) => setMatName(e.target.value)}
                  placeholder="e.g. Birla White Wall Putty (40kg)"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Category</Label>
                  <Select
                    value={matCategory}
                    onValueChange={(v) => setMatCategory(v as MaterialCategory)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MATERIAL_CATEGORIES.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Unit of Measurement</Label>
                  <Input value={matUnit} onChange={(e) => setMatUnit(e.target.value)} />
                </div>
                <div className="col-span-2 space-y-1.5">
                  <Label>Default Supplier</Label>
                  <Select value={matSupplierId} onValueChange={setMatSupplierId}>
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
                  <Label>Minimum Stock</Label>
                  <Input
                    type="number"
                    value={matMinStock}
                    onChange={(e) => setMatMinStock(e.target.value)}
                    className="tabular-nums"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Reorder Point</Label>
                  <Input
                    type="number"
                    value={matReorder}
                    onChange={(e) => setMatReorder(e.target.value)}
                    className="tabular-nums"
                  />
                </div>
                <div className="col-span-2 space-y-1.5">
                  <Label>Standard Purchase Rate (₹)</Label>
                  <Input
                    type="number"
                    value={matCost}
                    onChange={(e) => setMatCost(e.target.value)}
                    className="font-mono tabular-nums"
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAddMatOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Add to Catalogue</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <CreatePurchaseOrderDialog
        open={createPoOpen}
        onOpenChange={setCreatePoOpen}
        suppliers={suppliers}
        projects={projects}
        catalogueMaterials={catalogueMaterials}
        onCreate={createPurchaseOrder}
      />

      <ReceiveDeliveryDialog
        po={receivingPo}
        open={Boolean(receivingPo)}
        onOpenChange={(o) => !o && setReceivingPo(undefined)}
        onConfirm={recordPurchaseOrderDelivery}
      />
    </PageContainer>
  );
}
