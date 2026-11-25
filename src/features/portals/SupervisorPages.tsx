import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  Building2,
  CalendarCheck2,
  Camera,
  CheckCircle2,
  ClipboardPlus,
  Edit3,
  FileCheck2,
  FileText,
  HardHat,
  Lock,
  Plus,
  Receipt,
  Save,
  Send,
  Upload,
} from 'lucide-react';
import { useAuth } from '@/src/context/AuthContext';
import { useBuildFlow } from '@/src/context/BuildFlowContext';
import { resolveEffectiveDailySalary } from '@/src/lib/wageCalculations';
import { formatArea, formatIndianDate, formatINR } from '@/src/lib/utils';
import { PageContainer, PageHeader } from '@/src/components/layout/PageContainer';
import {
  Badge,
  getPaymentStatusVariant,
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
  MilestoneStatus,
  ReviewStatus,
  SiteProgressReport,
  SiteUploadCategory,
  SiteUploadRecord,
} from '@/src/types';

const TODAY_ISO = '2026-11-25';

function useSupervisorScope() {
  const { currentUser } = useAuth();
  const store = useBuildFlow();

  const assignedProjects = useMemo(() => {
    if (!currentUser) return [];
    if (currentUser.role === 'owner') return store.projects;
    return store.projects.filter((p) =>
      currentUser.assignedProjectIds.includes(p.id),
    );
  }, [store.projects, currentUser]);

  const projectIds = useMemo(
    () => new Set(assignedProjects.map((p) => p.id)),
    [assignedProjects],
  );

  const projectMap = useMemo(
    () => new Map(assignedProjects.map((p) => [p.id, p])),
    [assignedProjects],
  );

  const assignedWorkers = useMemo(
    () =>
      store.workers.filter(
        (w) =>
          (w.active ?? true) &&
          (projectIds.has(w.assignedProjectId) ||
            (w.assignedProjectIds ?? []).some((pid) => projectIds.has(pid))),
      ),
    [store.workers, projectIds],
  );

  const scopedReports = useMemo(
    () =>
      store.progressReports
        .filter((r) => projectIds.has(r.projectId))
        .sort((a, b) => b.reportDate.localeCompare(a.reportDate)),
    [store.progressReports, projectIds],
  );

  const scopedUploads = useMemo(
    () =>
      store.siteUploads
        .filter((u) => projectIds.has(u.projectId))
        .sort((a, b) => b.uploadDate.localeCompare(a.uploadDate)),
    [store.siteUploads, projectIds],
  );

  const scopedIssues = useMemo(
    () =>
      store.siteIssues
        .filter((i) => projectIds.has(i.projectId))
        .sort((a, b) => b.reportedDate.localeCompare(a.reportedDate)),
    [store.siteIssues, projectIds],
  );

  const scopedMilestones = useMemo(
    () =>
      store.milestones
        .filter((m) => projectIds.has(m.projectId))
        .sort((a, b) => a.stageOrder - b.stageOrder),
    [store.milestones, projectIds],
  );

  return {
    currentUser,
    isOwner: currentUser?.role === 'owner',
    store,
    assignedProjects,
    projectIds,
    projectMap,
    assignedWorkers,
    scopedReports,
    scopedUploads,
    scopedIssues,
    scopedMilestones,
  };
}

function SupervisorGuardrailBanner() {
  return (
    <div className="mb-5 flex items-center gap-2.5 rounded-[4px] border border-[#D8D1C5] bg-[#FAF8F3] px-4 py-2.5 text-xs text-[#57564F]">
      <Lock className="h-3.5 w-3.5 text-[#A65229] shrink-0" />
      <span>
        <strong className="text-[#252A27]">Supervisor Site Operations Scope:</strong> Access restricted to your assigned sites. Worker salary configuration, role wage rates, client credentials, approved payroll, and owner profit margins are protected.
      </span>
    </div>
  );
}

/* ============================================================================
 * 1. SUPERVISOR DASHBOARD (/supervisor)
 * ========================================================================== */
