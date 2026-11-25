import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  CalendarCheck2,
  Clock,
  Pencil,
  Plus,
  Power,
} from 'lucide-react';
import { useAuth } from '@/src/context/AuthContext';
import { useBuildFlow } from '@/src/context/BuildFlowContext';
import {
  calculateAttendanceWage,
  calculateNetWorkedHours,
  resolveEffectiveDailySalary,
} from '@/src/lib/wageCalculations';
import { formatIndianDate, formatINR } from '@/src/lib/utils';
import { PageContainer, PageHeader } from '@/src/components/layout/PageContainer';
import { Badge } from '@/src/components/ui/badge';
import { Button } from '@/src/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/src/components/ui/card';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/src/components/ui/table';
import type { RoleWageConfig, ShiftRule } from '@/src/types';

export function WageConfigPage() {
  const { currentUser } = useAuth();
  const {
    workers,
    roleWageConfigs,
    shiftRules,
    updateRoleWageConfig,
    addShiftRule,
    updateShiftRule,
    toggleShiftRuleActive,
  } = useBuildFlow();

  // Role rate edit modal
  const [editingRole, setEditingRole] = useState<RoleWageConfig | null>(null);
  const [roleRateInput, setRoleRateInput] = useState('');
  const [roleRateError, setRoleRateError] = useState('');

  // Shift rule modal
  const [shiftDialogOpen, setShiftDialogOpen] = useState(false);
  const [editingShift, setEditingShift] = useState<ShiftRule | null>(null);
  const [sName, setSName] = useState('');
  const [sCode, setSCode] = useState('');
  const [sStart, setSStart] = useState('09:00');
  const [sEnd, setSEnd] = useState('18:00');
  const [sBreak, setSBreak] = useState('60');
  const [sUnits, setSUnits] = useState('1.0');
  const [sMultiplier, setSMultiplier] = useState('1.0');
  const [sDesc, setSDesc] = useState('');
  const [sError, setSError] = useState('');

  const roleStats = useMemo(() => {
    return roleWageConfigs.map((cfg) => {
      const roleWorkers = workers.filter((w) => w.role === cfg.role);
      let defaultUsers = 0;
      let overrideUsers = 0;
      for (const w of roleWorkers) {
        const res = resolveEffectiveDailySalary(w, roleWageConfigs);
        if (res.source === 'individual_override') overrideUsers += 1;
        else defaultUsers += 1;
      }
      return { cfg, total: roleWorkers.length, defaultUsers, overrideUsers };
    });
  }, [roleWageConfigs, workers]);

  const activeShiftRules = useMemo(
    () => shiftRules.filter((r) => r.active),
    [shiftRules],
  );

  const openRoleRateEdit = (cfg: RoleWageConfig) => {
    setEditingRole(cfg);
    setRoleRateInput(String(cfg.defaultDailySalary));
    setRoleRateError('');
  };

  const handleSaveRoleRate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRole) return;
    const numeric = Number(roleRateInput);
    if (!Number.isFinite(numeric) || numeric < 100) {
      setRoleRateError('Enter a valid daily salary amount of ₹100 or above.');
      return;
    }
    updateRoleWageConfig(
      editingRole.role,
      numeric,
      currentUser?.fullName ?? 'Owner',
    );
    setEditingRole(null);
  };

  const openAddShift = () => {
    setEditingShift(null);
    setSName('');
    setSCode('');
    setSStart('07:00');
    setSEnd('19:00');
    setSBreak('60');
    setSUnits('1.5');
    setSMultiplier('1.5');
    setSDesc('');
    setSError('');
    setShiftDialogOpen(true);
  };

  const openEditShift = (rule: ShiftRule) => {
    setEditingShift(rule);
    setSName(rule.name);
    setSCode(rule.code);
    setSStart(rule.startTime);
    setSEnd(rule.endTime);
    setSBreak(String(rule.breakDurationMinutes));
    setSUnits(String(rule.attendanceUnits));
    setSMultiplier(String(rule.wageMultiplier));
    setSDesc(rule.description ?? '');
    setSError('');
    setShiftDialogOpen(true);
  };

  const handleSaveShift = (e: React.FormEvent) => {
    e.preventDefault();
    setSError('');
    if (sName.trim().length < 2) {
      setSError('Enter a clear shift rule name.');
      return;
    }
    const netHrs = calculateNetWorkedHours(sStart, sEnd, Number(sBreak) || 0);
    if (netHrs <= 0) {
      setSError('End time must be after start time (accounting for break duration).');
      return;
    }
    const units = Number(sUnits);
    const mult = Number(sMultiplier);
    if (!Number.isFinite(units) || units <= 0 || units > 2) {
      setSError('Attendance units must be between 0.25 and 2.0.');
      return;
    }
    if (!Number.isFinite(mult) || mult <= 0 || mult > 3) {
      setSError('Wage multiplier must be between 0.25x and 3.0x.');
      return;
    }

    const payload = {
      name: sName.trim(),
      code: sCode.trim().toUpperCase() || `SH-${shiftRules.length + 1}`,
      startTime: sStart,
      endTime: sEnd,
      breakDurationMinutes: Math.max(0, Math.round(Number(sBreak) || 0)),
      attendanceUnits: Math.round(units * 100) / 100,
      wageMultiplier: Math.round(mult * 100) / 100,
      active: editingShift ? editingShift.active : true,
      isDefaultNormal: editingShift?.isDefaultNormal ?? false,
      description: sDesc.trim(),
    };

    if (editingShift) {
      updateShiftRule(editingShift.id, payload);
    } else {
      addShiftRule(payload);
    }
    setShiftDialogOpen(false);
  };

  return (
    <PageContainer>
      <PageHeader
        title="Role Wage Configuration & Shift Rules"
        description="Configure default daily salaries by worker role and set shift hours, attendance units, and wage multipliers. Supervisors cannot edit these rules."
        actions={
          <>
            <Button variant="outline" size="sm" asChild>
              <Link to="/workforce">
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Workforce Master</span>
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link to="/attendance">
                <CalendarCheck2 className="h-3.5 w-3.5" />
                <span>Daily Attendance</span>
              </Link>
            </Button>
            <Button size="sm" onClick={openAddShift}>
              <Plus className="h-4 w-4" />
              <span>Add Shift Rule</span>
            </Button>
          </>
        }
      />

      <div className="space-y-6">
        {/* 1. Role-Based Default Daily Salaries */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Role-Based Default Daily Salaries</CardTitle>
            <CardDescription>
              Editing a role&apos;s default rate immediately updates all workers using the role default. Workers with an individual salary override retain their custom rate.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Worker Role</TableHead>
                  <TableHead>Role Description</TableHead>
                  <TableHead className="text-right">Default Daily Salary</TableHead>
                  <TableHead className="text-right">Workers Linked</TableHead>
                  <TableHead>Last Updated</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {roleStats.map(({ cfg, total, defaultUsers, overrideUsers }) => (
                  <TableRow key={cfg.id}>
                    <TableCell className="font-semibold text-slate-900 whitespace-nowrap">
                      {cfg.role}
                    </TableCell>
                    <TableCell className="text-xs text-slate-600 max-w-md">
                      {cfg.description}
                    </TableCell>
                    <TableCell className="text-right font-mono text-base font-semibold text-slate-900 tabular-nums whitespace-nowrap">
                      {formatINR(cfg.defaultDailySalary)}
                      <span className="text-[11px] font-normal text-slate-400">
                        {' '}
                        / day
                      </span>
                    </TableCell>
                    <TableCell className="text-right text-xs tabular-nums whitespace-nowrap">
                      <span className="font-medium text-slate-800">
                        {defaultUsers} role default
                      </span>
                      {overrideUsers > 0 && (
                        <span className="text-slate-400">
                          {' '}
                          · {overrideUsers} override
                        </span>
                      )}
                      {total === 0 && <span className="text-slate-400">0 workers</span>}
                    </TableCell>
                    <TableCell className="text-xs text-slate-500 tabular-nums whitespace-nowrap">
                      {formatIndianDate(cfg.updatedAt)} · {cfg.updatedBy}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openRoleRateEdit(cfg)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        <span>Edit Rate</span>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* 2. Configurable Shift Rules & Multipliers */}
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-4 pb-3">
            <div>
              <CardTitle>Shift Rules &amp; Wage Multipliers</CardTitle>
              <CardDescription>
                Normal working day (9 AM – 6 PM = 1.0x), Long working day (6 AM – 6 PM = 1.5x), and Half day (0.5x). Add or edit rules anytime.
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={openAddShift}>
              <Plus className="h-3.5 w-3.5" />
              <span>New Shift Rule</span>
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Shift Name</TableHead>
                  <TableHead>Time Range</TableHead>
                  <TableHead className="text-right">Break</TableHead>
                  <TableHead className="text-right">Net Hours</TableHead>
                  <TableHead className="text-right">Attendance Units</TableHead>
                  <TableHead className="text-right">Wage Multiplier</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {shiftRules.map((rule) => {
                  const netHrs = calculateNetWorkedHours(
                    rule.startTime,
                    rule.endTime,
                    rule.breakDurationMinutes,
                  );
                  return (
                    <TableRow
                      key={rule.id}
                      className={!rule.active ? 'opacity-60' : ''}
                    >
                      <TableCell>
                        <div className="font-semibold text-slate-900">
                          {rule.name}
                        </div>
                        <div className="text-xs text-slate-500">
                          <span className="font-mono">{rule.code}</span>
                          {rule.description ? ` · ${rule.description}` : ''}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-slate-800 tabular-nums whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5 text-slate-400" />
                          {rule.startTime} – {rule.endTime}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs text-slate-600 tabular-nums">
                        {rule.breakDurationMinutes} min
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs text-slate-700 tabular-nums">
                        {netHrs} hrs
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs font-medium text-slate-800 tabular-nums">
                        {rule.attendanceUnits.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm font-semibold text-[#A65229] tabular-nums">
                        {rule.wageMultiplier}x
                      </TableCell>
                      <TableCell>
                        <Badge variant={rule.active ? 'green' : 'neutral'}>
                          {rule.active ? 'Active' : 'Disabled'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="inline-flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditShift(rule)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            <span>Edit</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => toggleShiftRuleActive(rule.id)}
                            title={rule.active ? 'Disable rule' : 'Enable rule'}
                          >
                            <Power className="h-3.5 w-3.5 text-slate-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* 3. Live Dynamic Calculation Matrix (Zero hardcoded values) */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Live Wage Payout Matrix</CardTitle>
            <CardDescription>
              Real-time preview computed directly from the active role daily salaries and shift multipliers above.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Role</TableHead>
                  <TableHead className="text-right">Base Rate (1.0x)</TableHead>
                  {activeShiftRules.map((rule) => (
                    <TableHead key={rule.id} className="text-right">
                      {rule.name} ({rule.wageMultiplier}x)
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {roleWageConfigs.map((cfg) => (
                  <TableRow key={cfg.id}>
                    <TableCell className="font-semibold text-slate-900">
                      {cfg.role}
                    </TableCell>
                    <TableCell className="text-right font-mono text-slate-600 tabular-nums">
                      {formatINR(cfg.defaultDailySalary)}
                    </TableCell>
                    {activeShiftRules.map((rule) => {
                      const calc = calculateAttendanceWage({
                        worker: {
                          role: cfg.role,
                          dailyWage: cfg.defaultDailySalary,
                          individualDailySalary: null,
                        },
                        roleWageConfigs,
                        status: rule.wageMultiplier <= 0.5 ? 'Half Day' : 'Present',
                        shiftRule: rule,
                        shiftRules,
                      });
                      return (
                        <TableCell
                          key={rule.id}
                          className="text-right font-mono font-semibold text-slate-900 tabular-nums"
                        >
                          {formatINR(calc.calculatedWage)}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Edit Role Default Rate Dialog */}
      <Dialog
        open={Boolean(editingRole)}
        onOpenChange={(o) => !o && setEditingRole(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Default Daily Salary</DialogTitle>
            <DialogDescription>
              Update the standard daily wage for {editingRole?.role}.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveRoleRate}>
            <div className="px-6 py-5 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="rc-rate">Default Daily Salary (₹ INR) *</Label>
                <Input
                  id="rc-rate"
                  type="number"
                  min={100}
                  step={25}
                  value={roleRateInput}
                  onChange={(e) => setRoleRateInput(e.target.value)}
                  className="font-mono tabular-nums"
                />
                {roleRateError && (
                  <p className="text-xs text-red-600">{roleRateError}</p>
                )}
              </div>

              {Number(roleRateInput) >= 100 && (
                <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-xs space-y-1.5">
                  <p className="font-semibold text-slate-800">
                    Calculated Shift Payout Preview
                  </p>
                  {activeShiftRules.map((rule) => (
                    <div
                      key={rule.id}
                      className="flex items-center justify-between text-slate-600"
                    >
                      <span>
                        {rule.name} ({rule.wageMultiplier}x)
                      </span>
                      <span className="font-mono font-semibold text-slate-900 tabular-nums">
                        {formatINR(Math.round(Number(roleRateInput) * rule.wageMultiplier))}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditingRole(null)}
              >
                Cancel
              </Button>
              <Button type="submit">Update Role Salary</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add / Edit Shift Rule Dialog */}
      <Dialog open={shiftDialogOpen} onOpenChange={setShiftDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingShift ? `Edit Shift Rule — ${editingShift.code}` : 'Add Shift Rule'}
            </DialogTitle>
            <DialogDescription>
              Define working hours, break duration, attendance units, and daily salary multiplier.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveShift}>
            <div className="px-6 py-5 space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="sr-name">Shift Rule Name *</Label>
                  <Input
                    id="sr-name"
                    value={sName}
                    onChange={(e) => setSName(e.target.value)}
                    placeholder="e.g. Extended Concrete Pour Shift"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="sr-code">Short Code</Label>
                  <Input
                    id="sr-code"
                    value={sCode}
                    onChange={(e) => setSCode(e.target.value)}
                    placeholder="EXT-1.5"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="sr-start">Start Time *</Label>
                  <Input
                    id="sr-start"
                    type="time"
                    value={sStart}
                    onChange={(e) => setSStart(e.target.value)}
                    className="font-mono tabular-nums"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="sr-end">End Time *</Label>
                  <Input
                    id="sr-end"
                    type="time"
                    value={sEnd}
                    onChange={(e) => setSEnd(e.target.value)}
                    className="font-mono tabular-nums"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="sr-break">Break (min)</Label>
                  <Input
                    id="sr-break"
                    type="number"
                    min={0}
                    max={180}
                    value={sBreak}
                    onChange={(e) => setSBreak(e.target.value)}
                    className="font-mono tabular-nums"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="sr-units">Attendance Units *</Label>
                  <Input
                    id="sr-units"
                    type="number"
                    step="0.25"
                    min="0.25"
                    max="2"
                    value={sUnits}
                    onChange={(e) => setSUnits(e.target.value)}
                    className="font-mono tabular-nums"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="sr-mult">Wage Multiplier (x) *</Label>
                  <Input
                    id="sr-mult"
                    type="number"
                    step="0.25"
                    min="0.25"
                    max="3"
                    value={sMultiplier}
                    onChange={(e) => setSMultiplier(e.target.value)}
                    className="font-mono tabular-nums"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="sr-desc">Description</Label>
                <Textarea
                  id="sr-desc"
                  value={sDesc}
                  onChange={(e) => setSDesc(e.target.value)}
                  placeholder="When supervisors should apply this shift rule..."
                />
              </div>

              {sError && <p className="text-xs text-red-600">{sError}</p>}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShiftDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit">
                {editingShift ? 'Save Shift Rule' : 'Add Shift Rule'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
