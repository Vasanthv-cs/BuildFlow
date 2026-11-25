import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  AlertTriangle,
  Building2,
  Calendar,
  CalendarCheck2,
  Clock,
  CreditCard,
  FileText,
  Filter,
  HardHat,
  IndianRupee,
  Lock,
  MapPin,
  Printer,
  RefreshCw,
  ShieldAlert,
  TrendingUp,
} from 'lucide-react';
import { useAuth } from '@/src/context/AuthContext';
import { useBuildFlow } from '@/src/context/BuildFlowContext';
import {
  calculateAttendanceWage,
  computeWeeklyWorkerPayPeriods,
  resolveEffectiveDailySalary,
  type WeeklyWorkerPayPeriod,
} from '@/src/lib/wageCalculations';
import { formatIndianDate, formatINR } from '@/src/lib/utils';
import { PageContainer, PageHeader } from '@/src/components/layout/PageContainer';
import { Badge, getPaymentStatusVariant } from '@/src/components/ui/badge';
import { Button } from '@/src/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/src/components/ui/card';
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from '@/src/components/ui/feedback';
import { Input, Label } from '@/src/components/ui/input';
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

export type { WeeklyWorkerPayPeriod };

/**
 * Self-data hook that strictly locks all queries to the authenticated worker's
 * linkedWorkerId. Any attempt to pass ?workerId=... in URL query params is
 * intercepted, ignored, and flagged.
 */
function useWorkerSelfData() {
  const { currentUser } = useAuth();
  const store = useBuildFlow();
  const [searchParams, setSearchParams] = useSearchParams();

  // Strictly enforce own worker ID — never honor URL parameter overrides
  const authenticatedWorkerId = currentUser?.linkedWorkerId ?? 'wrk-1';
  const requestedUrlWorkerId = searchParams.get('workerId');
  const blockedCrossWorkerAttempt = Boolean(
    requestedUrlWorkerId && requestedUrlWorkerId !== authenticatedWorkerId,
  );

  const clearTamperedParam = () => {
    const next = new URLSearchParams(searchParams);
    next.delete('workerId');
    setSearchParams(next, { replace: true });
  };

  const worker =
    store.workers.find((w) => w.id === authenticatedWorkerId) ?? store.workers[0];
  const resolved = resolveEffectiveDailySalary(worker, store.roleWageConfigs);
  const summary = store.getWorkerWageSummary(worker.id);

  const projectMap = useMemo(
    () => new Map(store.projects.map((p) => [p.id, p])),
    [store.projects],
  );

  const myAttendance = useMemo(
    () =>
      store.attendanceRecords
        .filter((r) => r.workerId === worker.id)
        .map((r) => ({
          ...r,
          effectiveDailyRate: resolved.dailySalary,
          calculatedWage: Math.round(
            resolved.dailySalary * (r.wageMultiplier ?? r.attendanceUnits ?? 0),
          ),
        }))
        .sort((a, b) => b.date.localeCompare(a.date)),
    [store.attendanceRecords, worker.id, resolved.dailySalary],
  );

  const myAdvances = useMemo(
    () =>
      store.workerAdvances
        .filter((a) => a.workerId === worker.id)
        .sort((a, b) => b.date.localeCompare(a.date)),
    [store.workerAdvances, worker.id],
  );

  const myPayments = useMemo(
    () =>
      store.wagePayments
        .filter((p) => p.workerId === worker.id)
        .sort((a, b) => b.date.localeCompare(a.date)),
    [store.wagePayments, worker.id],
  );

  // Build week-by-week pay period summaries using centralized wageCalculations engine
  const weeklyPeriods = useMemo<WeeklyWorkerPayPeriod[]>(
    () =>
      computeWeeklyWorkerPayPeriods(
        worker,
        store.roleWageConfigs,
        store.attendanceRecords,
        store.workerAdvances,
        store.wagePayments,
      ),
    [
      worker,
      store.roleWageConfigs,
      store.attendanceRecords,
      store.workerAdvances,
      store.wagePayments,
    ],
  );

  return {
    worker,
    resolved,
    summary,
    projectMap,
    myAttendance,
    myAdvances,
    myPayments,
    weeklyPeriods,
    blockedCrossWorkerAttempt,
    requestedUrlWorkerId,
    clearTamperedParam,
    store,
  };
}

