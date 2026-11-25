import { useEffect, useState } from 'react';
import { SITE_MANAGERS } from '@/src/data/mockData';
import type {
  PricingMethod,
  Project,
  ProjectFormValues,
  ProjectStatus,
  ProjectType,
} from '@/src/types';
import { Button } from '@/src/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/src/components/ui/dialog';
import { Input, Label, Textarea } from '@/src/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/src/components/ui/select';

const PROJECT_TYPES: ProjectType[] = [
  'Independent House',
  'Duplex Villa',
  'G+2 Residence',
  'Renovation & Extension',
  'Farmhouse Residence',
];

const PRICING_METHODS: PricingMethod[] = [
  'Per Sq.Ft Turnkey',
  'Fixed Lump Sum',
  'Labour Contract + Material',
  'Cost Plus Percentage',
];

const PROJECT_STATUSES: ProjectStatus[] = [
  'Planning',
  'In Progress',
  'On Hold',
  'Completed',
];

interface ProjectFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode?: 'create' | 'edit';
  initialProject?: Project | null;
  onSubmit: (values: ProjectFormValues & { progressPercent?: number }) => void;
}

interface FormState {
  name: string;
  customerName: string;
  customerPhone: string;
  siteAddress: string;
  city: string;
  projectType: ProjectType;
  builtUpAreaSqFt: string;
  floors: string;
  contractValue: string;
  pricingMethod: PricingMethod;
  startDate: string;
  estimatedCompletionDate: string;
  status: ProjectStatus;
  siteManager: string;
  progressPercent: string;
  notes: string;
}

type FormErrors = Partial<Record<keyof FormState, string>>;

function getDefaultState(project?: Project | null): FormState {
  if (project) {
    return {
      name: project.name,
      customerName: project.customerName,
      customerPhone: project.customerPhone,
      siteAddress: project.siteAddress,
      city: project.city,
      projectType: project.projectType,
      builtUpAreaSqFt: String(project.builtUpAreaSqFt),
      floors: String(project.floors),
      contractValue: String(project.contractValue),
      pricingMethod: project.pricingMethod,
      startDate: project.startDate,
      estimatedCompletionDate: project.estimatedCompletionDate,
      status: project.status,
      siteManager: project.siteManager,
      progressPercent: String(project.progressPercent),
      notes: project.notes,
    };
  }
  return {
    name: '',
    customerName: '',
    customerPhone: '+91 ',
    siteAddress: '',
    city: 'Bengaluru',
    projectType: 'Independent House',
    builtUpAreaSqFt: '',
    floors: '2',
    contractValue: '',
    pricingMethod: 'Per Sq.Ft Turnkey',
    startDate: '2026-12-01',
    estimatedCompletionDate: '2027-09-30',
    status: 'Planning',
    siteManager: SITE_MANAGERS[0],
    progressPercent: '5',
    notes: '',
  };
}

