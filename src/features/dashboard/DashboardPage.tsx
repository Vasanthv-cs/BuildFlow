import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowUpRight,
  CalendarClock,
  ClipboardCheck,
  CreditCard,
  FileCheck2,
  HardHat,
  Package,
  Receipt,
  Truck,
  Wallet,
} from 'lucide-react';
import { useAuth } from '@/src/context/AuthContext';
import { useBuildFlow } from '@/src/context/BuildFlowContext';
import { getProjectCoverImage } from '@/src/data/projectVisuals';
import {
  formatArea,
  formatIndianDate,
  formatINR,
  isWithinDays,
} from '@/src/lib/utils';
import type { DateRangeFilter } from '@/src/types';
import { PageContainer } from '@/src/components/layout/PageContainer';
import {
  Badge,
  getProjectStatusVariant,
} from '@/src/components/ui/badge';
import { Button } from '@/src/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/src/components/ui/card';
import { EmptyState, ProgressBar } from '@/src/components/ui/feedback';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/src/components/ui/select';
import { FinancialCharts } from './components/FinancialCharts';

type AlertCategory =
  | 'all'
  | 'approvals'
  | 'payments'
  | 'milestones'
  | 'stock'
  | 'suppliers';

const DATE_RANGE_DAYS: Record<DateRangeFilter, number | null> = {
  all: null,
  '30d': 30,
  '90d': 90,
  '180d': 180,
};