function SelfScopeGuardBanner({
  workerName,
  workerCode,
  blockedCrossWorkerAttempt,
  requestedUrlWorkerId,
  onDismiss,
}: {
  workerName: string;
  workerCode?: string;
  blockedCrossWorkerAttempt: boolean;
  requestedUrlWorkerId: string | null;
  onDismiss: () => void;
}) {
  return (
    <div className="mb-5 space-y-2">
      {blockedCrossWorkerAttempt && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-red-200 bg-red-50/90 px-4 py-2.5 text-xs text-red-800">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-red-600 shrink-0" />
            <span>
              <strong>Access Blocked:</strong> Attempted to view worker ID{' '}
              <code className="rounded bg-red-100 px-1 py-0.5 font-mono">
                {requestedUrlWorkerId}
              </code>{' '}
              via URL parameter. Workers can only view their own profile and wage records.
            </span>
          </div>
          <Button variant="outline" size="sm" onClick={onDismiss}>
            Reset URL
          </Button>
        </div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-[4px] border border-[#D8D1C5] bg-[#FAF8F3] px-4 py-2 text-xs text-[#57564F]">
        <div className="flex items-center gap-2">
          <Lock className="h-3.5 w-3.5 text-[#A65229] shrink-0" />
          <span>
            Personal Worker Portal locked to{' '}
            <strong className="text-[#252A27]">
              {workerName} ({workerCode})
            </strong>
            . Other workers&apos; attendance and salary records are isolated.
          </span>
        </div>
        <Badge variant="blue">Self-Service Only</Badge>
      </div>
    </div>
  );
}

export function WorkerDashboardPage() {
  const {
    worker,
    resolved,
    summary,
    projectMap,
    myAttendance,
    myPayments,
    weeklyPeriods,
    blockedCrossWorkerAttempt,
    requestedUrlWorkerId,
    clearTamperedParam,
  } = useWorkerSelfData();

  const currentWeek = weeklyPeriods[0];
  const latestPayment = myPayments[0];
  const latestAttendance = myAttendance[0];
  const recentWorkSite = latestAttendance
    ? projectMap.get(latestAttendance.projectId)
    : projectMap.get(worker.assignedProjectId);

  // Next assigned work site (usual primary site or secondary assigned project)
  const nextAssignedProjectId =
    worker.assignedProjectIds?.find((id) => id !== latestAttendance?.projectId) ??
    worker.assignedProjectId;
  const nextAssignedSite = projectMap.get(nextAssignedProjectId);

  const currentWeekDays = [
    { date: '2026-11-23', dayLabel: 'Mon 23 Nov' },
    { date: '2026-11-24', dayLabel: 'Tue 24 Nov' },
    { date: '2026-11-25', dayLabel: 'Wed 25 Nov (Today)' },
    { date: '2026-11-26', dayLabel: 'Thu 26 Nov' },
    { date: '2026-11-27', dayLabel: 'Fri 27 Nov' },
    { date: '2026-11-28', dayLabel: 'Sat 28 Nov' },
  ];

  return (
    <PageContainer>
      <PageHeader
        title={`Welcome, ${worker.name}`}
        description={`${worker.workerCode} · ${worker.role} · Daily Rate ${formatINR(resolved.dailySalary)} (${
          resolved.source === 'individual_override'
            ? 'Individual override'
            : 'Role default'
        })`}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link to="/worker/attendance">
                <CalendarCheck2 className="h-3.5 w-3.5" />
                <span>My Attendance</span>
              </Link>
            </Button>
            <Button size="sm" asChild>
              <Link to="/worker/statements">
                <FileText className="h-3.5 w-3.5" />
                <span>Wage Statement</span>
              </Link>
            </Button>
          </div>
        }
      />

      <SelfScopeGuardBanner
        workerName={worker.name}
        workerCode={worker.workerCode}
        blockedCrossWorkerAttempt={blockedCrossWorkerAttempt}
        requestedUrlWorkerId={requestedUrlWorkerId}
        onDismiss={clearTamperedParam}
      />

      {/* Trustworthy Personal Wage & Attendance Ledger Strip */}
      <section className="mb-6 rounded-[6px] border border-[#D8D1C5] bg-[#FFFFFF]">
        <div className="grid grid-cols-1 divide-y divide-[#E6E0D5] sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-5 lg:divide-x">
          <div className="p-4">
            <p className="arch-label">This Week&apos;s Days</p>
            <p className="mt-1.5 font-mono text-2xl font-semibold text-[#252A27] tabular-nums">
              {currentWeek.records.length}d{' '}
              <span className="text-sm font-normal text-[#77766F]">
                ({currentWeek.totalUnits}u)
              </span>
            </p>
            <p className="mt-1 font-mono text-[11px] text-[#77766F]">
              23 Nov – 29 Nov 2026
            </p>
          </div>

          <div className="p-4 sm:border-l sm:border-[#E6E0D5] lg:border-l-0">
            <p className="arch-label">Total Units Logged</p>
            <p className="mt-1.5 font-mono text-2xl font-semibold text-[#252A27] tabular-nums">
              {summary.totalUnits} units
            </p>
            <p className="mt-1 text-xs text-[#77766F] tabular-nums">
              {summary.longShiftDays} long (1.5x) · {summary.halfDays} half (0.5x)
            </p>
          </div>

          <div className="p-4 border-t border-[#E6E0D5] lg:border-t-0">
            <p className="arch-label">This Week&apos;s Earnings</p>
            <p className="mt-1.5 font-mono text-2xl font-semibold text-[#A65229] tabular-nums">
              {formatINR(currentWeek.grossEarnings)}
            </p>
            <p className="mt-1 text-xs text-[#77766F] tabular-nums">
              Reg {formatINR(currentWeek.regularEarnings)} + Long{' '}
              {formatINR(currentWeek.longShiftEarnings)}
            </p>
          </div>

          <div className="p-4 border-t border-[#E6E0D5] sm:border-l lg:border-t-0 lg:border-l-0">
            <p className="arch-label">Paid Wages</p>
            <p className="mt-1.5 font-mono text-2xl font-semibold text-[#4A543E] tabular-nums">
              {formatINR(summary.totalPaid)}
            </p>
            <p className="mt-1 text-xs text-[#77766F] tabular-nums">
              Gross earned: {formatINR(summary.grossWages)}
            </p>
          </div>

          <div className="p-4 border-t border-[#E6E0D5] sm:col-span-2 lg:col-span-1 lg:border-t-0 bg-[#FAF8F3]">
            <p className="arch-label">Pending Balance</p>
            <p className="mt-1.5 font-mono text-2xl font-semibold text-[#A65229] tabular-nums">
              {formatINR(summary.netPayable)}
            </p>
            <p className="mt-1 text-xs text-[#77766F] tabular-nums">
              After {formatINR(summary.approvedAdvances)} advances/deductions
            </p>
          </div>
        </div>
      </section>

      {/* Current Week Day-by-Day Strip */}
      <Card className="mb-5">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <div>
            <p className="arch-label mb-1">Active Pay Week</p>
            <CardTitle>Current Week&apos;s Attendance (23 Nov – 28 Nov 2026)</CardTitle>
            <CardDescription>
              Daily shift log, attendance units, and calculated wages for the active week
            </CardDescription>
          </div>
          <Badge variant="blue">{currentWeek.totalUnits} Units Logged This Week</Badge>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6">
            {currentWeekDays.map((day) => {
              const entries = currentWeek.records.filter((r) => r.date === day.date);
              const primary = entries[0];
              const dayUnits = entries.reduce((s, r) => s + (r.attendanceUnits ?? 0), 0);
              const dayWage = entries.reduce((s, r) => s + (r.calculatedWage ?? 0), 0);

              return (
                <div
                  key={day.date}
                  className={`rounded-[4px] border p-3 text-xs ${
                    primary
                      ? 'border-[#E7C4B3] bg-[#FBF1EC]/55'
                      : 'border-[#E6E0D5] bg-[#FAF8F3]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-semibold text-[#252A27]">{day.dayLabel}</span>
                    {primary ? (
                      <Badge variant={getPaymentStatusVariant(primary.status)}>
                        {primary.status}
                      </Badge>
                    ) : (
                      <Badge variant="neutral">Scheduled</Badge>
                    )}
                  </div>
                  {primary ? (
                    <div className="mt-2 space-y-1">
                      <p className="font-medium text-slate-900 truncate">
                        {projectMap.get(primary.projectId)?.name}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {primary.shiftName} ({primary.startTime}–{primary.endTime})
                      </p>
                      <div className="flex items-center justify-between pt-1 border-t border-slate-200/80 font-mono">
                        <span className="text-slate-600">{dayUnits}u</span>
                        <span className="font-semibold text-slate-900">
                          {formatINR(dayWage)}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <p className="mt-3 text-[11px] text-slate-400">
                      Upcoming work day · Usual shift 09:00–18:00
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Recent Payment, Recent Work Site & Next Assigned Work Site Cards */}
      <div className="mb-5 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Recent Payment
            </span>
            <CreditCard className="h-4 w-4 text-emerald-600" />
          </div>
          {latestPayment ? (
            <>
              <div>
                <p className="font-mono text-2xl font-bold text-emerald-700 tabular-nums">
                  {formatINR(latestPayment.amount)}
                </p>
                <p className="mt-0.5 text-xs text-slate-600">
                  {latestPayment.periodLabel}
                </p>
              </div>
              <div className="rounded-md bg-slate-50 p-2.5 text-xs text-slate-600 space-y-1">
                <div className="flex justify-between">
                  <span>Paid Date:</span>
                  <span className="font-medium text-slate-900 tabular-nums">
                    {formatIndianDate(latestPayment.date)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Method &amp; Ref:</span>
                  <span className="font-mono text-slate-900">
                    {latestPayment.mode} · {latestPayment.referenceNo}
                  </span>
                </div>
              </div>
            </>
          ) : (
            <p className="text-xs text-slate-500">No payments disbursed yet.</p>
          )}
          <Button variant="outline" size="sm" className="w-full" asChild>
            <Link to="/worker/payments">View Payment History</Link>
          </Button>
        </Card>

        <Card className="p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Recent Work Site
            </span>
            <MapPin className="h-4 w-4 text-[#A65229]" />
          </div>
          {recentWorkSite ? (
            <>
              <div>
                <p className="text-base font-semibold text-slate-900">
                  {recentWorkSite.name}
                </p>
                <p className="mt-0.5 text-xs text-slate-500">
                  {recentWorkSite.siteAddress}
                </p>
              </div>
              <div className="rounded-md bg-slate-50 p-2.5 text-xs text-slate-600 space-y-1">
                <div className="flex justify-between">
                  <span>Last Worked:</span>
                  <span className="font-medium text-slate-900 tabular-nums">
                    {latestAttendance
                      ? formatIndianDate(latestAttendance.date)
                      : 'Today'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Site Supervisor:</span>
                  <span className="font-medium text-slate-900">
                    {recentWorkSite.siteManager}
                  </span>
                </div>
              </div>
            </>
          ) : null}
          <Button variant="outline" size="sm" className="w-full" asChild>
            <Link to="/worker/sites">View All My Sites</Link>
          </Button>
        </Card>

        <Card className="p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Next Assigned Work Site
            </span>
            <Building2 className="h-4 w-4 text-amber-600" />
          </div>
          {nextAssignedSite ? (
            <>
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-base font-semibold text-slate-900">
                    {nextAssignedSite.name}
                  </p>
                  <Badge variant="blue">Assigned</Badge>
                </div>
                <p className="mt-0.5 text-xs text-slate-500">
                  {nextAssignedSite.siteAddress}
                </p>
              </div>
              <div className="rounded-md bg-slate-50 p-2.5 text-xs text-slate-600 space-y-1">
                <div className="flex justify-between">
                  <span>Next Shift:</span>
                  <span className="font-mono font-medium text-slate-900">
                    Thu 26 Nov · 09:00 – 18:00
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Reporting To:</span>
                  <span className="font-medium text-slate-900">
                    {nextAssignedSite.siteManager}
                  </span>
                </div>
              </div>
            </>
          ) : (
            <p className="text-xs text-slate-500">No upcoming site transfer scheduled.</p>
          )}
          <Button variant="outline" size="sm" className="w-full" asChild>
            <Link to="/worker/salary">View My Shift Rates</Link>
          </Button>
        </Card>
      </div>
    </PageContainer>
  );
}

export function WorkerAttendancePage() {
  const {
    worker,
    myAttendance,
    projectMap,
    blockedCrossWorkerAttempt,
    requestedUrlWorkerId,
    clearTamperedParam,
  } = useWorkerSelfData();

  const [fromDate, setFromDate] = useState('2026-11-16');
  const [toDate, setToDate] = useState('2026-11-25');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [viewState, setViewState] = useState<'ready' | 'loading' | 'error'>('ready');

  const filteredRecords = useMemo(() => {
    return myAttendance.filter((rec) => {
      if (fromDate && rec.date < fromDate) return false;
      if (toDate && rec.date > toDate) return false;
      if (statusFilter !== 'ALL' && rec.status !== statusFilter) return false;
      return true;
    });
  }, [myAttendance, fromDate, toDate, statusFilter]);

  const filteredUnits = useMemo(
    () =>
      Math.round(
        filteredRecords.reduce((s, r) => s + (r.attendanceUnits ?? 0), 0) * 100,
      ) / 100,
    [filteredRecords],
  );

  const filteredEarnings = useMemo(
    () => filteredRecords.reduce((s, r) => s + (r.calculatedWage ?? 0), 0),
    [filteredRecords],
  );

  return (
    <PageContainer>
      <PageHeader
        title="My Attendance History"
        description="Date-filterable log of your daily site attendance, supervisor verification, shift hours, and calculated earnings."
        actions={
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setFromDate('2026-11-23');
                setToDate('2026-11-29');
              }}
            >
              This Week
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setFromDate('2026-11-01');
                setToDate('2026-11-30');
              }}
            >
              Full Month
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                setViewState((prev) => (prev === 'ready' ? 'loading' : 'ready'))
              }
              title="Toggle loading state preview"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
          </div>
        }
      />

      <SelfScopeGuardBanner
        workerName={worker.name}
        workerCode={worker.workerCode}
        blockedCrossWorkerAttempt={blockedCrossWorkerAttempt}
        requestedUrlWorkerId={requestedUrlWorkerId}
        onDismiss={clearTamperedParam}
      />

      {/* Filter Bar */}
      <Card className="mb-5 p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-3 space-y-1">
            <Label>From Date</Label>
            <Input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
            />
          </div>
          <div className="lg:col-span-3 space-y-1">
            <Label>To Date</Label>
            <Input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
            />
          </div>
          <div className="lg:col-span-3 space-y-1">
            <Label>Attendance Status</Label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Statuses</SelectItem>
                <SelectItem value="Present">Present</SelectItem>
                <SelectItem value="Half Day">Half Day</SelectItem>
                <SelectItem value="Pending verification">Pending verification</SelectItem>
                <SelectItem value="Leave">Leave</SelectItem>
                <SelectItem value="Absent">Absent</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="lg:col-span-3 flex items-center justify-between rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs">
            <div>
              <p className="text-slate-500">Filtered Period Total</p>
              <p className="font-mono font-semibold text-slate-900 tabular-nums">
                {filteredUnits}u · {formatINR(filteredEarnings)}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setFromDate('');
                setToDate('');
                setStatusFilter('ALL');
              }}
            >
              Reset
            </Button>
          </div>
        </div>
      </Card>

      {viewState === 'loading' ? (
        <LoadingState label="Syncing your verified site muster records..." />
      ) : viewState === 'error' ? (
        <ErrorState
          title="Could not load attendance history"
          message="Temporary connection issue while reading site attendance logs."
          onRetry={() => setViewState('ready')}
        />
      ) : filteredRecords.length === 0 ? (
        <EmptyState
          icon={Calendar}
          title="No attendance records match this date filter"
          description="Adjust the From/To date range or status filter to view your logged shifts."
          actionLabel="Show All Dates"
          onAction={() => {
            setFromDate('');
            setToDate('');
            setStatusFilter('ALL');
          }}
        />
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Work Date</TableHead>
                <TableHead>Project / Site Name</TableHead>
                <TableHead>Supervisor</TableHead>
                <TableHead>Attendance Status</TableHead>
                <TableHead>Shift Type</TableHead>
                <TableHead>Actual Start – End</TableHead>
                <TableHead className="text-right">Units</TableHead>
                <TableHead className="text-right">Multiplier</TableHead>
                <TableHead className="text-right">Calculated Earnings</TableHead>
                <TableHead>Verification Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRecords.map((rec) => {
                const proj = projectMap.get(rec.projectId);
                return (
                  <TableRow key={rec.id}>
                    <TableCell className="text-xs font-medium text-slate-900 tabular-nums whitespace-nowrap">
                      {formatIndianDate(rec.date)}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-slate-900">
                        {proj?.name ?? rec.projectId}
                      </div>
                      {rec.notes && (
                        <div className="text-[11px] text-slate-500">{rec.notes}</div>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-slate-600">
                      {rec.submittedBy ?? proj?.siteManager ?? 'Prakash Gowda'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getPaymentStatusVariant(rec.status)}>
                        {rec.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-slate-700">
                      {rec.shiftName ?? '—'}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-slate-600 tabular-nums whitespace-nowrap">
                      {rec.startTime && rec.endTime
                        ? `${rec.startTime} – ${rec.endTime}`
                        : '—'}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs font-medium text-slate-900 tabular-nums">
                      {rec.attendanceUnits ?? 0}u
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs font-semibold text-[#A65229] tabular-nums">
                      {rec.wageMultiplier ?? 0}x
                    </TableCell>
                    <TableCell className="text-right font-mono font-semibold text-slate-900 tabular-nums">
                      {formatINR(rec.calculatedWage ?? 0)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={getPaymentStatusVariant(
                          rec.submissionStatus ?? 'Submitted',
                        )}
                      >
                        {rec.submissionStatus ?? 'Submitted'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}
    </PageContainer>
  );
}

export function WorkerSalaryPage() {
  const {
    worker,
    resolved,
    weeklyPeriods,
    store,
    blockedCrossWorkerAttempt,
    requestedUrlWorkerId,
    clearTamperedParam,
  } = useWorkerSelfData();

  const normalShiftWage = Math.round(resolved.dailySalary * 1.0);
  const halfDayWage = Math.round(resolved.dailySalary * 0.5);
  const longShiftWage = Math.round(resolved.dailySalary * 1.5);
  const activeShifts = store.shiftRules.filter((r) => r.active);

  return (
    <PageContainer>
      <PageHeader
        title="My Salary & Shift Rates"
        description="Read-only view of your assigned trade role, daily salary basis, shift multipliers, and weekly wage summary."
      />

      <SelfScopeGuardBanner
        workerName={worker.name}
        workerCode={worker.workerCode}
        blockedCrossWorkerAttempt={blockedCrossWorkerAttempt}
        requestedUrlWorkerId={requestedUrlWorkerId}
        onDismiss={clearTamperedParam}
      />

      {/* Read-only Salary Rate Cards */}
      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-4">
          <p className="text-xs font-medium text-slate-500">Assigned Role</p>
          <p className="mt-1.5 text-lg font-semibold text-slate-900">
            {worker.role}
          </p>
          <div className="mt-1.5">
            <Badge
              variant={
                resolved.source === 'individual_override' ? 'blue' : 'neutral'
              }
            >
              {resolved.source === 'individual_override'
                ? 'Individual Override Rate'
                : 'Role Default Salary'}
            </Badge>
          </div>
        </Card>

        <Card className="p-4">
          <p className="text-xs font-medium text-slate-500">
            Normal-Day Wage (1.0x)
          </p>
          <p className="mt-1.5 font-mono text-2xl font-semibold text-slate-900 tabular-nums">
            {formatINR(normalShiftWage)}
          </p>
          <p className="mt-1 text-xs text-slate-500">09:00 – 18:00 (1.0 unit)</p>
        </Card>

        <Card className="p-4">
          <p className="text-xs font-medium text-slate-500">
            Half-Day Wage (0.5x)
          </p>
          <p className="mt-1.5 font-mono text-2xl font-semibold text-slate-900 tabular-nums">
            {formatINR(halfDayWage)}
          </p>
          <p className="mt-1 text-xs text-slate-500">Morning or Afternoon (0.5 unit)</p>
        </Card>

        <Card className="p-4">
          <p className="text-xs font-medium text-slate-500">
            Long-Shift Wage (1.5x)
          </p>
          <p className="mt-1.5 font-mono text-2xl font-semibold text-[#A65229] tabular-nums">
            {formatINR(longShiftWage)}
          </p>
          <p className="mt-1 text-xs text-slate-500">06:00 – 18:00 (1.5 units)</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        <Card className="lg:col-span-5 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-md bg-[#FBF1EC] text-[#A65229]">
                <IndianRupee className="h-5 w-5" />
              </span>
              <div>
                <p className="text-xs text-slate-500">Daily Base Salary</p>
                <p className="font-mono text-2xl font-bold text-slate-900 tabular-nums">
                  {formatINR(resolved.dailySalary)} / day
                </p>
              </div>
            </div>
            <Badge variant="neutral">
              <Lock className="h-3 w-3" />
              Read-Only
            </Badge>
          </div>

          <dl className="divide-y divide-slate-100 text-xs">
            <div className="flex justify-between py-2.5">
              <dt className="text-slate-500">Worker ID</dt>
              <dd className="font-mono font-medium text-slate-900">
                {worker.workerCode}
              </dd>
            </div>
            <div className="flex justify-between py-2.5">
              <dt className="text-slate-500">Role</dt>
              <dd className="font-medium text-slate-900">{worker.role}</dd>
            </div>
            <div className="flex justify-between py-2.5">
              <dt className="text-slate-500">Salary Configuration Source</dt>
              <dd className="font-medium text-slate-900">
                {resolved.source === 'individual_override'
                  ? `Individual Override (Role default: ${formatINR(resolved.roleDefaultSalary ?? 0)})`
                  : `Role Default (${formatINR(resolved.dailySalary)})`}
              </dd>
            </div>
            <div className="flex justify-between py-2.5">
              <dt className="text-slate-500">Normal-Day Wage (1.0x)</dt>
              <dd className="font-mono font-semibold text-slate-900">
                {formatINR(normalShiftWage)}
              </dd>
            </div>
            <div className="flex justify-between py-2.5">
              <dt className="text-slate-500">Half-Day Wage (0.5x)</dt>
              <dd className="font-mono font-semibold text-slate-900">
                {formatINR(halfDayWage)}
              </dd>
            </div>
            <div className="flex justify-between py-2.5">
              <dt className="text-slate-500">Long-Shift Wage (1.5x)</dt>
              <dd className="font-mono font-semibold text-[#A65229]">
                {formatINR(longShiftWage)}
              </dd>
            </div>
          </dl>

          <p className="rounded-md bg-slate-50 p-3 text-[11px] text-slate-500 leading-relaxed">
            Salary rates and shift multipliers are configured by the company Owner. Workers and supervisors cannot modify wage rates.
          </p>
        </Card>

        <div className="lg:col-span-7 space-y-5">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Shift Rules &amp; Payout Table</CardTitle>
              <CardDescription>
                Exact daily earnings calculated for your rate across company shift schedules
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Shift Type</TableHead>
                    <TableHead>Timings</TableHead>
                    <TableHead className="text-right">Units</TableHead>
                    <TableHead className="text-right">Multiplier</TableHead>
                    <TableHead className="text-right">Calculated Pay</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeShifts.map((rule) => {
                    const calc = calculateAttendanceWage({
                      worker,
                      roleWageConfigs: store.roleWageConfigs,
                      status: rule.wageMultiplier <= 0.5 ? 'Half Day' : 'Present',
                      shiftRule: rule,
                      shiftRules: store.shiftRules,
                    });
                    return (
                      <TableRow key={rule.id}>
                        <TableCell className="font-medium text-slate-900">
                          {rule.name}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-slate-600 tabular-nums">
                          {rule.startTime} – {rule.endTime}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs tabular-nums">
                          {rule.attendanceUnits}u
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs text-[#A65229] font-semibold">
                          {rule.wageMultiplier}x
                        </TableCell>
                        <TableCell className="text-right font-mono font-semibold text-slate-900 tabular-nums">
                          {formatINR(calc.calculatedWage)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Weekly Wage Summary</CardTitle>
              <CardDescription>
                Your week-by-week attendance units and calculated earnings breakdown
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Week Period</TableHead>
                    <TableHead className="text-right">Units</TableHead>
                    <TableHead className="text-right">Regular Pay</TableHead>
                    <TableHead className="text-right">Long-Shift Bonus</TableHead>
                    <TableHead className="text-right">Total Earned</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {weeklyPeriods.map((wp) => (
                    <TableRow key={wp.id}>
                      <TableCell className="text-xs font-medium text-slate-900">
                        {wp.weekLabel}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs tabular-nums">
                        {wp.totalUnits}u
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs tabular-nums">
                        {formatINR(wp.regularEarnings)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs text-[#A65229] tabular-nums">
                        {formatINR(wp.longShiftEarnings)}
                      </TableCell>
                      <TableCell className="text-right font-mono font-semibold text-slate-900 tabular-nums">
                        {formatINR(wp.grossEarnings)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    </PageContainer>
  );
}

export function WorkerSitesPage() {
  const {
    worker,
    myAttendance,
    store,
    blockedCrossWorkerAttempt,
    requestedUrlWorkerId,
    clearTamperedParam,
  } = useWorkerSelfData();
  const siteIds = Array.from(
    new Set([
      worker.assignedProjectId,
      ...(worker.assignedProjectIds ?? []),
      ...myAttendance.map((a) => a.projectId),
    ]),
  );
  const sites = store.projects.filter((p) => siteIds.includes(p.id));

  return (
    <PageContainer>
      <PageHeader
        title="My Work Sites"
        description="Residential construction sites where you are assigned or have logged shift attendance."
      />
      <SelfScopeGuardBanner
        workerName={worker.name}
        workerCode={worker.workerCode}
        blockedCrossWorkerAttempt={blockedCrossWorkerAttempt}
        requestedUrlWorkerId={requestedUrlWorkerId}
        onDismiss={clearTamperedParam}
      />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {sites.map((site) => {
          const siteEntries = myAttendance.filter((a) => a.projectId === site.id);
          const siteUnits =
            Math.round(
              siteEntries.reduce((s, a) => s + (a.attendanceUnits ?? 0), 0) * 100,
            ) / 100;
          const siteWages = siteEntries.reduce(
            (s, a) => s + (a.calculatedWage ?? 0),
            0,
          );
          return (
            <Card key={site.id} className="p-5 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-mono text-xs text-slate-500">{site.code}</p>
                  <h3 className="text-base font-semibold text-slate-900">
                    {site.name}
                  </h3>
                </div>
                {site.id === worker.assignedProjectId ? (
                  <Badge variant="blue">Primary Assigned Site</Badge>
                ) : (
                  <Badge variant="neutral">Secondary / Split Site</Badge>
                )}
              </div>
              <p className="text-xs text-slate-600 flex items-start gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-slate-400 mt-0.5 shrink-0" />
                <span>{site.siteAddress}</span>
              </p>
              <div className="grid grid-cols-3 gap-2 border-t border-slate-100 pt-3 text-xs">
                <div>
                  <p className="text-slate-500">Supervisor</p>
                  <p className="font-medium text-slate-900">{site.siteManager}</p>
                </div>
                <div>
                  <p className="text-slate-500">Units Logged</p>
                  <p className="font-mono font-semibold text-slate-900 tabular-nums">
                    {siteUnits}u
                  </p>
                </div>
                <div>
                  <p className="text-slate-500">Wages Earned</p>
                  <p className="font-mono font-semibold text-emerald-700 tabular-nums">
                    {formatINR(siteWages)}
                  </p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </PageContainer>
  );
}

export function WorkerPaymentHistoryPage() {
  const {
    worker,
    weeklyPeriods,
    myPayments,
    myAdvances,
    blockedCrossWorkerAttempt,
    requestedUrlWorkerId,
    clearTamperedParam,
  } = useWorkerSelfData();

  return (
    <PageContainer>
      <PageHeader
        title="My Payment History"
        description="Complete pay-period breakdown of regular earnings, long-shift earnings, advances, approved deductions, net payable, and disbursements."
      />

      <SelfScopeGuardBanner
        workerName={worker.name}
        workerCode={worker.workerCode}
        blockedCrossWorkerAttempt={blockedCrossWorkerAttempt}
        requestedUrlWorkerId={requestedUrlWorkerId}
        onDismiss={clearTamperedParam}
      />

      <div className="space-y-5">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Weekly Pay Period Ledger</CardTitle>
            <CardDescription>
              Reconciled weekly earnings, advances, approved deductions, and payment status
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Week / Pay Period</TableHead>
                  <TableHead className="text-right">Regular Earnings</TableHead>
                  <TableHead className="text-right">Long-Shift / OT</TableHead>
                  <TableHead className="text-right">Advances</TableHead>
                  <TableHead className="text-right">Approved Deductions</TableHead>
                  <TableHead className="text-right">Net Payable</TableHead>
                  <TableHead className="text-right">Amount Paid</TableHead>
                  <TableHead className="text-right">Remaining Balance</TableHead>
                  <TableHead>Payment Date</TableHead>
                  <TableHead>Method &amp; Ref</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {weeklyPeriods.map((period) => (
                  <TableRow key={period.id}>
                    <TableCell>
                      <div className="font-medium text-slate-900">
                        {period.weekLabel}
                      </div>
                      <div className="text-[11px] text-slate-500 tabular-nums">
                        {period.totalUnits} attendance units logged
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs tabular-nums">
                      {formatINR(period.regularEarnings)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs text-[#A65229] font-medium tabular-nums">
                      {formatINR(period.longShiftEarnings)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs text-amber-800 tabular-nums">
                      {period.advancesAmount > 0
                        ? `-${formatINR(period.advancesAmount)}`
                        : '₹0'}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs text-amber-800 tabular-nums">
                      {period.approvedDeductionsAmount > 0
                        ? `-${formatINR(period.approvedDeductionsAmount)}`
                        : '₹0'}
                    </TableCell>
                    <TableCell className="text-right font-mono font-semibold text-slate-900 tabular-nums">
                      {formatINR(period.netPayable)}
                    </TableCell>
                    <TableCell className="text-right font-mono font-semibold text-emerald-700 tabular-nums">
                      {formatINR(period.amountPaid)}
                    </TableCell>
                    <TableCell className="text-right font-mono font-semibold text-amber-700 tabular-nums">
                      {formatINR(period.remainingBalance)}
                    </TableCell>
                    <TableCell className="text-xs tabular-nums whitespace-nowrap">
                      {period.paymentDate
                        ? formatIndianDate(period.paymentDate)
                        : '—'}
                    </TableCell>
                    <TableCell className="text-xs text-slate-600">
                      {period.paymentMethod ? (
                        <div>
                          <span className="font-medium text-slate-800">
                            {period.paymentMethod}
                          </span>
                          <div className="font-mono text-[11px] text-slate-500">
                            {period.paymentReference}
                          </div>
                        </div>
                      ) : (
                        '—'
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getPaymentStatusVariant(period.paymentStatus)}>
                        {period.paymentStatus}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Individual Payment Transactions</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {myPayments.length === 0 ? (
                <div className="p-5">
                  <EmptyState
                    icon={CreditCard}
                    title="No wage payouts recorded yet"
                    description="Settled weekly wage payments will appear here."
                  />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Payment Date</TableHead>
                      <TableHead>Pay Period</TableHead>
                      <TableHead>Method &amp; Reference</TableHead>
                      <TableHead className="text-right">Amount Paid</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {myPayments.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="text-xs tabular-nums">
                          {formatIndianDate(p.date)}
                        </TableCell>
                        <TableCell className="text-xs font-medium text-slate-800">
                          {p.periodLabel}
                        </TableCell>
                        <TableCell className="text-xs text-slate-600">
                          {p.mode} · <span className="font-mono">{p.referenceNo}</span>
                        </TableCell>
                        <TableCell className="text-right font-mono font-semibold text-emerald-700 tabular-nums">
                          {formatINR(p.amount)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Advances &amp; Approved Deductions</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {myAdvances.length === 0 ? (
                <div className="p-5 text-xs text-slate-500">
                  No advances or deductions recorded.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Type &amp; Reason</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {myAdvances.map((adv) => (
                      <TableRow key={adv.id}>
                        <TableCell className="text-xs tabular-nums">
                          {formatIndianDate(adv.date)}
                        </TableCell>
                        <TableCell className="text-xs text-slate-700">
                          <div>{adv.reason}</div>
                          <Badge variant="amber" className="mt-1">
                            {adv.reason.toLowerCase().includes('deduction')
                              ? 'Approved Deduction'
                              : 'Wage Advance'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono font-semibold text-amber-800 tabular-nums">
                          -{formatINR(adv.amount)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </PageContainer>
  );
}

export function WorkerStatementsPage() {
  const {
    worker,
    resolved,
    projectMap,
    weeklyPeriods,
    blockedCrossWorkerAttempt,
    requestedUrlWorkerId,
    clearTamperedParam,
  } = useWorkerSelfData();

  const [selectedPeriodId, setSelectedPeriodId] = useState<string>('ALL');

  const selectedPeriod = useMemo(() => {
    if (selectedPeriodId === 'ALL') {
      const allRecords = weeklyPeriods.flatMap((p) => p.records);
      const totalUnits =
        Math.round(
          weeklyPeriods.reduce((s, p) => s + p.totalUnits, 0) * 100,
        ) / 100;
      const regularEarnings = weeklyPeriods.reduce(
        (s, p) => s + p.regularEarnings,
        0,
      );
      const longShiftEarnings = weeklyPeriods.reduce(
        (s, p) => s + p.longShiftEarnings,
        0,
      );
      const grossEarnings = regularEarnings + longShiftEarnings;
      const advancesAmount = weeklyPeriods.reduce((s, p) => s + p.advancesAmount, 0);
      const approvedDeductionsAmount = weeklyPeriods.reduce(
        (s, p) => s + p.approvedDeductionsAmount,
        0,
      );
      const netPayable = Math.max(
        0,
        grossEarnings - advancesAmount - approvedDeductionsAmount,
      );
      const amountPaid = weeklyPeriods.reduce((s, p) => s + p.amountPaid, 0);
      const remainingBalance = Math.max(0, netPayable - amountPaid);

      return {
        weekLabel: 'Consolidated November 2026 Cycle (16 Nov – 29 Nov 2026)',
        records: allRecords,
        totalUnits,
        regularEarnings,
        longShiftEarnings,
        grossEarnings,
        advancesAmount,
        approvedDeductionsAmount,
        netPayable,
        amountPaid,
        remainingBalance,
      };
    }
    return (
      weeklyPeriods.find((p) => p.id === selectedPeriodId) ?? weeklyPeriods[0]
    );
  }, [selectedPeriodId, weeklyPeriods]);

  const primarySite = projectMap.get(worker.assignedProjectId)?.name ?? 'Site';

  return (
    <PageContainer>
      <PageHeader
        title="Printable Worker Wage Statement"
        description="Official daily attendance breakdown, calculated wages, advances, deductions, paid amount, and balance due."
        actions={
          <div className="flex items-center gap-2">
            <div className="w-[260px]">
              <Select
                value={selectedPeriodId}
                onValueChange={setSelectedPeriodId}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">
                    Full Nov 2026 Cycle (16–29 Nov)
                  </SelectItem>
                  {weeklyPeriods.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.weekLabel}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button size="sm" onClick={() => window.print()}>
              <Printer className="h-3.5 w-3.5" />
              <span>Print Statement</span>
            </Button>
          </div>
        }
      />

      <SelfScopeGuardBanner
        workerName={worker.name}
        workerCode={worker.workerCode}
        blockedCrossWorkerAttempt={blockedCrossWorkerAttempt}
        requestedUrlWorkerId={requestedUrlWorkerId}
        onDismiss={clearTamperedParam}
      />

      <Card className="max-w-4xl">
        <CardContent className="p-6 space-y-6 text-sm">
          {/* Statement Header */}
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-[#A65229]">
                BuildFlow · Menon Civil &amp; Homes
              </p>
              <h2 className="mt-0.5 text-lg font-bold text-[#252A27]">
                Worker Wage &amp; Muster Statement
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Statement Period: <strong className="text-slate-800">{selectedPeriod.weekLabel}</strong>
              </p>
            </div>
            <div className="text-right text-xs space-y-0.5">
              <p className="text-sm font-bold text-slate-900">{worker.name}</p>
              <p className="font-mono text-slate-600">
                ID: {worker.workerCode} · Role: {worker.role}
              </p>
              <p className="text-slate-500">
                Daily Rate: {formatINR(resolved.dailySalary)} (
                {resolved.source === 'individual_override'
                  ? 'Individual Override'
                  : 'Role Default'}
                )
              </p>
              <p className="text-slate-500">Primary Site: {primarySite}</p>
            </div>
          </div>

          {/* Summary KPI Row */}
          <div className="grid grid-cols-2 gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 sm:grid-cols-5 text-xs">
            <div>
              <p className="text-slate-500">Attendance Units</p>
              <p className="mt-1 font-mono text-base font-semibold text-slate-900 tabular-nums">
                {selectedPeriod.totalUnits} units
              </p>
            </div>
            <div>
              <p className="text-slate-500">Calculated Wages</p>
              <p className="mt-1 font-mono text-base font-semibold text-slate-900 tabular-nums">
                {formatINR(selectedPeriod.grossEarnings)}
              </p>
            </div>
            <div>
              <p className="text-slate-500">Advances &amp; Deductions</p>
              <p className="mt-1 font-mono text-base font-semibold text-amber-800 tabular-nums">
                -{formatINR(
                  selectedPeriod.advancesAmount +
                    selectedPeriod.approvedDeductionsAmount,
                )}
              </p>
            </div>
            <div>
              <p className="text-slate-500">Paid Amount</p>
              <p className="mt-1 font-mono text-base font-semibold text-emerald-700 tabular-nums">
                {formatINR(selectedPeriod.amountPaid)}
              </p>
            </div>
            <div>
              <p className="text-slate-500">Balance Payable</p>
              <p className="mt-1 font-mono text-base font-bold text-[#A65229] tabular-nums">
                {formatINR(selectedPeriod.remainingBalance)}
              </p>
            </div>
          </div>

          {/* Daily Attendance Breakdown Table */}
          <div>
            <h3 className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
              Daily Attendance Breakdown ({selectedPeriod.records.length} Entries)
            </h3>
            <div className="rounded-md border border-slate-200 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Work Site</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Shift &amp; Hours</TableHead>
                    <TableHead className="text-right">Units</TableHead>
                    <TableHead className="text-right">Mult</TableHead>
                    <TableHead className="text-right">Calculated Wage</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedPeriod.records.map((rec) => (
                    <TableRow key={rec.id}>
                      <TableCell className="text-xs tabular-nums">
                        {formatIndianDate(rec.date)}
                      </TableCell>
                      <TableCell className="text-xs font-medium text-slate-900">
                        {projectMap.get(rec.projectId)?.name ?? rec.projectId}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getPaymentStatusVariant(rec.status)}>
                          {rec.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-slate-600">
                        {rec.shiftName ?? '—'}{' '}
                        {rec.startTime && rec.endTime
                          ? `(${rec.startTime}–${rec.endTime})`
                          : ''}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs tabular-nums">
                        {rec.attendanceUnits ?? 0}u
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs text-[#A65229] tabular-nums">
                        {rec.wageMultiplier ?? 0}x
                      </TableCell>
                      <TableCell className="text-right font-mono font-semibold text-slate-900 tabular-nums">
                        {formatINR(rec.calculatedWage ?? 0)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Financial Reconciliation Block */}
          <div className="space-y-2.5 border-t border-slate-200 pt-4 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-600">
                Regular Shift Wages (1.0x &amp; 0.5x shifts)
              </span>
              <span className="font-mono font-medium text-slate-900 tabular-nums">
                {formatINR(selectedPeriod.regularEarnings)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">
                Long-Shift / Overtime Premium (06:00–18:00 at 1.5x)
              </span>
              <span className="font-mono font-medium text-[#A65229] tabular-nums">
                {formatINR(selectedPeriod.longShiftEarnings)}
              </span>
            </div>
            <div className="flex justify-between border-t border-slate-100 pt-2 font-medium">
              <span className="text-slate-800">
                Total Gross Calculated Wages ({selectedPeriod.totalUnits} units)
              </span>
              <span className="font-mono text-slate-900 tabular-nums">
                {formatINR(selectedPeriod.grossEarnings)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Less: Cash / UPI Advances</span>
              <span className="font-mono font-medium text-amber-800 tabular-nums">
                -{formatINR(selectedPeriod.advancesAmount)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Less: Approved Deductions</span>
              <span className="font-mono font-medium text-amber-800 tabular-nums">
                -{formatINR(selectedPeriod.approvedDeductionsAmount)}
              </span>
            </div>
            <div className="flex justify-between border-t border-slate-100 pt-2 font-medium">
              <span className="text-slate-800">Net Payable for Period</span>
              <span className="font-mono text-slate-900 tabular-nums">
                {formatINR(selectedPeriod.netPayable)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Less: Amount Paid</span>
              <span className="font-mono font-medium text-emerald-700 tabular-nums">
                -{formatINR(selectedPeriod.amountPaid)}
              </span>
            </div>
            <div className="flex justify-between border-t border-slate-200 pt-3 text-sm font-bold">
              <span className="text-slate-900">Closing Balance Due to Worker</span>
              <span className="font-mono text-[#A65229] tabular-nums">
                {formatINR(selectedPeriod.remainingBalance)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </PageContainer>
  );
}
