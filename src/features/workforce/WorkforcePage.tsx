import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  CalendarCheck2,
  ExternalLink,
  Eye,
  Pencil,
  Power,
  RotateCcw,
  Search,
  SlidersHorizontal,
  UserPlus,
} from 'lucide-react';
import { useBuildFlow } from '@/src/context/BuildFlowContext';
import { useAuth } from '@/src/context/AuthContext';
import {
  DEFAULT_WORKER_ROLES,
  resolveEffectiveDailySalary,
} from '@/src/lib/wageCalculations';
import { formatIndianDate, formatINR } from '@/src/lib/utils';
import { PageContainer, PageHeader } from '@/src/components/layout/PageContainer';
import { Badge, getPaymentStatusVariant } from '@/src/components/ui/badge';
import { Button } from '@/src/components/ui/button';
import { Card, CardContent } from '@/src/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/src/components/ui/dialog';
import { EmptyState } from '@/src/components/ui/feedback';
import { Input, Label, Textarea } from '@/src/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/src/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/src/components/ui/table';
import type {
  DefaultWorkerRole,
  Worker,
  WorkerAccountStatus,
} from '@/src/types';

export function WorkforcePage() {
  const {
    projects,
    workers,
    roleWageConfigs,
    attendanceRecords,
    workerAdvances,
    wagePayments,
    createWorker,
    updateWorker,
    toggleWorkerActive,
    getWorkerWageSummary,
  } = useBuildFlow();
  const { syncWorkerAuthUser, loginAsCustomUser } = useAuth();
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | DefaultWorkerRole>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [salarySourceFilter, setSalarySourceFilter] = useState<
    'all' | 'role_default' | 'individual_override'
  >('all');

  const [formOpen, setFormOpen] = useState(false);
  const [editingWorker, setEditingWorker] = useState<Worker | null>(null);
  const [profileWorkerId, setProfileWorkerId] = useState<string | null>(null);

  // Worker form state
  const [fName, setFName] = useState('');
  const [fPhone, setFPhone] = useState('+91 ');
  const [fRole, setFRole] = useState<DefaultWorkerRole>('Mason / Masteri');
  const [fUseOverride, setFUseOverride] = useState(false);
  const [fIndividualSalary, setFIndividualSalary] = useState('');
  const [fJoinedDate, setFJoinedDate] = useState('2026-11-25');
  const [fProjectId, setFProjectId] = useState(projects[0]?.id ?? '');
  const [fActive, setFActive] = useState(true);
  const [fUsername, setFUsername] = useState('');
  const [fAccountStatus, setFAccountStatus] = useState<WorkerAccountStatus>('Invited');
  const [fNotes, setFNotes] = useState('');
  const [fError, setFError] = useState('');

  const projectMap = useMemo(
    () => new Map(projects.map((p) => [p.id, p])),
    [projects],
  );

  const enrichedWorkers = useMemo(() => {
    return workers.map((worker) => {
      const resolved = resolveEffectiveDailySalary(worker, roleWageConfigs);
      const summary = getWorkerWageSummary(worker.id);
      return {
        worker,
        resolved,
        summary,
        isActive: worker.active ?? true,
        siteName: projectMap.get(worker.assignedProjectId)?.name ?? 'Unassigned',
      };
    });
  }, [workers, roleWageConfigs, getWorkerWageSummary, projectMap]);

  const filteredWorkers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return enrichedWorkers.filter(({ worker, resolved, isActive, siteName }) => {
      if (roleFilter !== 'all' && worker.role !== roleFilter) return false;
      if (statusFilter === 'active' && !isActive) return false;
      if (statusFilter === 'inactive' && isActive) return false;
      if (projectFilter !== 'all' && worker.assignedProjectId !== projectFilter) return false;
      if (salarySourceFilter !== 'all' && resolved.source !== salarySourceFilter) return false;
      if (q) {
        const hay = [
          worker.workerCode ?? '',
          worker.name,
          worker.phone,
          worker.role,
          worker.loginUsername ?? '',
          siteName,
        ]
          .join(' ')
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [
    enrichedWorkers,
    searchQuery,
    roleFilter,
    statusFilter,
    projectFilter,
    salarySourceFilter,
  ]);

  const metrics = useMemo(() => {
    const activeCount = enrichedWorkers.filter((w) => w.isActive).length;
    const overrideCount = enrichedWorkers.filter(
      (w) => w.resolved.source === 'individual_override',
    ).length;
    const defaultCount = enrichedWorkers.length - overrideCount;
    const totalPending = enrichedWorkers.reduce(
      (sum, w) => sum + w.summary.netPayable,
      0,
    );
    return { activeCount, overrideCount, defaultCount, totalPending };
  }, [enrichedWorkers]);

  const hasFilters =
    searchQuery.trim() !== '' ||
    roleFilter !== 'all' ||
    statusFilter !== 'all' ||
    projectFilter !== 'all' ||
    salarySourceFilter !== 'all';

  const resetFilters = () => {
    setSearchQuery('');
    setRoleFilter('all');
    setStatusFilter('all');
    setProjectFilter('all');
    setSalarySourceFilter('all');
  };

  const openAddDialog = () => {
    setEditingWorker(null);
    setFName('');
    setFPhone('+91 ');
    setFRole('Mason / Masteri');
    setFUseOverride(false);
    setFIndividualSalary('');
    setFJoinedDate('2026-11-25');
    setFProjectId(projects[0]?.id ?? '');
    setFActive(true);
    setFUsername('');
    setFAccountStatus('Invited');
    setFNotes('');
    setFError('');
    setFormOpen(true);
  };

  const openEditDialog = (worker: Worker) => {
    const resolved = resolveEffectiveDailySalary(worker, roleWageConfigs);
    const defaultRole: DefaultWorkerRole = DEFAULT_WORKER_ROLES.includes(
      worker.role as DefaultWorkerRole,
    )
      ? (worker.role as DefaultWorkerRole)
      : 'Mason / Masteri';
    setEditingWorker(worker);
    setFName(worker.name);
    setFPhone(worker.phone);
    setFRole(defaultRole);
    setFUseOverride(resolved.source === 'individual_override');
    setFIndividualSalary(
      resolved.source === 'individual_override' ? String(resolved.dailySalary) : '',
    );
    setFJoinedDate(worker.joinedDate);
    setFProjectId(worker.assignedProjectId);
    setFActive(worker.active ?? true);
    setFUsername(worker.loginUsername ?? '');
    setFAccountStatus(worker.accountStatus ?? 'Active');
    setFNotes(worker.notes ?? '');
    setFError('');
    setFormOpen(true);
  };

  const selectedRoleDefault =
    roleWageConfigs.find((r) => r.role === fRole)?.defaultDailySalary ?? 0;

  const handleSaveWorker = (e: React.FormEvent) => {
    e.preventDefault();
    setFError('');
    if (fName.trim().length < 2) {
      setFError('Enter the worker full name (at least 2 characters).');
      return;
    }
    if (fPhone.replace(/\D/g, '').length < 10) {
      setFError('Enter a valid 10-digit Indian phone number.');
      return;
    }
    let overrideSalary: number | null = null;
    if (fUseOverride) {
      const parsed = Number(fIndividualSalary);
      if (!Number.isFinite(parsed) || parsed < 100) {
        setFError('Enter a valid individual daily salary override (₹100 or more).');
        return;
      }
      overrideSalary = Math.round(parsed);
    }

    const payload = {
      name: fName.trim(),
      phone: fPhone.trim(),
      role: fRole,
      individualDailySalary: overrideSalary,
      joinedDate: fJoinedDate,
      assignedProjectId: fProjectId,
      active: fActive,
      loginUsername: fUsername.trim(),
      accountStatus: fActive ? fAccountStatus : ('Disabled' as WorkerAccountStatus),
      notes: fNotes.trim(),
    };

    if (editingWorker) {
      updateWorker(editingWorker.id, payload);
      syncWorkerAuthUser({
        ...editingWorker,
        ...payload,
        dailyWage: overrideSalary ?? selectedRoleDefault,
      });
    } else {
      const created = createWorker(payload);
      syncWorkerAuthUser(created);
    }
    setFormOpen(false);
  };

  const handlePreviewWorkerPortal = (worker: Worker) => {
    const parts = worker.name.trim().split(/\s+/);
    const initials =
      parts.length >= 2
        ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
        : worker.name.slice(0, 2).toUpperCase();
    loginAsCustomUser({
      id: `usr-wrk-${worker.id}`,
      username: worker.loginUsername || `${worker.name.toLowerCase().split(/\s+/)[0]}.wrk`,
      fullName: worker.name,
      email: `${(worker.loginUsername || worker.id).toLowerCase()}@workers.buildflow.in`,
      phone: worker.phone,
      role: 'worker',
      title: `${worker.role} · ${worker.workerCode ?? 'Workforce'}`,
      initials,
      assignedProjectIds:
        worker.assignedProjectIds && worker.assignedProjectIds.length > 0
          ? worker.assignedProjectIds
          : [worker.assignedProjectId],
      linkedWorkerId: worker.id,
    });
    navigate('/worker');
  };

  const profileData = useMemo(() => {
    if (!profileWorkerId) return null;
    const item = enrichedWorkers.find((w) => w.worker.id === profileWorkerId);
    if (!item) return null;
    const history = attendanceRecords
      .filter((r) => r.workerId === profileWorkerId)
      .sort((a, b) => b.date.localeCompare(a.date));
    const advances = workerAdvances.filter((a) => a.workerId === profileWorkerId);
    const paid = wagePayments.filter((p) => p.workerId === profileWorkerId);
    return { ...item, history, advances, paid };
  }, [profileWorkerId, enrichedWorkers, attendanceRecords, workerAdvances, wagePayments]);

  return (
    <PageContainer>
      <PageHeader
        title="Workforce Master"
        description="Manage construction workers, role assignments, individual daily salary overrides, account status, and wage history."
        actions={
          <>
            <Button variant="outline" size="sm" asChild>
              <Link to="/wage-config">
                <SlidersHorizontal className="h-3.5 w-3.5" />
                <span>Wage &amp; Shift Config</span>
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link to="/attendance">
                <CalendarCheck2 className="h-3.5 w-3.5" />
                <span>Daily Attendance</span>
              </Link>
            </Button>
            <Button size="sm" onClick={openAddDialog}>
              <UserPlus className="h-4 w-4" />
              <span>Add Worker</span>
            </Button>
          </>
        }
      />

      {/* Summary Strip */}
      <div className="mb-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card className="p-4">
          <p className="text-xs font-medium text-slate-500">Active Workforce</p>
          <p className="mt-1.5 font-mono text-xl font-semibold text-slate-900 tabular-nums">
            {metrics.activeCount}{' '}
            <span className="text-xs font-normal text-slate-400">
              / {workers.length} total
            </span>
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-medium text-slate-500">Using Role Default</p>
          <p className="mt-1.5 font-mono text-xl font-semibold text-slate-900 tabular-nums">
            {metrics.defaultCount}
          </p>
          <p className="mt-0.5 text-[11px] text-slate-500">
            Synced automatically with Wage Config
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-medium text-slate-500">
            Individual Salary Overrides
          </p>
          <p className="mt-1.5 font-mono text-xl font-semibold text-[#A65229] tabular-nums">
            {metrics.overrideCount}
          </p>
          <p className="mt-0.5 text-[11px] text-slate-500">
            Custom daily rate per worker
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-medium text-slate-500">
            Unsettled Net Wages
          </p>
          <p className="mt-1.5 font-mono text-xl font-semibold text-amber-700 tabular-nums">
            {formatINR(metrics.totalPending)}
          </p>
          <p className="mt-0.5 text-[11px] text-slate-500">
            Derived from attendance &amp; shift rules
          </p>
        </Card>
      </div>

      {/* Filter Bar */}
      <Card className="mb-5 p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <div className="relative lg:col-span-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search name, WRK ID, phone, username..."
              className="pl-9"
              aria-label="Search workers"
            />
          </div>

          <Select
            value={roleFilter}
            onValueChange={(v) => setRoleFilter(v as 'all' | DefaultWorkerRole)}
          >
            <SelectTrigger aria-label="Filter by role">
              <SelectValue placeholder="All Roles" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              {DEFAULT_WORKER_ROLES.map((r) => (
                <SelectItem key={r} value={r}>
                  {r}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={projectFilter} onValueChange={setProjectFilter}>
            <SelectTrigger aria-label="Filter by assigned site">
              <SelectValue placeholder="All Sites" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sites</SelectItem>
              {projects.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={salarySourceFilter}
            onValueChange={(v) =>
              setSalarySourceFilter(
                v as 'all' | 'role_default' | 'individual_override',
              )
            }
          >
            <SelectTrigger aria-label="Filter by salary source">
              <SelectValue placeholder="Salary Source" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Salary Types</SelectItem>
              <SelectItem value="role_default">Role Default Salary</SelectItem>
              <SelectItem value="individual_override">
                Individual Salary Override
              </SelectItem>
            </SelectContent>
          </Select>

          <div className="flex items-center gap-2">
            <Select
              value={statusFilter}
              onValueChange={(v) =>
                setStatusFilter(v as 'all' | 'active' | 'inactive')
              }
            >
              <SelectTrigger aria-label="Filter by active status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
            {hasFilters && (
              <Button
                variant="ghost"
                size="icon"
                onClick={resetFilters}
                title="Reset filters"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Worker Master Table */}
      {filteredWorkers.length === 0 ? (
        <EmptyState
          title="No matching workers found"
          description="Adjust your search or filter criteria, or add a new worker record to the workforce master."
          actionLabel={hasFilters ? 'Reset Filters' : 'Add Worker'}
          onAction={hasFilters ? resetFilters : openAddDialog}
        />
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Worker</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Daily Salary &amp; Source</TableHead>
                <TableHead>Usual Site</TableHead>
                <TableHead>Account &amp; Joining</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredWorkers.map(({ worker, resolved, isActive, siteName }) => (
                <TableRow key={worker.id} className={!isActive ? 'opacity-65' : ''}>
                  <TableCell>
                    <button
                      type="button"
                      onClick={() => setProfileWorkerId(worker.id)}
                      className="text-left font-semibold text-[#252A27] hover:text-[#A65229] transition-colors cursor-pointer"
                    >
                      {worker.name}
                    </button>
                    <div className="mt-0.5 text-xs text-slate-500 tabular-nums">
                      <span className="font-mono">{worker.workerCode ?? worker.id}</span> ·{' '}
                      {worker.phone}
                    </div>
                  </TableCell>
                  <TableCell className="font-medium text-slate-800 whitespace-nowrap">
                    {worker.role}
                  </TableCell>
                  <TableCell>
                    <div className="font-mono font-semibold text-slate-900 tabular-nums">
                      {formatINR(resolved.dailySalary)}
                      <span className="text-[11px] font-normal text-slate-400">
                        {' '}
                        / day
                      </span>
                    </div>
                    <div className="mt-0.5 flex items-center gap-1.5">
                      <Badge
                        variant={
                          resolved.source === 'individual_override'
                            ? 'blue'
                            : 'neutral'
                        }
                      >
                        {resolved.source === 'individual_override'
                          ? 'Individual override'
                          : 'Role default'}
                      </Badge>
                      {resolved.source === 'individual_override' &&
                        resolved.roleDefaultSalary !== null && (
                          <span className="text-[11px] text-slate-400 tabular-nums">
                            (Role: {formatINR(resolved.roleDefaultSalary)})
                          </span>
                        )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-slate-800">{siteName}</div>
                    {worker.notes && (
                      <div className="text-xs text-slate-500 line-clamp-1 max-w-[230px]">
                        {worker.notes}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-slate-600">
                    <div className="font-mono text-slate-700">
                      @{worker.loginUsername ?? 'unassigned'} ·{' '}
                      <span className="font-sans text-slate-500">
                        {worker.accountStatus ?? 'Invited'}
                      </span>
                    </div>
                    <div className="mt-0.5 text-slate-400 tabular-nums">
                      Joined {formatIndianDate(worker.joinedDate)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={isActive ? 'green' : 'neutral'}>
                      {isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="inline-flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePreviewWorkerPortal(worker)}
                        title="Switch to this Worker's Portal"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        <span>Test Portal</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setProfileWorkerId(worker.id)}
                        title="View Profile & History"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        <span>Profile</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditDialog(worker)}
                        title="Edit Worker"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        <span>Edit</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => toggleWorkerActive(worker.id)}
                        title={isActive ? 'Deactivate Worker' : 'Activate Worker'}
                      >
                        <Power
                          className={`h-3.5 w-3.5 ${
                            isActive ? 'text-slate-500' : 'text-emerald-700'
                          }`}
                        />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Add / Edit Worker Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>
              {editingWorker
                ? `Edit Worker — ${editingWorker.workerCode ?? editingWorker.name}`
                : 'Add New Worker'}
            </DialogTitle>
            <DialogDescription>
              Assign one of the standardized construction roles. Leave individual salary unchecked to inherit the role default daily rate.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveWorker} className="flex flex-col overflow-hidden">
            <div className="overflow-y-auto px-6 py-5 space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="wm-name">Full Name *</Label>
                  <Input
                    id="wm-name"
                    value={fName}
                    onChange={(e) => setFName(e.target.value)}
                    placeholder="e.g. Mahesh Naik"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="wm-phone">Phone Number *</Label>
                  <Input
                    id="wm-phone"
                    value={fPhone}
                    onChange={(e) => setFPhone(e.target.value)}
                    placeholder="+91 98450 12345"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Assigned Role *</Label>
                  <Select
                    value={fRole}
                    onValueChange={(v) => setFRole(v as DefaultWorkerRole)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DEFAULT_WORKER_ROLES.map((role) => {
                        const rate = roleWageConfigs.find((r) => r.role === role)
                          ?.defaultDailySalary;
                        return (
                          <SelectItem key={role} value={role}>
                            {role} {rate ? `(${formatINR(rate)}/day)` : ''}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label>Assigned Project / Usual Site *</Label>
                  <Select value={fProjectId} onValueChange={setFProjectId}>
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
              </div>

              {/* Salary Configuration Section */}
              <div className="rounded-md border border-slate-200 bg-slate-50/70 p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-xs font-semibold text-slate-900">
                      Daily Salary Rule
                    </p>
                    <p className="text-xs text-slate-500">
                      Current default for <strong>{fRole}</strong>:{' '}
                      <span className="font-mono font-semibold text-slate-800">
                        {formatINR(selectedRoleDefault)} / day
                      </span>
                    </p>
                  </div>

                  <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={fUseOverride}
                      onChange={(e) => {
                        setFUseOverride(e.target.checked);
                        if (e.target.checked && !fIndividualSalary) {
                          setFIndividualSalary(String(selectedRoleDefault));
                        }
                      }}
                      className="h-4 w-4 rounded border-[#D8D1C5] accent-[#C66A3D]"
                    />
                    <span>Set individual salary override</span>
                  </label>
                </div>

                {fUseOverride && (
                  <div className="space-y-1.5">
                    <Label htmlFor="wm-override">
                      Individual Daily Salary Override (₹ INR) *
                    </Label>
                    <Input
                      id="wm-override"
                      type="number"
                      min={100}
                      step={25}
                      value={fIndividualSalary}
                      onChange={(e) => setFIndividualSalary(e.target.value)}
                      className="font-mono tabular-nums max-w-xs"
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label htmlFor="wm-joined">Joining Date</Label>
                  <Input
                    id="wm-joined"
                    type="date"
                    value={fJoinedDate}
                    onChange={(e) => setFJoinedDate(e.target.value)}
                    className="tabular-nums"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="wm-user">Login Username</Label>
                  <Input
                    id="wm-user"
                    value={fUsername}
                    onChange={(e) => setFUsername(e.target.value)}
                    placeholder="e.g. mahesh.wrk"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Account Status</Label>
                  <Select
                    value={fAccountStatus}
                    onValueChange={(v) =>
                      setFAccountStatus(v as WorkerAccountStatus)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Active">Active</SelectItem>
                      <SelectItem value="Invited">Invited</SelectItem>
                      <SelectItem value="Disabled">Disabled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="wm-notes">Notes</Label>
                <Textarea
                  id="wm-notes"
                  value={fNotes}
                  onChange={(e) => setFNotes(e.target.value)}
                  placeholder="Trade specialties, overtime reliability, or site notes..."
                />
              </div>

              <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={fActive}
                  onChange={(e) => setFActive(e.target.checked)}
                  className="h-4 w-4 rounded border-[#D8D1C5] accent-[#C66A3D]"
                />
                <span>Worker is active and eligible for daily site attendance</span>
              </label>

              {fError && <p className="text-xs text-red-600">{fError}</p>}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setFormOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit">
                {editingWorker ? 'Save Changes' : 'Add Worker'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Worker Profile & Attendance / Wage History Dialog */}
      <Dialog
        open={Boolean(profileData)}
        onOpenChange={(open) => !open && setProfileWorkerId(null)}
      >
        <DialogContent className="max-w-3xl">
          {profileData && (
            <>
              <DialogHeader>
                <DialogTitle className="flex flex-wrap items-center gap-2.5">
                  <span>{profileData.worker.name}</span>
                  <span className="font-mono text-xs text-slate-500">
                    {profileData.worker.workerCode}
                  </span>
                  <Badge variant={profileData.isActive ? 'green' : 'neutral'}>
                    {profileData.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </DialogTitle>
                <DialogDescription>
                  {profileData.worker.role} · {profileData.worker.phone} · Usual Site:{' '}
                  {profileData.siteName} · Joined{' '}
                  {formatIndianDate(profileData.worker.joinedDate)}
                </DialogDescription>
              </DialogHeader>

              <div className="overflow-y-auto px-6 py-5 space-y-5">
                {/* Rate & Payroll Strip */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div className="rounded-md border border-slate-200 bg-slate-50/70 p-3">
                    <p className="text-[11px] text-slate-500">Effective Daily Rate</p>
                    <p className="mt-1 font-mono text-base font-semibold text-slate-900 tabular-nums">
                      {formatINR(profileData.resolved.dailySalary)}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {profileData.resolved.source === 'individual_override'
                        ? 'Individual override'
                        : 'Role default'}
                    </p>
                  </div>
                  <div className="rounded-md border border-slate-200 bg-slate-50/70 p-3">
                    <p className="text-[11px] text-slate-500">Logged Units</p>
                    <p className="mt-1 font-mono text-base font-semibold text-slate-900 tabular-nums">
                      {profileData.summary.totalUnits} d
                    </p>
                    <p className="text-[11px] text-slate-500 tabular-nums">
                      {profileData.summary.longShiftDays} long (1.5x) ·{' '}
                      {profileData.summary.halfDays} half
                    </p>
                  </div>
                  <div className="rounded-md border border-slate-200 bg-slate-50/70 p-3">
                    <p className="text-[11px] text-slate-500">Gross Wages</p>
                    <p className="mt-1 font-mono text-base font-semibold text-slate-900 tabular-nums">
                      {formatINR(profileData.summary.grossWages)}
                    </p>
                    <p className="text-[11px] text-slate-500 tabular-nums">
                      Advances: {formatINR(profileData.summary.approvedAdvances)}
                    </p>
                  </div>
                  <div className="rounded-md border border-slate-200 bg-slate-50/70 p-3">
                    <p className="text-[11px] text-slate-500">Net Payable</p>
                    <p className="mt-1 font-mono text-base font-semibold text-[#A65229] tabular-nums">
                      {formatINR(profileData.summary.netPayable)}
                    </p>
                    <p className="text-[11px] text-slate-500 tabular-nums">
                      Paid: {formatINR(profileData.summary.totalPaid)}
                    </p>
                  </div>
                </div>

                {/* Attendance History */}
                <div>
                  <h4 className="text-xs font-semibold text-slate-700 mb-2">
                    Attendance &amp; Calculated Wage History ({profileData.history.length})
                  </h4>
                  {profileData.history.length === 0 ? (
                    <p className="text-xs text-slate-500 py-3">
                      No attendance records logged yet.
                    </p>
                  ) : (
                    <div className="rounded-md border border-slate-200 overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Site</TableHead>
                            <TableHead>Status &amp; Shift</TableHead>
                            <TableHead>Hours</TableHead>
                            <TableHead className="text-right">Units / Mult</TableHead>
                            <TableHead className="text-right">Wage</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {profileData.history.map((rec) => (
                            <TableRow key={rec.id}>
                              <TableCell className="text-xs tabular-nums whitespace-nowrap">
                                {formatIndianDate(rec.date)}
                              </TableCell>
                              <TableCell className="text-xs text-slate-700">
                                {projectMap.get(rec.projectId)?.name ?? rec.projectId}
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant={getPaymentStatusVariant(rec.status)}
                                >
                                  {rec.status}
                                </Badge>
                                {rec.shiftName && (
                                  <div className="mt-0.5 text-[11px] text-slate-500">
                                    {rec.shiftName}
                                  </div>
                                )}
                              </TableCell>
                              <TableCell className="font-mono text-xs text-slate-600 tabular-nums whitespace-nowrap">
                                {rec.startTime && rec.endTime
                                  ? `${rec.startTime} – ${rec.endTime}`
                                  : '—'}
                              </TableCell>
                              <TableCell className="text-right font-mono text-xs tabular-nums">
                                {rec.attendanceUnits ?? 0}u · {rec.wageMultiplier ?? 0}x
                              </TableCell>
                              <TableCell className="text-right font-mono text-xs font-semibold text-slate-900 tabular-nums">
                                {formatINR(rec.calculatedWage ?? 0)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>

                {profileData.worker.notes && (
                  <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
                    <strong className="text-slate-800">Notes:</strong>{' '}
                    {profileData.worker.notes}
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const target = profileData.worker;
                    setProfileWorkerId(null);
                    openEditDialog(target);
                  }}
                >
                  <Pencil className="h-3.5 w-3.5" />
                  <span>Edit Worker</span>
                </Button>
                <Button size="sm" onClick={() => setProfileWorkerId(null)}>
                  Close
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