export function DashboardPage() {
  const { currentUser } = useAuth();
  const {
    projects,
    payments,
    expenses,
    materials,
    deliveries,
    milestones,
    activities,
    workers,
    attendanceRecords,
    progressReports,
    siteUploads,
  } = useBuildFlow();

  const [selectedProjectId, setSelectedProjectId] = useState<string>('all');
  const [dateRange, setDateRange] = useState<DateRangeFilter>('all');
  const [alertTab, setAlertTab] = useState<AlertCategory>('all');

  const firstName = currentUser?.fullName.split(' ')[0] ?? 'Vikram';

  const projectMap = useMemo(
    () => new Map(projects.map((p) => [p.id, p])),
    [projects]
  );

  const filteredProjects = useMemo(() => {
    if (selectedProjectId === 'all') return projects;
    return projects.filter((p) => p.id === selectedProjectId);
  }, [projects, selectedProjectId]);

  const filteredPayments = useMemo(() => {
    const days = DATE_RANGE_DAYS[dateRange];
    return payments.filter((p) => {
      if (selectedProjectId !== 'all' && p.projectId !== selectedProjectId) {
        return false;
      }
      if (days !== null) {
        const refDate = p.paidDate ?? p.dueDate;
        return isWithinDays(refDate, days);
      }
      return true;
    });
  }, [payments, selectedProjectId, dateRange]);

  const filteredExpenses = useMemo(() => {
    const days = DATE_RANGE_DAYS[dateRange];
    return expenses.filter((e) => {
      if (selectedProjectId !== 'all' && e.projectId !== selectedProjectId) {
        return false;
      }
      if (days !== null) {
        return isWithinDays(e.date, days);
      }
      return true;
    });
  }, [expenses, selectedProjectId, dateRange]);

  const filteredActivities = useMemo(() => {
    const days = DATE_RANGE_DAYS[dateRange];
    return activities.filter((a) => {
      if (selectedProjectId !== 'all' && a.projectId !== selectedProjectId) {
        return false;
      }
      if (days !== null) {
        return isWithinDays(a.date, days);
      }
      return true;
    });
  }, [activities, selectedProjectId, dateRange]);

  // Derived Financial Summary
  const kpis = useMemo(() => {
    const activeProjects = filteredProjects.filter(
      (p) => p.status === 'In Progress' || p.status === 'Planning'
    );
    const totalSqFt = activeProjects.reduce(
      (sum, p) => sum + p.builtUpAreaSqFt,
      0
    );
    const totalContractValue = filteredProjects.reduce(
      (sum, p) => sum + p.contractValue,
      0
    );
    const paymentsReceived = filteredPayments
      .filter((p) => p.status === 'Received')
      .reduce((sum, p) => sum + p.amount, 0);

    const paymentsPending = filteredPayments
      .filter((p) => p.status !== 'Received')
      .reduce((sum, p) => sum + p.amount, 0);

    const overdueCount = filteredPayments.filter(
      (p) => p.status === 'Overdue'
    ).length;

    const totalExpenses = filteredExpenses.reduce(
      (sum, e) => sum + e.amount,
      0
    );

    const unpaidSupplierBills = filteredExpenses.filter(
      (e) => e.amount - e.paidAmount > 0
    );
    const supplierPending = unpaidSupplierBills.reduce(
      (sum, e) => sum + (e.amount - e.paidAmount),
      0
    );

    const collectionPct =
      totalContractValue > 0
        ? Math.round((paymentsReceived / totalContractValue) * 100)
        : 0;

    return {
      activeProjectsCount: activeProjects.length,
      totalProjectsCount: filteredProjects.length,
      totalSqFt,
      totalContractValue,
      paymentsReceived,
      collectionPct,
      paymentsPending,
      overdueCount,
      totalExpenses,
      expenseCount: filteredExpenses.length,
      supplierPending,
      unpaidSupplierCount: unpaidSupplierBills.length,
    };
  }, [filteredProjects, filteredPayments, filteredExpenses]);

  // Priority Action Queue (Approvals, Overdue, Milestones, Stock, Suppliers)
  const alerts = useMemo(() => {
    const projectFilter = (pid: string) =>
      selectedProjectId === 'all' || pid === selectedProjectId;

    const pendingReports = progressReports
      .filter((r) => projectFilter(r.projectId) && r.reviewStatus === 'Submitted')
      .map((r) => ({
        id: `alert-rep-${r.id}`,
        category: 'approvals' as const,
        severity: 'amber' as const,
        projectId: r.projectId,
        projectName: projectMap.get(r.projectId)?.name ?? 'Site',
        title: `Approve weekly report: ${r.stage}`,
        detail: `Submitted by ${r.submittedBy} · +${r.completionDeltaPercent}% claimed progress`,
        meta: formatIndianDate(r.reportDate),
        linkTo: `/projects/${r.projectId}`,
      }));

    const pendingUploads = siteUploads
      .filter((u) => projectFilter(u.projectId) && u.reviewStatus === 'Submitted')
      .map((u) => ({
        id: `alert-upl-${u.id}`,
        category: 'approvals' as const,
        severity: 'amber' as const,
        projectId: u.projectId,
        projectName: projectMap.get(u.projectId)?.name ?? 'Site',
        title: `Review upload: ${u.title}`,
        detail: `${u.category} · ${u.uploadedBy}${u.billAmount ? ` · ${formatINR(u.billAmount)}` : ''}`,
        meta: formatIndianDate(u.uploadDate),
        linkTo: `/projects/${u.projectId}`,
      }));

    const approvals = [...pendingReports, ...pendingUploads];

    const overduePayments = payments
      .filter((p) => projectFilter(p.projectId) && p.status === 'Overdue')
      .map((p) => ({
        id: `alert-pay-${p.id}`,
        category: 'payments' as const,
        severity: 'red' as const,
        projectId: p.projectId,
        projectName: projectMap.get(p.projectId)?.name ?? 'Site',
        title: `Overdue invoice ${p.invoiceNumber} — ${formatINR(p.amount)}`,
        detail: `${p.customerName} · ${p.stage}`,
        meta: `Due ${formatIndianDate(p.dueDate)}`,
        linkTo: `/projects/${p.projectId}`,
      }));

    const delayedMilestones = milestones
      .filter((m) => projectFilter(m.projectId) && m.status === 'Delayed')
      .map((m) => ({
        id: `alert-ms-${m.id}`,
        category: 'milestones' as const,
        severity: 'red' as const,
        projectId: m.projectId,
        projectName: projectMap.get(m.projectId)?.name ?? 'Site',
        title: `Delayed milestone: ${m.title}`,
        detail: m.notes ?? 'Behind scheduled site completion window.',
        meta: `Target ${formatIndianDate(m.plannedDate)}`,
        linkTo: `/projects/${m.projectId}`,
      }));

    const lowStock = materials
      .filter((m) => projectFilter(m.projectId) && m.currentStock < m.reorderLevel)
      .map((m) => ({
        id: `alert-stock-${m.id}`,
        category: 'stock' as const,
        severity: 'amber' as const,
        projectId: m.projectId,
        projectName: projectMap.get(m.projectId)?.name ?? 'Site',
        title: `Low stock: ${m.name}`,
        detail: `${m.currentStock} ${m.unit} remaining (reorder ${m.reorderLevel} ${m.unit})`,
        meta: `Updated ${formatIndianDate(m.lastUpdated)}`,
        linkTo: `/projects/${m.projectId}`,
      }));

    const pendingSupplierBills = expenses
      .filter((e) => projectFilter(e.projectId) && e.amount - e.paidAmount > 0)
      .map((e) => ({
        id: `alert-sup-${e.id}`,
        category: 'suppliers' as const,
        severity: 'amber' as const,
        projectId: e.projectId,
        projectName: projectMap.get(e.projectId)?.name ?? 'Site',
        title: `Supplier bill pending: ${e.vendorName}`,
        detail: `${formatINR(e.amount - e.paidAmount)} balance on ${e.billNumber}`,
        meta: `Billed ${formatIndianDate(e.date)}`,
        linkTo: `/projects/${e.projectId}`,
      }));

    return {
      all: [
        ...overduePayments,
        ...delayedMilestones,
        ...approvals,
        ...lowStock,
        ...pendingSupplierBills,
      ],
      approvals,
      payments: overduePayments,
      milestones: delayedMilestones,
      stock: lowStock,
      suppliers: pendingSupplierBills,
    };
  }, [
    materials,
    payments,
    expenses,
    milestones,
    progressReports,
    siteUploads,
    selectedProjectId,
    projectMap,
  ]);

  const activeAlerts = alerts[alertTab];

  // Workforce attendance & weekly wage summary
  const workforceStats = useMemo(() => {
    const projectFilter = (pid: string) =>
      selectedProjectId === 'all' || pid === selectedProjectId;
    const scopedWorkers = workers.filter((w) => projectFilter(w.assignedProjectId));
    const presentWorkers = scopedWorkers.filter(
      (w) => w.attendanceToday === 'Present' || w.attendanceToday === 'Half Day'
    ).length;
    const pendingWagesTotal = scopedWorkers.reduce(
      (sum, w) => sum + Math.max(0, w.pendingWages),
      0
    );
    const weeklyPayrollEstimate = scopedWorkers.reduce(
      (sum, w) => sum + (w.individualDailySalary ?? w.dailyWage) * 6,
      0
    );
    const pendingAttendanceCount = attendanceRecords.filter(
      (r) =>
        projectFilter(r.projectId) &&
        r.submissionStatus !== 'Verified'
    ).length;
    const pendingDeliveries = deliveries.filter(
      (d) => projectFilter(d.projectId) && d.status !== 'Delivered'
    );

    return {
      totalWorkers: scopedWorkers.length,
      presentWorkers,
      pendingWagesTotal,
      weeklyPayrollEstimate,
      pendingAttendanceCount,
      pendingDeliveriesCount: pendingDeliveries.length,
      delayedDeliveriesCount: pendingDeliveries.filter(
        (d) => d.status === 'Delayed'
      ).length,
    };
  }, [workers, attendanceRecords, deliveries, selectedProjectId]);

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'payment_received':
        return CreditCard;
      case 'material_purchase':
        return Package;
      case 'expense_recorded':
        return Receipt;
      case 'progress_report':
      default:
        return ClipboardCheck;
    }
  };

  return (
    <PageContainer>
      {/* 1. Editorial Welcome Header with Current Date & Scope Filters */}
      <header className="mb-7 flex flex-col gap-4 border-b border-[#D8D1C5] pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="font-mono text-[11px] font-medium uppercase tracking-[0.12em] text-[#77766F]">
            Wednesday, 25 November 2026 · Fieldwork Operations Ledger
          </p>
          <h1 className="mt-1.5 text-[28px] sm:text-[34px] font-semibold tracking-[-0.03em] text-[#252A27] leading-[1.12]">
            Good morning, {firstName}.
          </h1>
          <p className="mt-1.5 text-sm text-[#57564F]">
            {kpis.activeProjectsCount} active residential sites covering{' '}
            <span className="font-mono text-[#252A27] tabular-nums">
              {formatArea(kpis.totalSqFt)}
            </span>{' '}
            ·{' '}
            <span className="font-mono text-[#252A27] tabular-nums">
              {workforceStats.presentWorkers}/{workforceStats.totalWorkers}
            </span>{' '}
            crew checked in today.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <div className="w-[215px]">
            <Select
              value={selectedProjectId}
              onValueChange={setSelectedProjectId}
            >
              <SelectTrigger aria-label="Filter dashboard by project">
                <SelectValue placeholder="All Projects" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Projects ({projects.length})</SelectItem>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="w-[150px]">
            <Select
              value={dateRange}
              onValueChange={(v) => setDateRange(v as DateRangeFilter)}
            >
              <SelectTrigger aria-label="Filter dashboard by date range">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Dates</SelectItem>
                <SelectItem value="30d">Last 30 Days</SelectItem>
                <SelectItem value="90d">Last 90 Days</SelectItem>
                <SelectItem value="180d">Last 6 Months</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </header>

      {/* 2. Architectural Financial Overview Strip */}
      <section
        aria-label="Financial overview"
        className="mb-7 rounded-[6px] border border-[#D8D1C5] bg-[#FFFFFF]"
      >
        <div className="grid grid-cols-1 divide-y divide-[#E6E0D5] sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-5 lg:divide-x">
          <div className="p-5">
            <p className="arch-label">Contract Portfolio</p>
            <p className="mt-2 font-mono text-[24px] font-semibold tracking-[-0.02em] text-[#252A27] tabular-nums">
              {formatINR(kpis.totalContractValue, { compact: true })}
            </p>
            <p className="mt-1 font-mono text-[11px] text-[#77766F] tabular-nums">
              {formatINR(kpis.totalContractValue)}
            </p>
          </div>

          <div className="p-5 sm:border-l sm:border-[#E6E0D5] lg:border-l-0">
            <p className="arch-label">Payments Received</p>
            <p className="mt-2 font-mono text-[24px] font-semibold tracking-[-0.02em] text-[#4A543E] tabular-nums">
              {formatINR(kpis.paymentsReceived, { compact: true })}
            </p>
            <p className="mt-1 font-mono text-[11px] text-[#57564F] tabular-nums">
              {kpis.collectionPct}% of contract collected
            </p>
          </div>

          <div className="p-5 border-t border-[#E6E0D5] lg:border-t-0">
            <p className="arch-label">Customer Outstanding</p>
            <p
              className={`mt-2 font-mono text-[24px] font-semibold tracking-[-0.02em] tabular-nums ${
                kpis.overdueCount > 0 ? 'text-[#9A3026]' : 'text-[#A65229]'
              }`}
            >
              {formatINR(kpis.paymentsPending, { compact: true })}
            </p>
            <p className="mt-1 font-mono text-[11px] text-[#77766F] tabular-nums">
              {kpis.overdueCount > 0
                ? `${kpis.overdueCount} invoice${kpis.overdueCount > 1 ? 's' : ''} overdue`
                : 'All milestones on schedule'}
            </p>
          </div>

          <div className="p-5 border-t border-[#E6E0D5] sm:border-l lg:border-t-0 lg:border-l-0">
            <p className="arch-label">Recorded Expenses</p>
            <p className="mt-2 font-mono text-[24px] font-semibold tracking-[-0.02em] text-[#252A27] tabular-nums">
              {formatINR(kpis.totalExpenses, { compact: true })}
            </p>
            <p className="mt-1 font-mono text-[11px] text-[#77766F] tabular-nums">
              {kpis.expenseCount} verified vouchers
            </p>
          </div>

          <div className="p-5 border-t border-[#E6E0D5] sm:col-span-2 lg:col-span-1 lg:border-t-0 bg-[#FAF8F3]">
            <p className="arch-label">Supplier Payables</p>
            <p className="mt-2 font-mono text-[24px] font-semibold tracking-[-0.02em] text-[#A65229] tabular-nums">
              {formatINR(kpis.supplierPending, { compact: true })}
            </p>
            <p className="mt-1 font-mono text-[11px] text-[#77766F] tabular-nums">
              {kpis.unpaidSupplierCount} open bill
              {kpis.unpaidSupplierCount === 1 ? '' : 's'}
            </p>
          </div>
        </div>
      </section>

      {/* 3. Prominent Active Projects Section */}
      <section aria-label="Active construction projects" className="mb-7">
        <div className="mb-3.5 flex items-end justify-between gap-4">
          <div>
            <p className="arch-label">Active Site Portfolio</p>
            <h2 className="mt-0.5 text-lg font-semibold text-[#252A27]">
              Ongoing Residential Builds
            </h2>
          </div>
          <Link
            to="/projects"
            className="inline-flex items-center gap-1 text-xs font-medium text-[#A65229] hover:underline whitespace-nowrap"
          >
            <span>Open full project register</span>
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          {filteredProjects.map((project, idx) => {
            const received = payments
              .filter((p) => p.projectId === project.id && p.status === 'Received')
              .reduce((sum, p) => sum + p.amount, 0);
            const remaining = Math.max(0, project.contractValue - received);
            const cover = getProjectCoverImage(project.id, idx);

            return (
              <Card
                key={project.id}
                className="group overflow-hidden transition-colors hover:border-[#B6AEA0]"
              >
                <div className="flex flex-col h-full">
                  <Link
                    to={`/projects/${project.id}`}
                    className="block aspect-[16/9] w-full overflow-hidden border-b border-[#D8D1C5] bg-[#EAE4D9]"
                  >
                    <img
                      src={cover.src}
                      alt={cover.alt}
                      referrerPolicy="no-referrer"
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                    />
                  </Link>

                  <div className="flex flex-1 flex-col p-4">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-[10.5px] uppercase tracking-[0.08em] text-[#77766F]">
                        {project.code} · {project.city}
                      </span>
                      <Badge variant={getProjectStatusVariant(project.status)}>
                        {project.status}
                      </Badge>
                    </div>

                    <Link
                      to={`/projects/${project.id}`}
                      className="mt-1.5 flex items-center justify-between gap-2 text-[16px] font-semibold text-[#252A27] hover:text-[#A65229] transition-colors"
                    >
                      <span className="truncate">{project.name}</span>
                      <ArrowUpRight className="h-4 w-4 shrink-0 text-[#77766F]" />
                    </Link>

                    <p className="mt-0.5 text-xs text-[#77766F] truncate">
                      {project.customerName} · Sup: {project.siteManager}
                    </p>

                    <div className="mt-4">
                      <div className="mb-1 flex items-center justify-between text-xs">
                        <span className="font-mono text-[10.5px] uppercase tracking-[0.06em] text-[#77766F]">
                          Site Progress
                        </span>
                        <span className="font-mono font-semibold text-[#252A27] tabular-nums">
                          {project.progressPercent}%
                        </span>
                      </div>
                      <ProgressBar
                        value={project.progressPercent}
                        className="h-1.5"
                        barClassName={
                          project.progressPercent >= 90
                            ? 'bg-[#6E7A5F]'
                            : 'bg-[#C66A3D]'
                        }
                      />
                    </div>

                    <div className="mt-4 grid grid-cols-3 gap-2 border-t border-[#E6E0D5] pt-3 text-xs">
                      <div>
                        <p className="font-mono text-[9.5px] uppercase tracking-[0.06em] text-[#77766F]">
                          Contract
                        </p>
                        <p className="mt-0.5 font-mono font-semibold text-[#252A27] tabular-nums">
                          {formatINR(project.contractValue, { compact: true })}
                        </p>
                      </div>
                      <div>
                        <p className="font-mono text-[9.5px] uppercase tracking-[0.06em] text-[#77766F]">
                          Received
                        </p>
                        <p className="mt-0.5 font-mono font-semibold text-[#4A543E] tabular-nums">
                          {formatINR(received, { compact: true })}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-mono text-[9.5px] uppercase tracking-[0.06em] text-[#77766F]">
                          Balance
                        </p>
                        <p className="mt-0.5 font-mono font-semibold text-[#A65229] tabular-nums">
                          {formatINR(remaining, { compact: true })}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </section>

      {/* 4. Workforce Attendance & Weekly Wages Band */}
      <section
        aria-label="Workforce and site operations summary"
        className="mb-7 rounded-[6px] border border-[#D8D1C5] bg-[#FAF8F3] p-5"
      >
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="grid flex-1 grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[4px] border border-[#D8D1C5] bg-[#FFFFFF] text-[#252A27]">
                <HardHat className="h-4 w-4" />
              </div>
              <div>
                <p className="arch-label">Today&apos;s Attendance</p>
                <p className="mt-0.5 font-mono text-lg font-semibold text-[#252A27] tabular-nums">
                  {workforceStats.presentWorkers}{' '}
                  <span className="text-xs font-normal text-[#77766F]">
                    / {workforceStats.totalWorkers} workers on site
                  </span>
                </p>
                <p className="text-xs text-[#77766F]">
                  {workforceStats.pendingAttendanceCount > 0
                    ? `${workforceStats.pendingAttendanceCount} entries awaiting verification`
                    : 'All attendance logs verified'}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 sm:border-l sm:border-[#D8D1C5] sm:pl-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[4px] border border-[#D8D1C5] bg-[#FFFFFF] text-[#A65229]">
                <Wallet className="h-4 w-4" />
              </div>
              <div>
                <p className="arch-label">Weekly Wage Ledger</p>
                <p className="mt-0.5 font-mono text-lg font-semibold text-[#252A27] tabular-nums">
                  {formatINR(workforceStats.pendingWagesTotal)}
                </p>
                <p className="text-xs text-[#77766F] tabular-nums">
                  Est. 6-day run rate: {formatINR(workforceStats.weeklyPayrollEstimate)}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 sm:border-l sm:border-[#D8D1C5] sm:pl-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[4px] border border-[#D8D1C5] bg-[#FFFFFF] text-[#4A543E]">
                <Truck className="h-4 w-4" />
              </div>
              <div>
                <p className="arch-label">Material Dispatch</p>
                <p className="mt-0.5 font-mono text-lg font-semibold text-[#252A27] tabular-nums">
                  {workforceStats.pendingDeliveriesCount}{' '}
                  <span className="text-xs font-normal text-[#77766F]">
                    scheduled deliveries
                  </span>
                </p>
                <p className="text-xs text-[#77766F]">
                  {workforceStats.delayedDeliveriesCount > 0 ? (
                    <span className="font-medium text-[#9A3026]">
                      {workforceStats.delayedDeliveriesCount} delayed in transit
                    </span>
                  ) : (
                    'All supplier dispatches on schedule'
                  )}
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <Button variant="outline" size="sm" asChild>
              <Link to="/workforce/attendance">Review Attendance</Link>
            </Button>
            <Button variant="navy" size="sm" asChild>
              <Link to="/workforce/wages">Weekly Wages</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* 5. Priority Action Queue & Compact Site Activity Timeline */}
      <section className="mb-7 grid grid-cols-1 gap-5 xl:grid-cols-12">
        {/* Priority Action List */}
        <Card className="xl:col-span-7 flex flex-col">
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="arch-label mb-1">Priority Queue</p>
                <CardTitle>Attention &amp; Pending Approvals</CardTitle>
                <CardDescription>
                  Overdue client dues, delayed milestones, supervisor submissions, and low material stock
                </CardDescription>
              </div>
              <span className="font-mono text-xs font-semibold text-[#A65229] tabular-nums">
                {alerts.all.length} open
              </span>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-1 rounded-[4px] border border-[#E6E0D5] bg-[#FAF8F3] p-1">
              {(
                [
                  { id: 'all', label: `All (${alerts.all.length})` },
                  { id: 'approvals', label: `Approvals (${alerts.approvals.length})` },
                  { id: 'payments', label: `Overdue (${alerts.payments.length})` },
                  { id: 'milestones', label: `Delays (${alerts.milestones.length})` },
                  { id: 'stock', label: `Low Stock (${alerts.stock.length})` },
                  { id: 'suppliers', label: `Suppliers (${alerts.suppliers.length})` },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setAlertTab(tab.id)}
                  className={`rounded-[3px] px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                    alertTab === tab.id
                      ? 'bg-[#252A27] text-[#F4F0E8]'
                      : 'text-[#57564F] hover:text-[#252A27]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </CardHeader>

          <CardContent className="flex-1 pt-0">
            {activeAlerts.length === 0 ? (
              <EmptyState
                icon={ClipboardCheck}
                title="Queue clear in this category"
                description="All tracked site submissions, payments, and inventory thresholds are currently in order."
              />
            ) : (
              <ul className="divide-y divide-[#E6E0D5]">
                {activeAlerts.slice(0, 7).map((alert) => (
                  <li
                    key={alert.id}
                    className="flex items-start justify-between gap-4 py-3 first:pt-1 last:pb-0"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <span
                        className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-[3px] border ${
                          alert.severity === 'red'
                            ? 'border-[#E7BCB5] bg-[#FCEEEB] text-[#9A3026]'
                            : alert.category === 'approvals'
                            ? 'border-[#E7C4B3] bg-[#FBF1EC] text-[#A65229]'
                            : 'border-[#E4CFA0] bg-[#FAF2E1] text-[#855A18]'
                        }`}
                      >
                        {alert.category === 'approvals' ? (
                          <FileCheck2 className="h-3.5 w-3.5" />
                        ) : alert.category === 'stock' ? (
                          <Package className="h-3.5 w-3.5" />
                        ) : alert.category === 'suppliers' ? (
                          <Truck className="h-3.5 w-3.5" />
                        ) : alert.category === 'milestones' ? (
                          <CalendarClock className="h-3.5 w-3.5" />
                        ) : (
                          <AlertTriangle className="h-3.5 w-3.5" />
                        )}
                      </span>
                      <div className="min-w-0">
                        <p className="text-[13.5px] font-medium text-[#252A27] leading-snug">
                          {alert.title}
                        </p>
                        <p className="mt-0.5 text-xs text-[#57564F]">
                          {alert.detail}
                        </p>
                        <p className="mt-1 font-mono text-[10.5px] text-[#77766F]">
                          {alert.projectName} · {alert.meta}
                        </p>
                      </div>
                    </div>

                    <Link
                      to={alert.linkTo}
                      className="shrink-0 font-mono text-[11px] font-medium uppercase tracking-[0.06em] text-[#A65229] hover:underline whitespace-nowrap"
                    >
                      Inspect
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Compact Site Activity Timeline */}
        <Card className="xl:col-span-5 flex flex-col">
          <CardHeader className="pb-3">
            <p className="arch-label mb-1">Field Log</p>
            <CardTitle>Recent Site Activity</CardTitle>
            <CardDescription>
              Latest receipts, material dispatches, bills, and stage logs
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 pt-0">
            {filteredActivities.length === 0 ? (
              <EmptyState
                title="No activity in selected range"
                description="Expand the date filter or choose All Projects to review earlier construction entries."
              />
            ) : (
              <ul className="divide-y divide-[#E6E0D5]">
                {filteredActivities.slice(0, 7).map((activity) => {
                  const Icon = getActivityIcon(activity.type);
                  return (
                    <li
                      key={activity.id}
                      className="flex items-start justify-between gap-3 py-3 first:pt-1 last:pb-0"
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-[3px] border border-[#D8D1C5] bg-[#FAF8F3] text-[#57564F]">
                          <Icon className="h-3.5 w-3.5" />
                        </span>
                        <div className="min-w-0">
                          <Link
                            to={`/projects/${activity.projectId}`}
                            className="text-[13.5px] font-medium text-[#252A27] hover:text-[#A65229] transition-colors leading-snug block"
                          >
                            {activity.title}
                          </Link>
                          <p className="mt-0.5 text-xs text-[#57564F] line-clamp-1">
                            {activity.description}
                          </p>
                          <p className="mt-1 font-mono text-[10.5px] text-[#77766F] tabular-nums">
                            {formatIndianDate(activity.date)} · {activity.actor}
                          </p>
                        </div>
                      </div>

                      {activity.amount !== undefined && (
                        <span
                          className={`shrink-0 font-mono text-xs font-semibold tabular-nums whitespace-nowrap ${
                            activity.type === 'payment_received'
                              ? 'text-[#4A543E]'
                              : 'text-[#252A27]'
                          }`}
                        >
                          {activity.type === 'payment_received' ? '+' : ''}
                          {formatINR(activity.amount)}
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </section>

      {/* 6. Financial Performance Charts */}
      <section aria-label="Financial performance charts">
        <FinancialCharts
          projects={filteredProjects}
          payments={filteredPayments}
          expenses={filteredExpenses}
        />
      </section>
    </PageContainer>
  );
}