export function SupervisorDashboardPage() {
  const {
    currentUser,
    store,
    assignedProjects,
    projectMap,
    assignedWorkers,
    scopedReports,
    scopedUploads,
    scopedIssues,
  } = useSupervisorScope();

  // Compute today's attendance status per assigned project
  const siteAttendanceBreakdown = useMemo(() => {
    return assignedProjects.map((proj) => {
      const expectedWorkers = assignedWorkers.filter(
        (w) =>
          w.assignedProjectId === proj.id ||
          (w.assignedProjectIds ?? []).includes(proj.id),
      );
      const todayRecords = store.attendanceRecords.filter(
        (r) => r.projectId === proj.id && r.date === TODAY_ISO,
      );
      const submittedCount = todayRecords.filter(
        (r) =>
          r.submissionStatus === 'Submitted' || r.submissionStatus === 'Verified',
      ).length;
      const isSubmitted = todayRecords.length > 0 && submittedCount > 0;

      // Check if current week report (starting 2026-11-18 or later) is submitted
      const hasCurrentWeekReport = scopedReports.some(
        (r) =>
          r.projectId === proj.id &&
          r.reportDate >= '2026-11-18' &&
          (r.reviewStatus === 'Submitted' || r.reviewStatus === 'Reviewed'),
      );
      const needsCorrectionReport = scopedReports.find(
        (r) =>
          r.projectId === proj.id && r.reviewStatus === 'Needs correction',
      );

      return {
        project: proj,
        expectedCount: expectedWorkers.length,
        loggedCount: todayRecords.length,
        isSubmitted,
        hasCurrentWeekReport,
        needsCorrectionReport,
      };
    });
  }, [assignedProjects, assignedWorkers, store.attendanceRecords, scopedReports]);

  const unsubmittedAttendanceSites = siteAttendanceBreakdown.filter(
    (s) => !s.isSubmitted,
  );
  const weeklyReportsDueSites = siteAttendanceBreakdown.filter(
    (s) => !s.hasCurrentWeekReport || Boolean(s.needsCorrectionReport),
  );
  const openSiteIssues = scopedIssues.filter((i) => i.status !== 'Resolved');

  return (
    <PageContainer>
      <PageHeader
        title="Supervisor Dashboard"
        description={`Site operations command center for ${
          currentUser?.fullName ?? 'Supervisor'
        } — Today (${formatIndianDate(TODAY_ISO)}) across ${
          assignedProjects.length
        } assigned sites.`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link to="/supervisor/weekly-reports">
                <ClipboardPlus className="h-3.5 w-3.5" />
                <span>Weekly Report</span>
              </Link>
            </Button>
            <Button size="sm" asChild>
              <Link to="/attendance">
                <CalendarCheck2 className="h-3.5 w-3.5" />
                <span>Mark Today&apos;s Attendance</span>
              </Link>
            </Button>
          </div>
        }
      />

      <SupervisorGuardrailBanner />

      {/* Attendance Not Yet Submitted Alert */}
      {unsubmittedAttendanceSites.length > 0 && (
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-[6px] border border-[#E4CFA0] bg-[#FAF2E1] px-4 py-3 text-xs text-[#61400F]">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="h-4 w-4 text-[#A65229] shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-[#252A27]">
                Attendance Not Yet Submitted for Today ({formatIndianDate(TODAY_ISO)})
              </p>
              <p className="mt-0.5 text-[#61400F]">
                Pending muster submission for:{' '}
                <strong>
                  {unsubmittedAttendanceSites
                    .map((s) => `${s.project.name} (${s.expectedCount} workers expected)`)
                    .join(' · ')}
                </strong>
              </p>
            </div>
          </div>
          <Button size="sm" asChild>
            <Link to="/attendance">Submit Daily Attendance Now</Link>
          </Button>
        </div>
      )}

      {/* Unified Site Operations Command Strip */}
      <section className="mb-6 rounded-[6px] border border-[#D8D1C5] bg-[#FFFFFF]">
        <div className="grid grid-cols-2 divide-y divide-[#E6E0D5] sm:grid-cols-3 lg:grid-cols-6 lg:divide-y-0 lg:divide-x">
          <div className="p-4">
            <p className="arch-label">Assigned Sites</p>
            <p className="mt-1.5 font-mono text-2xl font-semibold text-[#252A27] tabular-nums">
              {assignedProjects.length}
            </p>
            <p className="mt-1 text-xs text-[#77766F]">Active builds</p>
          </div>

          <div className="p-4 border-l border-[#E6E0D5] lg:border-l-0">
            <p className="arch-label">Today&apos;s Muster</p>
            <p className="mt-1.5 font-mono text-2xl font-semibold text-[#4A543E] tabular-nums">
              {assignedProjects.length - unsubmittedAttendanceSites.length}/
              {assignedProjects.length}
            </p>
            <p className="mt-1 text-xs text-[#77766F]">
              {unsubmittedAttendanceSites.length > 0
                ? `${unsubmittedAttendanceSites.length} site pending`
                : 'All submitted'}
            </p>
          </div>

          <div className="p-4 sm:border-l sm:border-[#E6E0D5] lg:border-l-0">
            <p className="arch-label">Crew Expected</p>
            <p className="mt-1.5 font-mono text-2xl font-semibold text-[#252A27] tabular-nums">
              {assignedWorkers.length}
            </p>
            <p className="mt-1 text-xs text-[#77766F]">Assigned workers</p>
          </div>

          <div className="p-4 border-l border-[#E6E0D5] sm:border-l-0">
            <p className="arch-label">Weekly Reports</p>
            <p className="mt-1.5 font-mono text-2xl font-semibold text-[#A65229] tabular-nums">
              {weeklyReportsDueSites.length}
            </p>
            <p className="mt-1 text-xs text-[#77766F]">
              {weeklyReportsDueSites.length > 0 ? 'Due this week' : 'Up to date'}
            </p>
          </div>

          <div className="p-4 sm:border-l sm:border-[#E6E0D5] lg:border-l-0">
            <p className="arch-label">Field Uploads</p>
            <p className="mt-1.5 font-mono text-2xl font-semibold text-[#252A27] tabular-nums">
              {scopedUploads.length}
            </p>
            <p className="mt-1 text-xs text-[#77766F]">
              {scopedUploads.filter((u) => u.reviewStatus === 'Needs correction').length}{' '}
              need revision
            </p>
          </div>

          <div className="p-4 border-l border-[#E6E0D5] lg:border-l-0 bg-[#FAF8F3]">
            <p className="arch-label">Open Issues</p>
            <p className="mt-1.5 font-mono text-2xl font-semibold text-[#9A3026] tabular-nums">
              {openSiteIssues.length}
            </p>
            <p className="mt-1 text-xs text-[#77766F]">Delays &amp; blockers</p>
          </div>
        </div>
      </section>

      {/* Assigned Projects Operational Status & Project Progress */}
      <div className="mb-5 grid grid-cols-1 gap-5 xl:grid-cols-12">
        <Card className="xl:col-span-7">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <div>
              <CardTitle>
                Assigned Projects, Attendance &amp; Weekly Report Status
              </CardTitle>
              <CardDescription>
                Daily muster verification, weekly report due state, and site completion
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link to="/supervisor/sites">Site Details</Link>
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Project / Site</TableHead>
                  <TableHead>Today&apos;s Attendance</TableHead>
                  <TableHead>Weekly Report</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {siteAttendanceBreakdown.map((item) => (
                  <TableRow key={item.project.id}>
                    <TableCell>
                      <p className="font-semibold text-slate-900">
                        {item.project.name}
                      </p>
                      <p className="text-xs text-slate-500">
                        {item.project.code} · {item.expectedCount} workers expected today
                      </p>
                    </TableCell>
                    <TableCell>
                      {item.isSubmitted ? (
                        <Badge variant="green">
                          Submitted ({item.loggedCount} logged)
                        </Badge>
                      ) : (
                        <Badge variant="amber">Not Yet Submitted</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {item.needsCorrectionReport ? (
                        <Badge variant="red">Needs Correction</Badge>
                      ) : item.hasCurrentWeekReport ? (
                        <Badge variant="green">Submitted</Badge>
                      ) : (
                        <Badge variant="amber">Report Due</Badge>
                      )}
                    </TableCell>
                    <TableCell className="w-[140px]">
                      <div className="flex items-center gap-2">
                        <ProgressBar
                          value={item.project.progressPercent}
                          className="flex-1"
                        />
                        <span className="font-mono text-xs font-semibold tabular-nums">
                          {item.project.progressPercent}%
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm" asChild>
                        <Link to="/attendance">Muster</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Pending Site Issues & Recent Uploads */}
        <Card className="xl:col-span-5">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <div>
              <CardTitle>Pending Site Issues &amp; Recent Uploads</CardTitle>
              <CardDescription>
                Active delays/issues and latest uploaded site files
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link to="/supervisor/progress">Log Issue</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-4 pt-0">
            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Pending Site Issues ({openSiteIssues.length})
              </p>
              {openSiteIssues.map((iss) => (
                <div
                  key={iss.id}
                  className="rounded-lg border border-amber-200 bg-amber-50/60 p-3 text-xs"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-slate-900">
                      {iss.title}
                    </span>
                    <Badge variant={getPaymentStatusVariant(iss.status)}>
                      {iss.status}
                    </Badge>
                  </div>
                  <p className="mt-1 text-slate-600">{iss.description}</p>
                  <p className="mt-1 text-[11px] text-slate-500">
                    {projectMap.get(iss.projectId)?.name} · Impact:{' '}
                    {iss.delayDaysImpact ?? 0} days
                  </p>
                </div>
              ))}
            </div>

            <div className="space-y-2 border-t border-slate-100 pt-3">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Recent Uploads
                </p>
                <Link
                  to="/supervisor/photos"
                  className="text-xs font-medium text-[#A65229] hover:underline"
                >
                  Manage All Uploads →
                </Link>
              </div>
              {scopedUploads.slice(0, 3).map((up) => (
                <div
                  key={up.id}
                  className="flex items-center justify-between gap-2 rounded border border-slate-200 bg-slate-50/70 px-3 py-2 text-xs"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-slate-900 truncate">
                      {up.title}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {up.category} · {projectMap.get(up.projectId)?.name}
                    </p>
                  </div>
                  <Badge variant={getPaymentStatusVariant(up.reviewStatus)}>
                    {up.reviewStatus}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Assigned Site Workers Roster (Read-Only Wage Rates) */}
      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <div>
            <CardTitle>Workers Expected on Assigned Sites (Read-Only Rates)</CardTitle>
            <CardDescription>
              View workers assigned to your sites. Wage rates and salary overrides are read-only for supervisors.
            </CardDescription>
          </div>
          <Badge variant="neutral">
            <Lock className="h-3 w-3" />
            Salary Editing Locked
          </Badge>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Worker</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Primary Assigned Site</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead className="text-right">Daily Wage (Read-Only)</TableHead>
                <TableHead>Rate Source</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assignedWorkers.map((w) => {
                const resolved = resolveEffectiveDailySalary(
                  w,
                  store.roleWageConfigs,
                );
                return (
                  <TableRow key={w.id}>
                    <TableCell>
                      <div className="font-medium text-slate-900">{w.name}</div>
                      <div className="font-mono text-[11px] text-slate-500">
                        {w.workerCode}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-slate-700">
                      {w.role}
                    </TableCell>
                    <TableCell className="text-xs font-medium text-slate-800">
                      {projectMap.get(w.assignedProjectId)?.name}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-slate-600">
                      {w.phone}
                    </TableCell>
                    <TableCell className="text-right font-mono font-semibold text-slate-900 tabular-nums">
                      {formatINR(resolved.dailySalary)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="neutral">
                        {resolved.source === 'individual_override'
                          ? 'Individual Override'
                          : 'Role Default'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </PageContainer>
  );
}

/* ============================================================================
 * 2. ASSIGNED SITES (/supervisor/sites)
 * ========================================================================== */
export function SupervisorAssignedSitesPage() {
  const { store, assignedProjects, assignedWorkers } = useSupervisorScope();

  return (
    <PageContainer>
      <PageHeader
        title="Assigned Sites"
        description="Residential construction sites allocated to your supervision. Contractor profit and client credentials are hidden."
      />

      <SupervisorGuardrailBanner />

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        {assignedProjects.map((proj) => {
          const siteWorkers = assignedWorkers.filter(
            (w) =>
              w.assignedProjectId === proj.id ||
              (w.assignedProjectIds ?? []).includes(proj.id),
          );
          const todayAttendanceCount = store.attendanceRecords.filter(
            (r) => r.projectId === proj.id && r.date === TODAY_ISO,
          ).length;

          return (
            <Card key={proj.id} className="p-5 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-mono text-xs text-[#A65229] font-semibold">
                    {proj.code} · {proj.projectType}
                  </p>
                  <h3 className="mt-0.5 text-base font-semibold text-slate-900">
                    {proj.name}
                  </h3>
                  <p className="mt-1 text-xs text-slate-500">
                    {proj.siteAddress}
                  </p>
                </div>
                <Badge variant={getProjectStatusVariant(proj.status)}>
                  {proj.status}
                </Badge>
              </div>

              <div className="grid grid-cols-3 gap-3 border-y border-slate-100 py-3 text-xs">
                <div>
                  <p className="text-slate-500">Built-up Area</p>
                  <p className="mt-0.5 font-medium text-slate-900 tabular-nums">
                    {formatArea(proj.builtUpAreaSqFt)}
                  </p>
                </div>
                <div>
                  <p className="text-slate-500">Assigned Crew</p>
                  <p className="mt-0.5 font-mono font-semibold text-slate-900 tabular-nums">
                    {siteWorkers.length} workers
                  </p>
                </div>
                <div>
                  <p className="text-slate-500">Today&apos;s Muster</p>
                  <p className="mt-0.5 font-medium text-slate-900 tabular-nums">
                    {todayAttendanceCount > 0
                      ? `${todayAttendanceCount} logged`
                      : 'Pending today'}
                  </p>
                </div>
              </div>

              <div>
                <div className="mb-1.5 flex items-center justify-between text-xs">
                  <span className="text-slate-500">Overall Site Progress</span>
                  <span className="font-mono font-semibold text-slate-900 tabular-nums">
                    {proj.progressPercent}%
                  </span>
                </div>
                <ProgressBar value={proj.progressPercent} />
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <Button size="sm" asChild>
                  <Link to="/attendance">Daily Attendance</Link>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <Link to="/supervisor/weekly-reports">Weekly Report</Link>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <Link to="/supervisor/progress">Work Progress</Link>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <Link to="/supervisor/photos">Uploads</Link>
                </Button>
              </div>
            </Card>
          );
        })}
      </div>
    </PageContainer>
  );
}

/* ============================================================================
 * 3. GUIDED WEEKLY PROGRESS REPORT (/supervisor/weekly-reports)
 * ========================================================================== */
export function SupervisorWeeklyReportsPage() {
  const {
    currentUser,
    isOwner,
    store,
    assignedProjects,
    projectMap,
    scopedReports,
  } = useSupervisorScope();

  const [editingReportId, setEditingReportId] = useState<string | null>(null);
  const [projectId, setProjectId] = useState(assignedProjects[0]?.id ?? 'proj-1');
  const [stage, setStage] = useState('First Floor Slab & Electrical Conduits');
  const [weekStartDate, setWeekStartDate] = useState('2026-11-18');
  const [weekEndDate, setWeekEndDate] = useState('2026-11-25');
  const [workCompleted, setWorkCompleted] = useState('');
  const [workRemaining, setWorkRemaining] = useState('');
  const [progressPercent, setProgressPercent] = useState('68');
  const [workersOnSite, setWorkersOnSite] = useState('10');
  const [materialsUsed, setMaterialsUsed] = useState('');
  const [problemsOrDelays, setProblemsOrDelays] = useState('');
  const [safetyOrQualityObservations, setSafetyOrQualityObservations] =
    useState('');
  const [nextWeekPlan, setNextWeekPlan] = useState('');
  const [notesForOwner, setNotesForOwner] = useState('');
  const [clientVisibleSummary, setClientVisibleSummary] = useState('');
  const [notice, setNotice] = useState('');

  // Owner review feedback state
  const [reviewNoteById, setReviewNoteById] = useState<Record<string, string>>(
    {},
  );

  const loadReportForEdit = (rep: SiteProgressReport) => {
    setEditingReportId(rep.id);
    setProjectId(rep.projectId);
    setStage(rep.stage);
    setWeekStartDate(rep.weekStartDate ?? '2026-11-18');
    setWeekEndDate(rep.weekEndDate ?? rep.reportDate);
    setWorkCompleted(rep.workCompleted ?? rep.summary);
    setWorkRemaining(rep.workRemaining ?? '');
    setProgressPercent(String(rep.progressPercent ?? 68));
    setWorkersOnSite(String(rep.workersOnSite));
    setMaterialsUsed(rep.materialsUsed ?? '');
    setProblemsOrDelays(rep.problemsOrDelays ?? '');
    setSafetyOrQualityObservations(rep.safetyOrQualityObservations ?? '');
    setNextWeekPlan(rep.nextDayPlan ?? rep.workPlanned ?? '');
    setNotesForOwner(rep.notesForOwner ?? '');
    setClientVisibleSummary(rep.clientVisibleSummary ?? rep.summary);
    setNotice(
      `Editing report (${rep.reviewStatus ?? 'Draft'}). Update fields and save draft or submit for owner review.`,
    );
  };

  const resetForm = () => {
    setEditingReportId(null);
    setWorkCompleted('');
    setWorkRemaining('');
    setMaterialsUsed('');
    setProblemsOrDelays('');
    setSafetyOrQualityObservations('');
    setNextWeekPlan('');
    setNotesForOwner('');
    setClientVisibleSummary('');
  };

  const handleSaveOrSubmit = (targetStatus: 'Draft' | 'Submitted') => {
    if (!projectId || !workCompleted.trim()) return;

    const payload: Omit<SiteProgressReport, 'id'> = {
      projectId,
      reportDate: weekEndDate || TODAY_ISO,
      weekStartDate,
      weekEndDate,
      submittedBy: currentUser?.fullName ?? 'Prakash Gowda',
      stage: stage.trim() || 'Active Stage',
      summary: clientVisibleSummary.trim() || workCompleted.trim(),
      workCompleted: workCompleted.trim(),
      workRemaining: workRemaining.trim() || 'Remaining stage items in progress.',
      workPlanned: nextWeekPlan.trim(),
      materialsUsed:
        materialsUsed.trim() || 'Standard cement, TMT steel, and aggregates.',
      problemsOrDelays: problemsOrDelays.trim() || 'None reported.',
      safetyOrQualityObservations:
        safetyOrQualityObservations.trim() ||
        'Cube test samples taken, PPE and scaffolding verified.',
      nextDayPlan: nextWeekPlan.trim() || 'Continue scheduled milestone works.',
      notesForOwner: notesForOwner.trim(),
      clientVisibleSummary:
        clientVisibleSummary.trim() || workCompleted.trim(),
      progressPercent: Math.max(0, Math.min(100, Number(progressPercent) || 0)),
      reviewStatus: targetStatus,
      workersOnSite: Math.max(1, Number(workersOnSite) || 8),
      weather: 'Clear',
      completionDeltaPercent: targetStatus === 'Submitted' ? 2 : 0,
    };

    if (editingReportId) {
      store.updateProgressReport(editingReportId, {
        ...payload,
        ownerReviewNotes:
          targetStatus === 'Submitted' ? undefined : payload.ownerReviewNotes,
      });
      setNotice(
        targetStatus === 'Draft'
          ? 'Draft report updated.'
          : 'Updated report submitted for Owner review.',
      );
    } else {
      store.addProgressReport(payload);
      setNotice(
        targetStatus === 'Draft'
          ? 'Weekly progress report saved as Draft.'
          : 'Weekly progress report submitted for Owner review.',
      );
    }

    resetForm();
  };

  return (
    <PageContainer>
      <PageHeader
        title="Guided Weekly Progress Reports"
        description="Prepare structured weekly site reports with internal notes for the Owner and a clean summary for the Client portal."
      />

      <SupervisorGuardrailBanner />

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
        {/* Guided 12-Field Form */}
        <Card className="xl:col-span-6">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <div>
              <CardTitle>
                {editingReportId
                  ? 'Edit Weekly Progress Report'
                  : 'New Guided Weekly Progress Report'}
              </CardTitle>
              <CardDescription>
                Supervisors can save drafts or submit for Owner review. Reports marked &quot;Needs correction&quot; can be edited and resubmitted.
              </CardDescription>
            </div>
            {editingReportId && (
              <Button variant="ghost" size="sm" onClick={resetForm}>
                Cancel Edit
              </Button>
            )}
          </CardHeader>
          <CardContent className="space-y-3.5">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>1. Project / Site *</Label>
                <Select value={projectId} onValueChange={setProjectId}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {assignedProjects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.code} · {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Active Construction Stage *</Label>
                <Input
                  value={stage}
                  onChange={(e) => setStage(e.target.value)}
                  placeholder="e.g. Roof Slab & Electrical Conduits"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="space-y-1">
                <Label>2. Week Start Date</Label>
                <Input
                  type="date"
                  value={weekStartDate}
                  onChange={(e) => setWeekStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label>Week End Date</Label>
                <Input
                  type="date"
                  value={weekEndDate}
                  onChange={(e) => setWeekEndDate(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label>5. Progress (%)</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={progressPercent}
                  onChange={(e) => setProgressPercent(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label>6. Workers Present</Label>
                <Input
                  type="number"
                  min={1}
                  value={workersOnSite}
                  onChange={(e) => setWorkersOnSite(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>3. Work Completed This Week *</Label>
                <Textarea
                  value={workCompleted}
                  onChange={(e) => setWorkCompleted(e.target.value)}
                  placeholder="Detailed engineering work completed..."
                  className="min-h-[72px]"
                />
              </div>
              <div className="space-y-1">
                <Label>4. Work Remaining in Stage *</Label>
                <Textarea
                  value={workRemaining}
                  onChange={(e) => setWorkRemaining(e.target.value)}
                  placeholder="Remaining work items before stage completion..."
                  className="min-h-[72px]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>7. Materials Used or Delivered</Label>
                <Input
                  value={materialsUsed}
                  onChange={(e) => setMaterialsUsed(e.target.value)}
                  placeholder="e.g. 140 bags UltraTech Cement, 2.4 MT Fe550D TMT"
                />
              </div>
              <div className="space-y-1">
                <Label>8. Delays and Reasons (if any)</Label>
                <Input
                  value={problemsOrDelays}
                  onChange={(e) => setProblemsOrDelays(e.target.value)}
                  placeholder="e.g. 1-day rain pause or material lead time"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>9. Safety or Quality Observations</Label>
                <Input
                  value={safetyOrQualityObservations}
                  onChange={(e) =>
                    setSafetyOrQualityObservations(e.target.value)
                  }
                  placeholder="e.g. Slump test 100mm verified, scaffolding checked"
                />
              </div>
              <div className="space-y-1">
                <Label>10. Next Week&apos;s Plan</Label>
                <Input
                  value={nextWeekPlan}
                  onChange={(e) => setNextWeekPlan(e.target.value)}
                  placeholder="e.g. Begin external 20mm double-coat sand-faced plaster"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>11. Notes for the Owner (Internal Only)</Label>
                <Textarea
                  value={notesForOwner}
                  onChange={(e) => setNotesForOwner(e.target.value)}
                  placeholder="Internal requisition or labour note (never shown to client)..."
                  className="min-h-[68px]"
                />
              </div>
              <div className="space-y-1">
                <Label>12. Client-Visible Summary *</Label>
                <Textarea
                  value={clientVisibleSummary}
                  onChange={(e) => setClientVisibleSummary(e.target.value)}
                  placeholder="Clean homeowner-friendly summary for the Client Portal..."
                  className="min-h-[68px]"
                />
              </div>
            </div>

            {notice && (
              <p className="rounded bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-800">
                {notice}
              </p>
            )}

            <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleSaveOrSubmit('Draft')}
              >
                <Save className="h-3.5 w-3.5" />
                <span>Save as Draft</span>
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => handleSaveOrSubmit('Submitted')}
              >
                <Send className="h-3.5 w-3.5" />
                <span>Submit for Owner Review</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Submitted / Draft / Reviewed Reports List */}
        <div className="xl:col-span-6 space-y-3.5">
          {scopedReports.map((rep) => {
            const status: ReviewStatus = rep.reviewStatus ?? 'Submitted';
            const canSupervisorEdit =
              status === 'Draft' || status === 'Needs correction';

            return (
              <Card key={rep.id} className="p-4 space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-bold text-slate-900">
                        {projectMap.get(rep.projectId)?.name}
                      </span>
                      <Badge variant={getPaymentStatusVariant(status)}>
                        {status}
                      </Badge>
                      {rep.progressPercent !== undefined && (
                        <Badge variant="blue">{rep.progressPercent}%</Badge>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-slate-500 tabular-nums">
                      {rep.stage} · Week{' '}
                      {formatIndianDate(rep.weekStartDate ?? rep.reportDate)} –{' '}
                      {formatIndianDate(rep.weekEndDate ?? rep.reportDate)} ·{' '}
                      {rep.workersOnSite} workers
                    </p>
                  </div>

                  {canSupervisorEdit && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => loadReportForEdit(rep)}
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                      <span>Edit / Resubmit</span>
                    </Button>
                  )}
                </div>

                {rep.ownerReviewNotes && (
                  <div className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                    <strong>Owner Review Note ({rep.reviewedBy ?? 'Owner'}): </strong>
                    {rep.ownerReviewNotes}
                  </div>
                )}

                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 text-xs">
                  <div className="rounded border border-slate-100 bg-slate-50 p-2.5">
                    <span className="font-semibold text-emerald-800">
                      Completed:{' '}
                    </span>
                    <span className="text-slate-700">
                      {rep.workCompleted ?? rep.summary}
                    </span>
                  </div>
                  <div className="rounded border border-slate-100 bg-slate-50 p-2.5">
                    <span className="font-semibold text-[#A65229]">
                      Remaining:{' '}
                    </span>
                    <span className="text-slate-700">
                      {rep.workRemaining ?? 'On schedule'}
                    </span>
                  </div>
                </div>

                <div className="text-xs text-slate-600 space-y-1">
                  <div>
                    <strong>Client-Visible Summary: </strong>
                    {rep.clientVisibleSummary ?? rep.summary}
                  </div>
                  {rep.notesForOwner && (
                    <div className="text-slate-500">
                      <strong>Internal Owner Note: </strong>
                      {rep.notesForOwner}
                    </div>
                  )}
                </div>

                {/* Owner Review & Approval Bar (Visible when logged in as Owner) */}
                {isOwner && (
                  <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 pt-2.5">
                    <Input
                      value={reviewNoteById[rep.id] ?? ''}
                      onChange={(e) =>
                        setReviewNoteById((prev) => ({
                          ...prev,
                          [rep.id]: e.target.value,
                        }))
                      }
                      placeholder="Optional owner review comment..."
                      className="h-8 flex-1 text-xs"
                    />
                    <div className="flex items-center gap-1.5">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          store.reviewProgressReport(
                            rep.id,
                            'Needs correction',
                            reviewNoteById[rep.id] ||
                              'Please clarify quantities and resubmit.',
                            currentUser?.fullName ?? 'Vikram Menon',
                          )
                        }
                      >
                        Needs Correction
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        onClick={() =>
                          store.reviewProgressReport(
                            rep.id,
                            'Reviewed',
                            reviewNoteById[rep.id] ||
                              'Reviewed and approved for client portal.',
                            currentUser?.fullName ?? 'Vikram Menon',
                          )
                        }
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>Approve (Reviewed)</span>
                      </Button>
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      </div>
    </PageContainer>
  );
}

/* ============================================================================
 * SHARED 5-CATEGORY SITE UPLOADS WORKSPACE
 * Used by both /supervisor/photos and /supervisor/bills
 * ========================================================================== */
const ALL_UPLOAD_CATEGORIES: SiteUploadCategory[] = [
  'Progress photo',
  'Bill',
  'Receipt',
  'Material delivery document',
  'Site issue photo',
];

function SupervisorUploadsWorkspace({
  defaultCategory,
  pageTitle,
  pageDescription,
}: {
  defaultCategory: SiteUploadCategory;
  pageTitle: string;
  pageDescription: string;
}) {
  const {
    currentUser,
    isOwner,
    store,
    assignedProjects,
    projectMap,
    scopedUploads,
  } = useSupervisorScope();

  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  const [editingUploadId, setEditingUploadId] = useState<string | null>(null);

  const [projectId, setProjectId] = useState(assignedProjects[0]?.id ?? 'proj-1');
  const [category, setCategory] = useState<SiteUploadCategory>(defaultCategory);
  const [title, setTitle] = useState('');
  const [fileName, setFileName] = useState('');
  const [stage, setStage] = useState('Brickwork');
  const [amount, setAmount] = useState('');
  const [vendorName, setVendorName] = useState('');
  const [billNumber, setBillNumber] = useState('');
  const [description, setDescription] = useState('');
  const [clientVisible, setClientVisible] = useState(true);

  const filteredUploads = useMemo(
    () =>
      scopedUploads.filter(
        (u) => filterCategory === 'ALL' || u.category === filterCategory,
      ),
    [scopedUploads, filterCategory],
  );

  const startEditUpload = (up: SiteUploadRecord) => {
    setEditingUploadId(up.id);
    setProjectId(up.projectId);
    setCategory(up.category);
    setTitle(up.title);
    setFileName(up.fileName);
    setStage(up.stage);
    setAmount(up.amount ? String(up.amount) : '');
    setVendorName(up.vendorName ?? '');
    setBillNumber(up.billNumber ?? '');
    setDescription(up.description);
    setClientVisible(up.clientVisible);
  };

  const resetForm = () => {
    setEditingUploadId(null);
    setTitle('');
    setFileName('');
    setAmount('');
    setVendorName('');
    setBillNumber('');
    setDescription('');
  };

  const handleSaveUpload = (reviewStatus: 'Draft' | 'Submitted') => {
    if (!projectId || !title.trim()) return;
    const ext =
      category === 'Progress photo' || category === 'Site issue photo'
        ? 'jpg'
        : 'pdf';
    const resolvedFile =
      fileName.trim() ||
      `${title.trim().replace(/\s+/g, '_')}_25Nov2026.${ext}`;

    const payload: Omit<SiteUploadRecord, 'id'> = {
      projectId,
      title: title.trim(),
      category,
      fileName: resolvedFile,
      fileSize: ext === 'jpg' ? '2.4 MB' : '640 KB',
      uploadDate: TODAY_ISO,
      uploadedBy: currentUser?.fullName ?? 'Prakash Gowda',
      stage: stage.trim() || 'Active Stage',
      weekLabel: 'Week of 18 Nov – 24 Nov 2026',
      amount: amount ? Math.round(Number(amount)) : undefined,
      vendorName: vendorName.trim() || undefined,
      billNumber: billNumber.trim() || undefined,
      description:
        description.trim() || `${category} uploaded from site for verification.`,
      clientVisible,
      reviewStatus,
    };

    if (editingUploadId) {
      store.updateSiteUpload(editingUploadId, {
        ...payload,
        reviewNotes:
          reviewStatus === 'Submitted' ? undefined : payload.reviewNotes,
      });
    } else {
      store.addSiteUpload(payload);
    }

    resetForm();
  };

  return (
    <PageContainer>
      <PageHeader title={pageTitle} description={pageDescription} />

      <SupervisorGuardrailBanner />

      {/* Upload Form */}
      <Card className="mb-5 p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900">
            {editingUploadId
              ? 'Update Draft / Needs-Correction Upload'
              : 'Upload Site Photo, Bill, Receipt, Delivery Challan, or Issue Photo'}
          </h3>
          {editingUploadId && (
            <Button variant="ghost" size="sm" onClick={resetForm}>
              Cancel Edit
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
          <div className="md:col-span-3 space-y-1">
            <Label>Assigned Project *</Label>
            <Select value={projectId} onValueChange={setProjectId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {assignedProjects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.code} · {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="md:col-span-3 space-y-1">
            <Label>Upload Category *</Label>
            <Select
              value={category}
              onValueChange={(v) => setCategory(v as SiteUploadCategory)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ALL_UPLOAD_CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="md:col-span-3 space-y-1">
            <Label>Title / Summary *</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Ready-Mix M25 Delivery Challan"
            />
          </div>

          <div className="md:col-span-3 space-y-1">
            <Label>File Name</Label>
            <Input
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              placeholder="Auto-generated if blank (.jpg/.pdf)"
              className="font-mono text-xs"
            />
          </div>

          <div className="md:col-span-2 space-y-1">
            <Label>Stage / Milestone</Label>
            <Input
              value={stage}
              onChange={(e) => setStage(e.target.value)}
              placeholder="e.g. Roof slab"
            />
          </div>

          <div className="md:col-span-2 space-y-1">
            <Label>Amount (₹, if Bill/Receipt)</Label>
            <Input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Optional"
              className="font-mono"
            />
          </div>

          <div className="md:col-span-2 space-y-1">
            <Label>Vendor / Supplier</Label>
            <Input
              value={vendorName}
              onChange={(e) => setVendorName(e.target.value)}
              placeholder="Optional"
            />
          </div>

          <div className="md:col-span-3 space-y-1">
            <Label>Description / Notes</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Verification notes or invoice number..."
            />
          </div>

          <div className="md:col-span-3 flex items-end justify-between gap-2">
            <label className="inline-flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer pb-2">
              <input
                type="checkbox"
                checked={clientVisible}
                onChange={(e) => setClientVisible(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300"
              />
              <span>Share with Client (once Reviewed)</span>
            </label>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-end gap-2 border-t border-slate-100 pt-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handleSaveUpload('Draft')}
          >
            <Save className="h-3.5 w-3.5" />
            <span>Save as Draft</span>
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => handleSaveUpload('Submitted')}
          >
            <Upload className="h-3.5 w-3.5" />
            <span>Submit for Owner Review</span>
          </Button>
        </div>
      </Card>

      {/* Category Filter Pills */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant={filterCategory === 'ALL' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilterCategory('ALL')}
        >
          All Categories ({scopedUploads.length})
        </Button>
        {ALL_UPLOAD_CATEGORIES.map((cat) => {
          const count = scopedUploads.filter((u) => u.category === cat).length;
          return (
            <Button
              key={cat}
              type="button"
              variant={filterCategory === cat ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterCategory(cat)}
            >
              {cat} ({count})
            </Button>
          );
        })}
      </div>

      {/* Uploads Table with Required Columns: File name, Category, Date, Uploader, Project, Review Status */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>File Name &amp; Title</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Uploader</TableHead>
              <TableHead>Project</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Review Status</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUploads.map((up) => {
              const canEdit =
                up.reviewStatus === 'Draft' ||
                up.reviewStatus === 'Needs correction';

              return (
                <TableRow key={up.id}>
                  <TableCell>
                    <p className="font-semibold text-slate-900">{up.title}</p>
                    <p className="font-mono text-[11px] text-slate-500">
                      {up.fileName} ({up.fileSize})
                    </p>
                    <p className="mt-0.5 text-xs text-slate-600">
                      {up.description}
                    </p>
                    {up.reviewNotes && (
                      <p className="mt-1 rounded bg-amber-50 px-2 py-1 text-[11px] font-medium text-amber-900">
                        Owner Note: {up.reviewNotes}
                      </p>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="blue">{up.category}</Badge>
                  </TableCell>
                  <TableCell className="text-xs text-slate-600 tabular-nums whitespace-nowrap">
                    {formatIndianDate(up.uploadDate)}
                  </TableCell>
                  <TableCell className="text-xs text-slate-700">
                    {up.uploadedBy}
                  </TableCell>
                  <TableCell className="text-xs font-medium text-slate-800">
                    {projectMap.get(up.projectId)?.name}
                  </TableCell>
                  <TableCell className="text-right font-mono font-semibold text-slate-900 tabular-nums">
                    {up.amount ? formatINR(up.amount) : '—'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={getPaymentStatusVariant(up.reviewStatus)}>
                      {up.reviewStatus}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="inline-flex flex-wrap items-center justify-end gap-1.5">
                      {canEdit && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => startEditUpload(up)}
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                          <span>Edit</span>
                        </Button>
                      )}
                      {isOwner && up.reviewStatus !== 'Reviewed' && (
                        <>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              store.reviewSiteUpload(
                                up.id,
                                'Needs correction',
                                'Please attach clearer copy or verify bill number.',
                                currentUser?.fullName ?? 'Vikram Menon',
                              )
                            }
                          >
                            Return
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            onClick={() =>
                              store.reviewSiteUpload(
                                up.id,
                                'Reviewed',
                                'Verified and approved by Owner.',
                                currentUser?.fullName ?? 'Vikram Menon',
                              )
                            }
                          >
                            Approve
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>
    </PageContainer>
  );
}

export function SupervisorSitePhotosPage() {
  return (
    <SupervisorUploadsWorkspace
      defaultCategory="Progress photo"
      pageTitle="Site Photos & Field Uploads"
      pageDescription="Upload progress photos, site issue photos, material delivery documents, bills, and receipts with Draft/Submit/Review workflow."
    />
  );
}

export function SupervisorBillsPage() {
  return (
    <SupervisorUploadsWorkspace
      defaultCategory="Bill"
      pageTitle="Bills, Receipts & Material Delivery Documents"
      pageDescription="Upload vendor bills, petty-cash receipts, and material delivery challans for Owner verification and approval."
    />
  );
}

/* ============================================================================
 * 5. WORK PROGRESS & SITE ISSUES (/supervisor/progress)
 * ========================================================================== */
export function SupervisorWorkProgressPage() {
  const {
    currentUser,
    store,
    assignedProjects,
    projectMap,
    scopedIssues,
  } = useSupervisorScope();

  const [selectedProjectId, setSelectedProjectId] = useState(
    assignedProjects[0]?.id ?? 'proj-1',
  );

  // Issue form state
  const [issueTitle, setIssueTitle] = useState('');
  const [issueStage, setIssueStage] = useState('Plumbing and electrical');
  const [issueSeverity, setIssueSeverity] = useState<'Low' | 'Medium' | 'High'>(
    'Medium',
  );
  const [issueDelayDays, setIssueDelayDays] = useState('2');
  const [issueDescription, setIssueDescription] = useState('');

  const milestones = useMemo(
    () =>
      store.milestones
        .filter((m) => m.projectId === selectedProjectId)
        .sort((a, b) => a.stageOrder - b.stageOrder),
    [store.milestones, selectedProjectId],
  );

  const handleReportIssue = (e: React.FormEvent) => {
    e.preventDefault();
    if (!issueTitle.trim() || !issueDescription.trim()) return;
    store.addSiteIssue({
      projectId: selectedProjectId,
      title: issueTitle.trim(),
      severity: issueSeverity,
      status: 'Open',
      reportedDate: TODAY_ISO,
      reportedBy: currentUser?.fullName ?? 'Prakash Gowda',
      stage: issueStage,
      description: issueDescription.trim(),
      delayDaysImpact: Math.max(0, Number(issueDelayDays) || 0),
    });
    setIssueTitle('');
    setIssueDescription('');
  };

  return (
    <PageContainer>
      <PageHeader
        title="Work Progress, Completed/Remaining Work & Site Issues"
        description="Record completed and remaining work per milestone and report delays or site issues."
        actions={
          <div className="w-[240px]">
            <Select
              value={selectedProjectId}
              onValueChange={setSelectedProjectId}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {assignedProjects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.code} · {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        }
      />

      <SupervisorGuardrailBanner />

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
        {/* Milestones Completed & Remaining Work Editor */}
        <Card className="xl:col-span-7">
          <CardHeader className="pb-3">
            <CardTitle>
              Stage Progress — {projectMap.get(selectedProjectId)?.name}
            </CardTitle>
            <CardDescription>
              Update stage completion status, completed work, and remaining work notes
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            {milestones.length === 0 ? (
              <EmptyState
                icon={Building2}
                title="No milestones found"
                description="Milestones for this project will appear once scheduled."
              />
            ) : (
              milestones.map((ms) => (
                <div
                  key={ms.id}
                  className="rounded-lg border border-slate-200 bg-slate-50/60 p-3.5 space-y-2.5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => store.toggleMilestoneStatus(ms.id)}
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors cursor-pointer ${
                          ms.status === 'Completed'
                            ? 'border-emerald-600 bg-emerald-600 text-white'
                            : 'border-slate-300 bg-white text-transparent hover:border-[#A65229]'
                        }`}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      </button>
                      <span className="text-sm font-bold text-slate-900">
                        {ms.stageOrder}. {ms.stageCategory ?? ms.title}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Select
                        value={ms.status}
                        onValueChange={(val) =>
                          store.updateMilestoneProgress(
                            ms.id,
                            val === 'Completed'
                              ? 100
                              : ms.actualProgressPercent ?? 50,
                            val as MilestoneStatus,
                          )
                        }
                      >
                        <SelectTrigger className="h-7 w-[130px] text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Completed">Completed</SelectItem>
                          <SelectItem value="In Progress">In Progress</SelectItem>
                          <SelectItem value="Delayed">Delayed</SelectItem>
                          <SelectItem value="Upcoming">Upcoming</SelectItem>
                        </SelectContent>
                      </Select>
                      <Badge variant="blue">
                        {ms.actualProgressPercent ??
                          (ms.status === 'Completed' ? 100 : 0)}
                        %
                      </Badge>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 text-xs">
                    <div>
                      <Label className="text-[11px] text-emerald-800">
                        Completed Work
                      </Label>
                      <Input
                        value={ms.completedWorkDescription ?? ''}
                        onChange={(e) =>
                          store.updateMilestoneDetails(ms.id, {
                            completedWorkDescription: e.target.value,
                          })
                        }
                        placeholder="Record completed work..."
                        className="mt-1 h-8 text-xs bg-white"
                      />
                    </div>
                    <div>
                      <Label className="text-[11px] text-[#A65229]">
                        Remaining Work
                      </Label>
                      <Input
                        value={ms.remainingWorkDescription ?? ''}
                        onChange={(e) =>
                          store.updateMilestoneDetails(ms.id, {
                            remainingWorkDescription: e.target.value,
                          })
                        }
                        placeholder="Record remaining work..."
                        className="mt-1 h-8 text-xs bg-white"
                      />
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Report Delays or Site Issues */}
        <div className="xl:col-span-5 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Report Delay or Site Issue</CardTitle>
              <CardDescription>
                Escalate material delays, weather interruptions, or drawing clarifications to the Owner
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleReportIssue} className="space-y-3">
                <div className="space-y-1">
                  <Label>Issue / Delay Title *</Label>
                  <Input
                    required
                    value={issueTitle}
                    onChange={(e) => setIssueTitle(e.target.value)}
                    placeholder="e.g. Custom UPVC Window Frame Delivery Delay"
                  />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <Label>Stage</Label>
                    <Input
                      value={issueStage}
                      onChange={(e) => setIssueStage(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Severity</Label>
                    <Select
                      value={issueSeverity}
                      onValueChange={(v) =>
                        setIssueSeverity(v as 'Low' | 'Medium' | 'High')
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Low">Low</SelectItem>
                        <SelectItem value="Medium">Medium</SelectItem>
                        <SelectItem value="High">High</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>Delay (Days)</Label>
                    <Input
                      type="number"
                      min={0}
                      value={issueDelayDays}
                      onChange={(e) => setIssueDelayDays(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label>Description &amp; Impact *</Label>
                  <Textarea
                    required
                    value={issueDescription}
                    onChange={(e) => setIssueDescription(e.target.value)}
                    placeholder="Describe the blocker and required action..."
                  />
                </div>
                <Button type="submit" size="sm">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  <span>Log Site Issue / Delay</span>
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Logged Site Issues ({scopedIssues.length})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2.5 pt-0">
              {scopedIssues.map((iss) => (
                <div
                  key={iss.id}
                  className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs space-y-1.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-slate-900">
                      {iss.title}
                    </span>
                    <Badge variant={getPaymentStatusVariant(iss.status)}>
                      {iss.status}
                    </Badge>
                  </div>
                  <p className="text-slate-600">{iss.description}</p>
                  <div className="flex items-center justify-between pt-1 text-[11px] text-slate-500">
                    <span>
                      {projectMap.get(iss.projectId)?.name} · Severity:{' '}
                      {iss.severity} · Impact: {iss.delayDaysImpact ?? 0}d
                    </span>
                    {iss.status !== 'Resolved' && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          store.updateSiteIssueStatus(iss.id, 'Resolved')
                        }
                      >
                        Mark Resolved
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </PageContainer>
  );
}