export function ProjectFormDialog({
  open,
  onOpenChange,
  initialProject,
  onSubmit,
}: ProjectFormDialogProps) {
  const isEditing = Boolean(initialProject);
  const [form, setForm] = useState<FormState>(() => getDefaultState(initialProject));
  const [errors, setErrors] = useState<FormErrors>({});

  useEffect(() => {
    if (open) {
      setForm(getDefaultState(initialProject));
      setErrors({});
    }
  }, [open, initialProject]);

  const updateField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  };

  const validate = (): boolean => {
    const nextErrors: FormErrors = {};

    if (form.name.trim().length < 3) {
      nextErrors.name = 'Enter a project name (at least 3 characters).';
    }
    if (form.customerName.trim().length < 2) {
      nextErrors.customerName = 'Customer full name is required.';
    }
    const digits = form.customerPhone.replace(/\D/g, '');
    if (digits.length < 10) {
      nextErrors.customerPhone = 'Enter a valid 10-digit Indian phone number.';
    }
    if (form.siteAddress.trim().length < 6) {
      nextErrors.siteAddress = 'Provide the complete construction site address.';
    }
    const area = Number(form.builtUpAreaSqFt);
    if (!Number.isFinite(area) || area < 200) {
      nextErrors.builtUpAreaSqFt = 'Built-up area must be at least 200 sq.ft.';
    }
    const floors = Number(form.floors);
    if (!Number.isFinite(floors) || floors < 1 || floors > 12) {
      nextErrors.floors = 'Floors must be between 1 and 12.';
    }
    const contractVal = Number(form.contractValue);
    if (!Number.isFinite(contractVal) || contractVal < 100000) {
      nextErrors.contractValue = 'Contract value must be at least ₹1,00,000.';
    }
    if (!form.startDate) {
      nextErrors.startDate = 'Start date is required.';
    }
    if (!form.estimatedCompletionDate) {
      nextErrors.estimatedCompletionDate = 'Estimated completion date is required.';
    } else if (
      form.startDate &&
      new Date(form.estimatedCompletionDate) <= new Date(form.startDate)
    ) {
      nextErrors.estimatedCompletionDate =
        'Completion date must be after the start date.';
    }
    if (!form.siteManager.trim()) {
      nextErrors.siteManager = 'Assign a site manager.';
    }
    if (isEditing) {
      const pct = Number(form.progressPercent);
      if (!Number.isFinite(pct) || pct < 0 || pct > 100) {
        nextErrors.progressPercent = 'Progress must be between 0 and 100%.';
      }
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    onSubmit({
      name: form.name.trim(),
      customerName: form.customerName.trim(),
      customerPhone: form.customerPhone.trim(),
      siteAddress: form.siteAddress.trim(),
      city: form.city.trim() || 'Bengaluru',
      projectType: form.projectType,
      builtUpAreaSqFt: Math.round(Number(form.builtUpAreaSqFt)),
      floors: Math.round(Number(form.floors)),
      contractValue: Math.round(Number(form.contractValue)),
      pricingMethod: form.pricingMethod,
      startDate: form.startDate,
      estimatedCompletionDate: form.estimatedCompletionDate,
      status: form.status,
      siteManager: form.siteManager,
      notes: form.notes.trim(),
      ...(isEditing ? { progressPercent: Math.round(Number(form.progressPercent)) } : {}),
    });
    onOpenChange(false);
  };

  const ratePerSqFt =
    Number(form.contractValue) > 0 && Number(form.builtUpAreaSqFt) > 0
      ? Math.round(Number(form.contractValue) / Number(form.builtUpAreaSqFt))
      : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? `Edit Project — ${initialProject?.code}` : 'Create Residential Project'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update contract parameters, schedule, or assigned site manager.'
              : 'Enter customer, site specifications, and contract details to open a new project ledger.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} noValidate className="flex flex-col overflow-hidden">
          <div className="overflow-y-auto px-6 py-5 space-y-5">
            {/* Project & Customer Identity */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="pf-name">Project Name *</Label>
                <Input
                  id="pf-name"
                  placeholder="e.g. Sharma G+2 Independent Residence"
                  value={form.name}
                  onChange={(e) => updateField('name', e.target.value)}
                />
                {errors.name && (
                  <p className="text-xs text-red-600">{errors.name}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="pf-customer">Customer Name *</Label>
                <Input
                  id="pf-customer"
                  placeholder="e.g. Rajesh & Ananya Sharma"
                  value={form.customerName}
                  onChange={(e) => updateField('customerName', e.target.value)}
                />
                {errors.customerName && (
                  <p className="text-xs text-red-600">{errors.customerName}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="pf-phone">Customer Phone *</Label>
                <Input
                  id="pf-phone"
                  placeholder="+91 98450 12345"
                  value={form.customerPhone}
                  onChange={(e) => updateField('customerPhone', e.target.value)}
                />
                {errors.customerPhone && (
                  <p className="text-xs text-red-600">{errors.customerPhone}</p>
                )}
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="pf-address">Site Address *</Label>
                <Input
                  id="pf-address"
                  placeholder="Plot / Survey No., Layout, Locality, City"
                  value={form.siteAddress}
                  onChange={(e) => updateField('siteAddress', e.target.value)}
                />
                {errors.siteAddress && (
                  <p className="text-xs text-red-600">{errors.siteAddress}</p>
                )}
              </div>
            </div>

            {/* Technical Specs & Contract */}
            <div className="border-t border-slate-100 pt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label>Project Type *</Label>
                <Select
                  value={form.projectType}
                  onValueChange={(v) => updateField('projectType', v as ProjectType)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PROJECT_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="pf-area">Built-up Area (sq.ft) *</Label>
                <Input
                  id="pf-area"
                  type="number"
                  min={200}
                  placeholder="2400"
                  value={form.builtUpAreaSqFt}
                  onChange={(e) => updateField('builtUpAreaSqFt', e.target.value)}
                  className="tabular-nums"
                />
                {errors.builtUpAreaSqFt && (
                  <p className="text-xs text-red-600">{errors.builtUpAreaSqFt}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="pf-floors">Number of Floors *</Label>
                <Input
                  id="pf-floors"
                  type="number"
                  min={1}
                  max={12}
                  value={form.floors}
                  onChange={(e) => updateField('floors', e.target.value)}
                  className="tabular-nums"
                />
                {errors.floors && (
                  <p className="text-xs text-red-600">{errors.floors}</p>
                )}
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="pf-value">Contract Value (₹ INR) *</Label>
                  {ratePerSqFt && (
                    <span className="text-[11px] font-mono text-slate-500 tabular-nums">
                      ≈ ₹{ratePerSqFt.toLocaleString('en-IN')} / sq.ft
                    </span>
                  )}
                </div>
                <Input
                  id="pf-value"
                  type="number"
                  min={100000}
                  step={10000}
                  placeholder="5500000"
                  value={form.contractValue}
                  onChange={(e) => updateField('contractValue', e.target.value)}
                  className="tabular-nums"
                />
                {errors.contractValue && (
                  <p className="text-xs text-red-600">{errors.contractValue}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label>Pricing Method *</Label>
                <Select
                  value={form.pricingMethod}
                  onValueChange={(v) =>
                    updateField('pricingMethod', v as PricingMethod)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRICING_METHODS.map((method) => (
                      <SelectItem key={method} value={method}>
                        {method}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Schedule & Ownership */}
            <div className="border-t border-slate-100 pt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="pf-start">Start Date *</Label>
                <Input
                  id="pf-start"
                  type="date"
                  value={form.startDate}
                  onChange={(e) => updateField('startDate', e.target.value)}
                  className="tabular-nums"
                />
                {errors.startDate && (
                  <p className="text-xs text-red-600">{errors.startDate}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="pf-end">Estimated Completion Date *</Label>
                <Input
                  id="pf-end"
                  type="date"
                  value={form.estimatedCompletionDate}
                  onChange={(e) =>
                    updateField('estimatedCompletionDate', e.target.value)
                  }
                  className="tabular-nums"
                />
                {errors.estimatedCompletionDate && (
                  <p className="text-xs text-red-600">
                    {errors.estimatedCompletionDate}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label>Project Status *</Label>
                <Select
                  value={form.status}
                  onValueChange={(v) => updateField('status', v as ProjectStatus)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PROJECT_STATUSES.map((status) => (
                      <SelectItem key={status} value={status}>
                        {status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Assigned Site Manager *</Label>
                <Select
                  value={form.siteManager}
                  onValueChange={(v) => updateField('siteManager', v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SITE_MANAGERS.map((mgr) => (
                      <SelectItem key={mgr} value={mgr}>
                        {mgr}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.siteManager && (
                  <p className="text-xs text-red-600">{errors.siteManager}</p>
                )}
              </div>

              {isEditing && (
                <div className="space-y-1.5">
                  <Label htmlFor="pf-progress">Overall Progress (%)</Label>
                  <Input
                    id="pf-progress"
                    type="number"
                    min={0}
                    max={100}
                    value={form.progressPercent}
                    onChange={(e) => updateField('progressPercent', e.target.value)}
                    className="tabular-nums"
                  />
                  {errors.progressPercent && (
                    <p className="text-xs text-red-600">{errors.progressPercent}</p>
                  )}
                </div>
              )}

              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="pf-notes">Notes &amp; Package Specifications</Label>
                <Textarea
                  id="pf-notes"
                  placeholder="Key material specifications, exclusions, or municipal approval remarks..."
                  value={form.notes}
                  onChange={(e) => updateField('notes', e.target.value)}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit">
              {isEditing ? 'Save Changes' : 'Create Project'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
