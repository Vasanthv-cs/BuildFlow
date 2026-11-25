import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  Camera,
  CheckCircle2,
  ClipboardPlus,
  Edit3,
  FileText,
  HardHat,
  MapPin,
  Package,
  Phone,
  ShieldCheck,
  Truck,
  User,
  UserCheck,
} from 'lucide-react';
import { useBuildFlow } from '@/src/context/BuildFlowContext';
import { useAuth } from '@/src/context/AuthContext';
import {
  getProjectCoverImage,
  SITE_GALLERY_FALLBACKS,
} from '@/src/data/projectVisuals';
import { ConfirmActionDialog } from '@/src/components/ui/confirm-dialog';
import {
  formatArea,
  formatIndianDate,
  formatINR,
} from '@/src/lib/utils';
import { PageContainer } from '@/src/components/layout/PageContainer';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/src/components/ui/dialog';
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/src/components/ui/tabs';
import { ProjectFormDialog } from './components/ProjectFormDialog';

export function ProjectDetailPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const {
    projects,
    payments,
    expenses,
    materials,
    deliveries,
    workers,
    milestones,
    quotations,
    progressReports,
    documents,
    siteUploads,
    clientCredentials,
    activities,
    updateProject,
    assignProjectRoles,
    createClientCredential,
    markPaymentReceived,
    toggleMilestoneStatus,
    addProgressReport,
    reviewProgressReport,
    reviewSiteUpload,
  } = useBuildFlow();
  const { currentUser, assignProjectToSupervisor, syncClientCredentialUser } =
    useAuth();

  const [editOpen, setEditOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [selectedSupervisor, setSelectedSupervisor] = useState('Prakash Gowda');
  const [selectedClientCredId, setSelectedClientCredId] = useState('');
  const [assignBanner, setAssignBanner] = useState('');
  const [confirmPaymentId, setConfirmPaymentId] = useState<string | null>(null);
  const [progressDialogOpen, setProgressDialogOpen] = useState(false);
  const [reportStage, setReportStage] = useState('');
  const [reportSummary, setReportSummary] = useState('');
  const [reportWorkers, setReportWorkers] = useState('10');
  const [reportDelta, setReportDelta] = useState('3');
  const [reportWeather, setReportWeather] = useState<
    'Clear' | 'Partly Cloudy' | 'Light Rain'
  >('Clear');
  const [reportError, setReportError] = useState('');

  const project = projects.find((p) => p.id === projectId);

  const projectPayments = useMemo(
    () => payments.filter((p) => p.projectId === projectId),
    [payments, projectId]
  );
  const projectExpenses = useMemo(
    () =>
      expenses
        .filter((e) => e.projectId === projectId)
        .sort((a, b) => b.date.localeCompare(a.date)),
    [expenses, projectId]
  );
  const projectMaterials = useMemo(
    () => materials.filter((m) => m.projectId === projectId),
    [materials, projectId]
  );
  const projectDeliveries = useMemo(
    () => deliveries.filter((d) => d.projectId === projectId),
    [deliveries, projectId]
  );
  const projectWorkers = useMemo(
    () => workers.filter((w) => w.assignedProjectId === projectId),
    [workers, projectId]
  );
  const projectMilestones = useMemo(
    () =>
      milestones
        .filter((m) => m.projectId === projectId)
        .sort((a, b) => a.stageOrder - b.stageOrder),
    [milestones, projectId]
  );
  const projectQuotations = useMemo(
    () => quotations.filter((q) => q.projectId === projectId),
    [quotations, projectId]
  );
  const projectProgressReports = useMemo(
    () =>
      progressReports
        .filter((r) => r.projectId === projectId)
        .sort((a, b) => b.reportDate.localeCompare(a.reportDate)),
    [progressReports, projectId]
  );
  const projectDocuments = useMemo(
    () => documents.filter((d) => d.projectId === projectId),
    [documents, projectId]
  );
  const projectSiteUploads = useMemo(
    () =>
      siteUploads
        .filter((u) => u.projectId === projectId)
        .sort((a, b) => b.uploadDate.localeCompare(a.uploadDate)),
    [siteUploads, projectId]
  );
  const linkedClientAccounts = useMemo(
    () =>
      clientCredentials.filter((c) =>
        projectId ? c.assignedProjectIds.includes(projectId) : false
      ),
    [clientCredentials, projectId]
  );
  const projectActivities = useMemo(
    () =>
      activities
        .filter((a) => a.projectId === projectId)
        .sort((a, b) => b.date.localeCompare(a.date)),
    [activities, projectId]
  );

  const metrics = useMemo(() => {
    if (!project) return null;
    const amountReceived = projectPayments
      .filter((p) => p.status === 'Received')
      .reduce((sum, p) => sum + p.amount, 0);
    const outstandingBalance = Math.max(
      0,
      project.contractValue - amountReceived
    );
    const recordedExpenses = projectExpenses.reduce(
      (sum, e) => sum + e.amount,
      0
    );
    const targetConstructionCost = Math.round(project.contractValue * 0.82);
    const estimatedRemainingCost = Math.max(
      0,
      targetConstructionCost - recordedExpenses
    );
    const collectionPercent =
      project.contractValue > 0
        ? Math.round((amountReceived / project.contractValue) * 100)
        : 0;

    return {
      amountReceived,
      outstandingBalance,
      recordedExpenses,
      targetConstructionCost,
      estimatedRemainingCost,
      collectionPercent,
    };
  }, [project, projectPayments, projectExpenses]);

  if (!project || !metrics) {
    return (
      <PageContainer title="Project Not Found">
        <EmptyState
          title="We could not locate this project"
          description="The project record may have been removed or the URL is incorrect."
          actionLabel="Back to Projects"
          onAction={() => window.history.back()}
        />
      </PageContainer>
    );
  }

  const coverVisual = getProjectCoverImage(project.id);
  const completedMilestonesCount = projectMilestones.filter(
    (m) => m.status === 'Completed'
  ).length;
  const upcomingMilestones = projectMilestones.filter(
    (m) => m.status !== 'Completed'
  );
  const recentPhotoUploads = projectSiteUploads.filter(
    (u) => u.category === 'Progress photo' || u.category === 'Site issue photo'
  );

  const handleSubmitProgress = (e: React.FormEvent) => {
    e.preventDefault();
    if (reportStage.trim().length < 3 || reportSummary.trim().length < 10) {
      setReportError(
        'Enter a work stage and at least 10 characters of site summary.'
      );
      return;
    }
    addProgressReport({
      projectId: project.id,
      reportDate: '2026-11-22',
      submittedBy: project.siteManager,
      stage: reportStage.trim(),
      summary: reportSummary.trim(),
      workersOnSite: Math.max(1, Number(reportWorkers) || 8),
      weather: reportWeather,
      completionDeltaPercent: Math.max(
        0,
        Math.min(25, Number(reportDelta) || 0)
      ),
    });
    setReportStage('');
    setReportSummary('');
    setReportError('');
    setProgressDialogOpen(false);
  };

  return (
    <PageContainer>
      {/* Top Action Bar */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <Button variant="outline" size="sm" asChild>
          <Link to="/projects">
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Project Register</span>
          </Link>
        </Button>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSelectedSupervisor(project.siteManager || 'Prakash Gowda');
              setSelectedClientCredId(
                linkedClientAccounts[0]?.id ?? 'auto_create'
              );
              setAssignOpen(true);
            }}
          >
            <UserCheck className="h-3.5 w-3.5" />
            <span>Assign Supervisor &amp; Client</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setProgressDialogOpen(true)}
          >
            <ClipboardPlus className="h-3.5 w-3.5" />
            <span>Log Progress</span>
          </Button>
          <Button size="sm" onClick={() => setEditOpen(true)}>
            <Edit3 className="h-3.5 w-3.5" />
            <span>Edit Project</span>
          </Button>
        </div>
      </div>

      {assignBanner && (
        <div className="mb-5 flex items-center justify-between rounded-[4px] border border-[#C5CEBA] bg-[#EFF3EB] px-4 py-2.5 text-xs font-medium text-[#434D38]">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-[#5E6951]" />
            {assignBanner}
          </span>
          <button
            type="button"
            onClick={() => setAssignBanner('')}
            className="text-[#434D38] underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Architectural Documentation Header */}
      <section className="mb-6 overflow-hidden rounded-[6px] border border-[#D8D1C5] bg-[#FFFFFF]">
        <div className="grid grid-cols-1 lg:grid-cols-12">
          {/* Left Technical Dossier */}
          <div className="lg:col-span-8 p-6 bg-[#FAF8F3] bg-blueprint-grid flex flex-col justify-between gap-5">
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="font-mono text-xs font-semibold uppercase tracking-[0.1em] text-[#A65229]">
                  {project.code}
                </span>
                <span className="text-[#C9C1B3]" aria-hidden="true">
                  /
                </span>
                <span className="font-mono text-xs uppercase tracking-[0.06em] text-[#77766F]">
                  {project.projectType}
                </span>
                <Badge variant={getProjectStatusVariant(project.status)}>
                  {project.status}
                </Badge>
              </div>

              <h1 className="mt-2.5 text-[26px] sm:text-[32px] font-semibold tracking-[-0.025em] text-[#252A27] leading-tight">
                {project.name}
              </h1>

              <p className="mt-1.5 flex items-center gap-1.5 text-sm text-[#57564F]">
                <MapPin className="h-4 w-4 shrink-0 text-[#77766F]" />
                <span>{project.siteAddress}</span>
              </p>

              {/* Technical Spec Strip */}
              <div className="mt-5 grid grid-cols-2 gap-x-5 gap-y-3 border-y border-[#D8D1C5] py-3.5 sm:grid-cols-4 text-xs">
                <div>
                  <p className="arch-label">Client</p>
                  <p className="mt-0.5 font-medium text-[#252A27] truncate">
                    {project.customerName}
                  </p>
                  <p className="font-mono text-[11px] text-[#77766F] tabular-nums">
                    {project.customerPhone}
                  </p>
                </div>
                <div>
                  <p className="arch-label">Site Supervisor</p>
                  <p className="mt-0.5 font-medium text-[#252A27]">
                    {project.siteManager}
                  </p>
                  <p className="font-mono text-[11px] text-[#77766F]">
                    {projectWorkers.length} crew assigned
                  </p>
                </div>
                <div>
                  <p className="arch-label">Built-Up Spec</p>
                  <p className="mt-0.5 font-mono font-medium text-[#252A27] tabular-nums">
                    {formatArea(project.builtUpAreaSqFt)}
                  </p>
                  <p className="font-mono text-[11px] text-[#77766F]">
                    {project.floors} Floors · {project.pricingMethod}
                  </p>
                </div>
                <div>
                  <p className="arch-label">Schedule Window</p>
                  <p className="mt-0.5 font-mono font-medium text-[#252A27] tabular-nums">
                    {formatIndianDate(project.startDate)}
                  </p>
                  <p className="font-mono text-[11px] text-[#77766F] tabular-nums">
                    Est. {formatIndianDate(project.estimatedCompletionDate)}
                  </p>
                </div>
              </div>
            </div>

            {/* Horizontal Completion Bar + Client Portal Link Status */}
            <div className="space-y-2.5">
              <div className="flex items-baseline justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="arch-label">Overall Completion</span>
                  <span className="font-mono text-[11px] text-[#77766F] tabular-nums">
                    ({completedMilestonesCount} of {projectMilestones.length}{' '}
                    milestones verified)
                  </span>
                </div>
                <span className="font-mono text-lg font-semibold text-[#252A27] tabular-nums">
                  {project.progressPercent}%
                </span>
              </div>
              <ProgressBar
                value={project.progressPercent}
                className="h-2.5 bg-[#E6E0D5]"
                barClassName={
                  project.progressPercent >= 90 ? 'bg-[#6E7A5F]' : 'bg-[#C66A3D]'
                }
              />
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs text-[#57564F]">
                <span className="inline-flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-[#5E6951]" />
                  Client Portal:{' '}
                  <strong className="font-medium text-[#252A27]">
                    {linkedClientAccounts.length > 0
                      ? linkedClientAccounts
                          .map((c) => `${c.customerName} (@${c.username})`)
                          .join(', ')
                      : 'Not linked yet'}
                  </strong>
                </span>
                <span className="inline-flex items-center gap-1.5 font-mono text-[11px] text-[#77766F]">
                  <Calendar className="h-3.5 w-3.5" />
                  Updated {formatIndianDate(project.updatedAt)}
                </span>
              </div>
            </div>
          </div>

          {/* Right Framed Site Cover Photograph */}
          <div className="lg:col-span-4 border-t border-[#D8D1C5] lg:border-t-0 lg:border-l bg-[#252A27] flex flex-col">
            <div className="relative flex-1 min-h-[210px] overflow-hidden bg-[#1D211F]">
              <img
                src={coverVisual.src}
                alt={coverVisual.alt}
                referrerPolicy="no-referrer"
                className="h-full w-full object-cover"
              />
            </div>
            <div className="border-t border-[#363C38] bg-[#252A27] px-4 py-2.5">
              <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-[#A7A49B]">
                Latest Elevation Frame · {project.code}
              </p>
              <p className="mt-0.5 text-xs text-[#F4F0E8] truncate">
                {coverVisual.caption}
              </p>
            </div>
          </div>
        </div>

        {/* Unified 5-Column Financial Summary Ledger Strip */}
        <div className="grid grid-cols-2 divide-y divide-[#E6E0D5] border-t border-[#D8D1C5] bg-[#FFFFFF] sm:grid-cols-3 lg:grid-cols-5 lg:divide-y-0 lg:divide-x">
          <div className="px-5 py-4">
            <p className="arch-label">Contract Value</p>
            <p className="mt-1 font-mono text-xl font-semibold text-[#252A27] tabular-nums">
              {formatINR(project.contractValue, { compact: true })}
            </p>
            <p className="mt-0.5 font-mono text-[11px] text-[#77766F] tabular-nums">
              {formatINR(project.contractValue)}
            </p>
          </div>

          <div className="px-5 py-4 border-l border-[#E6E0D5] lg:border-l-0">
            <p className="arch-label">Amount Received</p>
            <p className="mt-1 font-mono text-xl font-semibold text-[#4A543E] tabular-nums">
              {formatINR(metrics.amountReceived, { compact: true })}
            </p>
            <p className="mt-0.5 font-mono text-[11px] text-[#57564F] tabular-nums">
              {metrics.collectionPercent}% collected
            </p>
          </div>

          <div className="px-5 py-4 sm:border-l sm:border-[#E6E0D5] lg:border-l-0">
            <p className="arch-label">Customer Balance</p>
            <p className="mt-1 font-mono text-xl font-semibold text-[#A65229] tabular-nums">
              {formatINR(metrics.outstandingBalance, { compact: true })}
            </p>
            <p className="mt-0.5 font-mono text-[11px] text-[#77766F] tabular-nums">
              {formatINR(metrics.outstandingBalance)}
            </p>
          </div>

          <div className="px-5 py-4 border-l border-[#E6E0D5] sm:border-l-0">
            <p className="arch-label">Recorded Expenses</p>
            <p className="mt-1 font-mono text-xl font-semibold text-[#252A27] tabular-nums">
              {formatINR(metrics.recordedExpenses, { compact: true })}
            </p>
            <p className="mt-0.5 font-mono text-[11px] text-[#77766F] tabular-nums">
              {projectExpenses.length} recorded bills
            </p>
          </div>

          <div className="px-5 py-4 col-span-2 sm:col-span-2 lg:col-span-1 bg-[#FAF8F3]">
            <p className="arch-label">Est. Remaining Cost</p>
            <p className="mt-1 font-mono text-xl font-semibold text-[#252A27] tabular-nums">
              {formatINR(metrics.estimatedRemainingCost, { compact: true })}
            </p>
            <p className="mt-0.5 font-mono text-[11px] text-[#77766F] tabular-nums">
              Target budget{' '}
              {formatINR(metrics.targetConstructionCost, { compact: true })}
            </p>
          </div>
        </div>
      </section>

      {/* 8-Tab Project Workspace */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="quotations">
            Quotations ({projectQuotations.length})
          </TabsTrigger>
          <TabsTrigger value="payments">
            Payments ({projectPayments.length})
          </TabsTrigger>
          <TabsTrigger value="expenses">
            Expenses ({projectExpenses.length})
          </TabsTrigger>
          <TabsTrigger value="materials">
            Materials ({projectMaterials.length})
          </TabsTrigger>
          <TabsTrigger value="workers">
            Workers ({projectWorkers.length})
          </TabsTrigger>
          <TabsTrigger value="progress">
            Progress ({projectProgressReports.length})
          </TabsTrigger>
          <TabsTrigger value="documents">
            Documents ({projectDocuments.length})
          </TabsTrigger>
        </TabsList>

        {/* 1. OVERVIEW TAB */}
        <TabsContent value="overview">
          <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
            {/* Left: Specifications & Recent Site Photos */}
            <div className="xl:col-span-5 space-y-5">
              <Card>
                <CardHeader>
                  <p className="arch-label mb-1">Technical Dossier</p>
                  <CardTitle>Contract &amp; Site Specifications</CardTitle>
                  <CardDescription>
                    Registered scope, built-up dimensions, and commercial rate
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <dl className="divide-y divide-[#E6E0D5] text-sm">
                    {[
                      ['Project Code', project.code],
                      ['Project Type', project.projectType],
                      ['Built-up Area', formatArea(project.builtUpAreaSqFt)],
                      ['Floors', `${project.floors} Floors`],
                      ['Pricing Method', project.pricingMethod],
                      [
                        'Effective Rate',
                        `₹${Math.round(
                          project.contractValue /
                            Math.max(1, project.builtUpAreaSqFt)
                        ).toLocaleString('en-IN')} / sq.ft`,
                      ],
                      ['Start Date', formatIndianDate(project.startDate)],
                      [
                        'Estimated Completion',
                        formatIndianDate(project.estimatedCompletionDate),
                      ],
                      ['Site Manager', project.siteManager],
                    ].map(([label, val]) => (
                      <div
                        key={label}
                        className="flex items-center justify-between gap-4 py-2.5 first:pt-0"
                      >
                        <dt className="text-xs text-[#77766F]">{label}</dt>
                        <dd className="text-right font-mono text-xs font-medium text-[#252A27] tabular-nums">
                          {val}
                        </dd>
                      </div>
                    ))}
                  </dl>

                  <div className="rounded-[4px] border border-[#D8D1C5] bg-[#FAF8F3] p-3.5">
                    <p className="font-mono text-[10.5px] uppercase tracking-[0.08em] text-[#77766F] flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-[#A65229]" />
                      Site Address &amp; Scope Notes
                    </p>
                    <p className="mt-1.5 text-xs text-[#252A27] leading-relaxed">
                      {project.siteAddress}
                    </p>
                    {project.notes && (
                      <p className="mt-2 border-t border-[#E6E0D5] pt-2 text-xs text-[#57564F] leading-relaxed">
                        {project.notes}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Recent Site Photos Strip */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="arch-label mb-1">Visual Archive</p>
                      <CardTitle>Recent Site Photographs</CardTitle>
                    </div>
                    <Camera className="h-4 w-4 text-[#77766F]" />
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="grid grid-cols-3 gap-2.5">
                    {(recentPhotoUploads.length > 0
                      ? recentPhotoUploads.slice(0, 3).map((u, idx) => ({
                          id: u.id,
                          title: u.title,
                          date: formatIndianDate(u.uploadDate),
                          img: SITE_GALLERY_FALLBACKS[idx % SITE_GALLERY_FALLBACKS.length],
                        }))
                      : SITE_GALLERY_FALLBACKS.map((img, idx) => ({
                          id: `ref-${idx}`,
                          title: img.caption,
                          date: formatIndianDate(project.updatedAt),
                          img,
                        }))
                    ).map((photo) => (
                      <div
                        key={photo.id}
                        className="overflow-hidden rounded-[4px] border border-[#D8D1C5] bg-[#FAF8F3]"
                      >
                        <div className="aspect-[4/3] w-full overflow-hidden bg-[#EAE4D9]">
                          <img
                            src={photo.img.src}
                            alt={photo.img.alt}
                            referrerPolicy="no-referrer"
                            className="h-full w-full object-cover"
                          />
                        </div>
                        <div className="p-2">
                          <p className="truncate text-[11px] font-medium text-[#252A27]">
                            {photo.title}
                          </p>
                          <p className="font-mono text-[10px] text-[#77766F] tabular-nums">
                            {photo.date}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right: Milestones + Recent Project Activity */}
            <div className="xl:col-span-7 space-y-5">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-4 pb-3">
                  <div>
                    <p className="arch-label mb-1">Construction Schedule</p>
                    <CardTitle>Milestone Timeline</CardTitle>
                    <CardDescription>
                      Toggle milestones as structural and finishing stages pass site inspection
                    </CardDescription>
                  </div>
                  <span className="font-mono text-xs text-[#77766F] tabular-nums">
                    {upcomingMilestones.length} remaining
                  </span>
                </CardHeader>
                <CardContent className="pt-0">
                  {projectMilestones.length === 0 ? (
                    <EmptyState
                      title="No milestones scheduled"
                      description="Milestones will appear once a construction schedule is configured."
                    />
                  ) : (
                    <ul className="divide-y divide-[#E6E0D5]">
                      {projectMilestones.map((ms) => (
                        <li
                          key={ms.id}
                          className="flex items-start justify-between gap-4 py-3 first:pt-1 last:pb-0"
                        >
                          <div className="flex items-start gap-3 min-w-0">
                            <button
                              type="button"
                              onClick={() => toggleMilestoneStatus(ms.id)}
                              title="Toggle milestone completion"
                              className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-[3px] border transition-colors cursor-pointer ${
                                ms.status === 'Completed'
                                  ? 'border-[#5E6951] bg-[#5E6951] text-white'
                                  : 'border-[#BFB7A8] bg-[#FFFFFF] text-transparent hover:border-[#C66A3D]'
                              }`}
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />
                            </button>
                            <div className="min-w-0">
                              <p
                                className={`text-sm font-medium ${
                                  ms.status === 'Completed'
                                    ? 'text-[#77766F] line-through'
                                    : 'text-[#252A27]'
                                }`}
                              >
                                <span className="font-mono text-xs text-[#77766F] mr-1.5">
                                  0{ms.stageOrder}
                                </span>
                                {ms.title}
                              </p>
                              <p className="mt-0.5 font-mono text-[11px] text-[#77766F] tabular-nums">
                                Target {formatIndianDate(ms.plannedDate)}
                                {ms.actualDate
                                  ? ` · Completed ${formatIndianDate(ms.actualDate)}`
                                  : ` · Weight ${ms.weightPercent}%`}
                              </p>
                              {ms.notes && (
                                <p className="mt-1 text-xs text-[#855A18]">
                                  {ms.notes}
                                </p>
                              )}
                            </div>
                          </div>
                          <Badge
                            variant={
                              ms.status === 'Completed'
                                ? 'green'
                                : ms.status === 'Delayed'
                                ? 'red'
                                : ms.status === 'In Progress'
                                ? 'blue'
                                : 'neutral'
                            }
                          >
                            {ms.status}
                          </Badge>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <p className="arch-label mb-1">Project Ledger</p>
                  <CardTitle>Recent Project Activity</CardTitle>
                  <CardDescription>
                    Chronological log of receipts, bills, purchases, and verified site reports
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  {projectActivities.length === 0 ? (
                    <EmptyState
                      title="No activity logged yet"
                      description="Updates appear automatically when payments, expenses, or progress reports are added."
                    />
                  ) : (
                    <ul className="divide-y divide-[#E6E0D5]">
                      {projectActivities.slice(0, 6).map((act) => (
                        <li
                          key={act.id}
                          className="flex items-start justify-between gap-4 py-3 first:pt-1 last:pb-0"
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-[#252A27]">
                              {act.title}
                            </p>
                            <p className="mt-0.5 text-xs text-[#57564F]">
                              {act.description}
                            </p>
                            <p className="mt-1 font-mono text-[11px] text-[#77766F] tabular-nums">
                              {formatIndianDate(act.date)} · {act.actor}
                            </p>
                          </div>
                          {act.amount !== undefined && (
                            <span className="shrink-0 font-mono text-xs font-semibold text-[#252A27] tabular-nums">
                              {formatINR(act.amount)}
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* 2. QUOTATIONS TAB */}
        <TabsContent value="quotations">
          {projectQuotations.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="No quotations attached yet"
              description="Approved Bill of Quantities (BOQ) and turnkey cost estimates for this project will appear here."
            />
          ) : (
            <div className="space-y-5">
              {projectQuotations.map((quo) => (
                <Card key={quo.id}>
                  <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between pb-3">
                    <div>
                      <CardTitle className="flex items-center gap-2.5">
                        <span className="font-mono">{quo.quotationNumber}</span>
                        <Badge variant={getPaymentStatusVariant(quo.status)}>
                          {quo.status}
                        </Badge>
                      </CardTitle>
                      <CardDescription>
                        {quo.version} · Issued {formatIndianDate(quo.issuedDate)}{' '}
                        · Valid until {formatIndianDate(quo.validUntil)}
                      </CardDescription>
                    </div>
                    <div className="text-left sm:text-right">
                      <p className="arch-label">Quoted Total</p>
                      <p className="font-mono text-lg font-semibold text-[#252A27] tabular-nums">
                        {formatINR(quo.totalAmount)}
                      </p>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Work Package</TableHead>
                          <TableHead>Specification</TableHead>
                          <TableHead className="text-right">Quantity</TableHead>
                          <TableHead className="text-right">Rate (₹)</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {quo.items.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell className="font-medium text-[#252A27]">
                              {item.workPackage}
                            </TableCell>
                            <TableCell className="text-xs text-[#57564F]">
                              {item.specification}
                            </TableCell>
                            <TableCell className="text-right font-mono tabular-nums">
                              {item.quantity.toLocaleString('en-IN')} {item.unit}
                            </TableCell>
                            <TableCell className="text-right font-mono tabular-nums">
                              {formatINR(item.rate)}
                            </TableCell>
                            <TableCell className="text-right font-mono font-medium text-[#252A27] tabular-nums">
                              {formatINR(item.amount)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* 3. PAYMENTS TAB */}
        <TabsContent value="payments">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4 pb-3">
              <div>
                <CardTitle>Customer Payment Schedule</CardTitle>
                <CardDescription>
                  Stage-wise invoices, received UTR references, and overdue balances
                </CardDescription>
              </div>
              <div className="text-right text-xs tabular-nums">
                <span className="text-[#77766F]">Collected: </span>
                <strong className="font-mono text-[#4A543E]">
                  {formatINR(metrics.amountReceived)}
                </strong>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {projectPayments.length === 0 ? (
                <div className="p-5">
                  <EmptyState
                    title="No payment invoices scheduled"
                    description="Create stage-wise billing milestones to track customer receipts."
                  />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice</TableHead>
                      <TableHead>Payment Stage</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Paid Date &amp; Mode</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {projectPayments.map((pay) => (
                      <TableRow key={pay.id}>
                        <TableCell className="font-mono text-xs font-medium text-[#252A27]">
                          {pay.invoiceNumber}
                        </TableCell>
                        <TableCell className="font-medium text-[#252A27]">
                          {pay.stage}
                        </TableCell>
                        <TableCell className="font-mono text-xs tabular-nums whitespace-nowrap">
                          {formatIndianDate(pay.dueDate)}
                        </TableCell>
                        <TableCell className="text-xs text-[#57564F]">
                          {pay.paidDate ? (
                            <div>
                              <span className="font-mono tabular-nums">
                                {formatIndianDate(pay.paidDate)}
                              </span>{' '}
                              · {pay.mode}
                              {pay.referenceNo && (
                                <div className="font-mono text-[11px] text-[#77766F]">
                                  Ref: {pay.referenceNo}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-[#9A978E]">Awaiting receipt</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-mono font-medium text-[#252A27] tabular-nums">
                          {formatINR(pay.amount)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={getPaymentStatusVariant(pay.status)}>
                            {pay.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {pay.status !== 'Received' ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setConfirmPaymentId(pay.id)}
                            >
                              Mark Received
                            </Button>
                          ) : (
                            <span className="font-mono text-xs text-[#77766F]">
                              Cleared
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 4. EXPENSES TAB */}
        <TabsContent value="expenses">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4 pb-3">
              <div>
                <CardTitle>Project Expense Ledger</CardTitle>
                <CardDescription>
                  Materials, site labour musters, equipment rentals, and subcontractor running bills
                </CardDescription>
              </div>
              <div className="text-right text-xs tabular-nums">
                <span className="text-[#77766F]">Total Recorded: </span>
                <strong className="font-mono text-[#252A27]">
                  {formatINR(metrics.recordedExpenses)}
                </strong>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {projectExpenses.length === 0 ? (
                <div className="p-5">
                  <EmptyState
                    title="No expenses recorded for this project"
                    description="Material bills, labour muster settlements, and subcontractor invoices will show here."
                  />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Bill &amp; Category</TableHead>
                      <TableHead>Description &amp; Vendor</TableHead>
                      <TableHead className="text-right">Bill Amount</TableHead>
                      <TableHead className="text-right">Paid</TableHead>
                      <TableHead className="text-right">Balance</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {projectExpenses.map((exp) => {
                      const bal = exp.amount - exp.paidAmount;
                      return (
                        <TableRow key={exp.id}>
                          <TableCell className="font-mono text-xs tabular-nums whitespace-nowrap">
                            {formatIndianDate(exp.date)}
                          </TableCell>
                          <TableCell>
                            <div className="font-mono text-xs font-medium text-[#252A27]">
                              {exp.billNumber}
                            </div>
                            <div className="text-xs text-[#77766F]">
                              {exp.category}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium text-[#252A27]">
                              {exp.description}
                            </div>
                            <div className="text-xs text-[#77766F]">
                              {exp.vendorName} · {exp.paymentMode}
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-mono font-medium text-[#252A27] tabular-nums">
                            {formatINR(exp.amount)}
                          </TableCell>
                          <TableCell className="text-right font-mono text-[#4A543E] tabular-nums">
                            {formatINR(exp.paidAmount)}
                          </TableCell>
                          <TableCell className="text-right font-mono tabular-nums">
                            {bal > 0 ? (
                              <span className="font-medium text-[#9A3026]">
                                {formatINR(bal)}
                              </span>
                            ) : (
                              <span className="text-[#9A978E]">₹0</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={getPaymentStatusVariant(exp.paymentStatus)}
                            >
                              {exp.paymentStatus}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 5. MATERIALS TAB */}
        <TabsContent value="materials">
          <div className="space-y-5">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle>On-Site Material Stock</CardTitle>
                <CardDescription>
                  Current stock balances and reorder level alerts at this construction site
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {projectMaterials.length === 0 ? (
                  <div className="p-5">
                    <EmptyState
                      icon={Package}
                      title="No material stock tracked"
                      description="Add cement, TMT steel, sand, or block inventory records for this site."
                    />
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Material</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead className="text-right">In Stock</TableHead>
                        <TableHead className="text-right">Reorder Level</TableHead>
                        <TableHead className="text-right">Unit Rate</TableHead>
                        <TableHead>Stock Health</TableHead>
                        <TableHead>Updated</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {projectMaterials.map((mat) => {
                        const isLow = mat.currentStock < mat.reorderLevel;
                        return (
                          <TableRow key={mat.id}>
                            <TableCell className="font-medium text-[#252A27]">
                              {mat.name}
                            </TableCell>
                            <TableCell className="text-xs text-[#57564F]">
                              {mat.category}
                            </TableCell>
                            <TableCell className="text-right font-mono font-medium tabular-nums">
                              {mat.currentStock} {mat.unit}
                            </TableCell>
                            <TableCell className="text-right font-mono text-[#77766F] tabular-nums">
                              {mat.reorderLevel} {mat.unit}
                            </TableCell>
                            <TableCell className="text-right font-mono tabular-nums">
                              {formatINR(mat.unitPrice)}
                            </TableCell>
                            <TableCell>
                              <Badge variant={isLow ? 'red' : 'green'}>
                                {isLow ? 'Low Stock' : 'Sufficient'}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-mono text-xs text-[#77766F] tabular-nums">
                              {formatIndianDate(mat.lastUpdated)}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle>Scheduled &amp; Pending Deliveries</CardTitle>
                <CardDescription>
                  Active material purchase orders expected at site
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {projectDeliveries.length === 0 ? (
                  <div className="p-5">
                    <EmptyState
                      icon={Truck}
                      title="No pending deliveries"
                      description="All recent material orders for this site have been received."
                    />
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Material</TableHead>
                        <TableHead>Supplier</TableHead>
                        <TableHead className="text-right">Quantity</TableHead>
                        <TableHead className="text-right">Order Value</TableHead>
                        <TableHead>Expected Date</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {projectDeliveries.map((del) => (
                        <TableRow key={del.id}>
                          <TableCell className="font-medium text-[#252A27]">
                            {del.materialName}
                          </TableCell>
                          <TableCell className="text-xs text-[#57564F]">
                            {del.supplierName}
                          </TableCell>
                          <TableCell className="text-right font-mono tabular-nums">
                            {del.quantity} {del.unit}
                          </TableCell>
                          <TableCell className="text-right font-mono font-medium tabular-nums">
                            {formatINR(del.totalAmount)}
                          </TableCell>
                          <TableCell className="font-mono text-xs tabular-nums">
                            {formatIndianDate(del.expectedDate)}
                          </TableCell>
                          <TableCell>
                            <Badge variant={getPaymentStatusVariant(del.status)}>
                              {del.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 6. WORKERS TAB */}
        <TabsContent value="workers">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Assigned Workforce &amp; Muster Roll</CardTitle>
              <CardDescription>
                Site engineers, masons, bar benders, and trade technicians assigned to {project.name}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {projectWorkers.length === 0 ? (
                <div className="p-5">
                  <EmptyState
                    icon={HardHat}
                    title="No workers currently assigned"
                    description="Assign site supervisors and trade workers to track daily attendance and wages."
                  />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Worker Name</TableHead>
                      <TableHead>Trade / Role</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead className="text-right">Daily Wage</TableHead>
                      <TableHead className="text-right">Days (Nov)</TableHead>
                      <TableHead className="text-right">Pending Wages</TableHead>
                      <TableHead>Today</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {projectWorkers.map((worker) => (
                      <TableRow key={worker.id}>
                        <TableCell className="font-medium text-[#252A27]">
                          {worker.name}
                        </TableCell>
                        <TableCell className="text-[#57564F]">
                          {worker.role}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-[#57564F] tabular-nums">
                          {worker.phone}
                        </TableCell>
                        <TableCell className="text-right font-mono tabular-nums">
                          {formatINR(worker.dailyWage)}
                        </TableCell>
                        <TableCell className="text-right font-mono tabular-nums">
                          {worker.daysWorkedThisMonth} d
                        </TableCell>
                        <TableCell className="text-right font-mono tabular-nums">
                          {worker.pendingWages > 0 ? (
                            <span className="font-medium text-[#A65229]">
                              {formatINR(worker.pendingWages)}
                            </span>
                          ) : (
                            <span className="text-[#9A978E]">Settled</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={getPaymentStatusVariant(
                              worker.attendanceToday
                            )}
                          >
                            {worker.attendanceToday}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 7. PROGRESS TAB */}
        <TabsContent value="progress">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-[#252A27]">
                  Site Progress Logs &amp; Owner Approval Queue
                </h3>
                <p className="text-xs text-[#77766F]">
                  Approve supervisor weekly reports to publish progress to the Client Portal
                </p>
              </div>
              <Button size="sm" onClick={() => setProgressDialogOpen(true)}>
                <ClipboardPlus className="h-3.5 w-3.5" />
                <span>Add Progress Report</span>
              </Button>
            </div>

            {projectProgressReports.length === 0 ? (
              <EmptyState
                title="No site progress reports yet"
                description="Log the first field update to maintain a documented history of construction stages."
                actionLabel="Add Progress Report"
                onAction={() => setProgressDialogOpen(true)}
              />
            ) : (
              <div className="space-y-3">
                {projectProgressReports.map((rep) => {
                  const status = rep.reviewStatus ?? 'Reviewed';
                  return (
                    <Card key={rep.id} className="p-5">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold text-[#252A27]">
                              {rep.stage}
                            </p>
                            {rep.weekLabel && (
                              <span className="font-mono text-xs text-[#77766F]">
                                · {rep.weekLabel}
                              </span>
                            )}
                          </div>
                          <p className="mt-0.5 font-mono text-[11px] text-[#77766F] tabular-nums">
                            {formatIndianDate(rep.reportDate)} · Submitted by{' '}
                            {rep.submittedBy} · {rep.workersOnSite} workers ·{' '}
                            {rep.weather}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={
                              status === 'Reviewed'
                                ? 'green'
                                : status === 'Needs correction'
                                ? 'red'
                                : 'amber'
                            }
                          >
                            {status === 'Reviewed'
                              ? 'Approved (Client Visible)'
                              : status}
                          </Badge>
                          <Badge variant="blue">
                            +{rep.completionDeltaPercent}% progress
                          </Badge>
                        </div>
                      </div>
                      <p className="mt-3 text-sm text-[#3F4340] leading-relaxed">
                        {rep.summary}
                      </p>
                      {rep.notesForOwner && currentUser?.role === 'owner' && (
                        <p className="mt-3 rounded-[4px] border border-[#E4CFA0] bg-[#FAF2E1] px-3 py-2 text-xs text-[#704B12]">
                          <strong>Internal Note for Owner:</strong>{' '}
                          {rep.notesForOwner}
                        </p>
                      )}
                      {currentUser?.role === 'owner' &&
                        status !== 'Reviewed' && (
                          <div className="mt-3.5 flex items-center gap-2 border-t border-[#E6E0D5] pt-3">
                            <Button
                              size="sm"
                              onClick={() =>
                                reviewProgressReport(
                                  rep.id,
                                  'Reviewed',
                                  'Approved and published to Client Portal.'
                                )
                              }
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              <span>Approve &amp; Publish to Client</span>
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                reviewProgressReport(
                                  rep.id,
                                  'Needs correction',
                                  'Please verify stage percentage and attach site photos.'
                                )
                              }
                            >
                              Request Correction
                            </Button>
                          </div>
                        )}
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </TabsContent>

        {/* 8. DOCUMENTS TAB */}
        <TabsContent value="documents">
          <div className="space-y-5">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle>
                  Supervisor Uploaded Photos, Bills &amp; Receipts (
                  {projectSiteUploads.length})
                </CardTitle>
                <CardDescription>
                  Field uploads submitted by site supervisors. Approve client-visible items to publish them in the Client Portal.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {projectSiteUploads.length === 0 ? (
                  <div className="p-5">
                    <EmptyState
                      icon={FileText}
                      title="No supervisor uploads for this site yet"
                      description="When supervisors upload site photos, bills, or delivery receipts, they appear here for review."
                    />
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Title &amp; Stage</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>File &amp; Reference</TableHead>
                        <TableHead>Uploaded By</TableHead>
                        <TableHead>Client Portal</TableHead>
                        <TableHead>Review Status</TableHead>
                        <TableHead className="text-right">Owner Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {projectSiteUploads.map((upl) => (
                        <TableRow key={upl.id}>
                          <TableCell>
                            <div className="font-medium text-[#252A27]">
                              {upl.title}
                            </div>
                            <div className="text-xs text-[#77766F]">
                              {upl.stage} · {upl.weekLabel}
                            </div>
                          </TableCell>
                          <TableCell className="text-xs text-[#57564F]">
                            {upl.category}
                          </TableCell>
                          <TableCell>
                            <div className="font-mono text-xs text-[#57564F]">
                              {upl.fileName}
                            </div>
                            {upl.billAmount ? (
                              <div className="font-mono text-xs font-medium text-[#252A27]">
                                {formatINR(upl.billAmount)}{' '}
                                {upl.vendorName ? `· ${upl.vendorName}` : ''}
                              </div>
                            ) : null}
                          </TableCell>
                          <TableCell className="text-xs text-[#57564F]">
                            <div>{upl.uploadedBy}</div>
                            <div className="font-mono text-[#77766F] tabular-nums">
                              {formatIndianDate(upl.uploadDate)}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={upl.clientVisible ? 'blue' : 'neutral'}>
                              {upl.clientVisible ? 'Client Visible' : 'Internal Only'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                upl.reviewStatus === 'Reviewed'
                                  ? 'green'
                                  : upl.reviewStatus === 'Needs correction'
                                  ? 'red'
                                  : 'amber'
                              }
                            >
                              {upl.reviewStatus}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            {currentUser?.role === 'owner' &&
                            upl.reviewStatus !== 'Reviewed' ? (
                              <div className="inline-flex items-center gap-1.5">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() =>
                                    reviewSiteUpload(
                                      upl.id,
                                      'Reviewed',
                                      'Verified by Owner'
                                    )
                                  }
                                >
                                  Approve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() =>
                                    reviewSiteUpload(
                                      upl.id,
                                      'Needs correction',
                                      'Please re-upload clearer copy'
                                    )
                                  }
                                >
                                  Return
                                </Button>
                              </div>
                            ) : (
                              <span className="font-mono text-xs text-[#77766F]">
                                Verified
                              </span>
                            )}
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
                <CardTitle>
                  Project Drawings, Permits &amp; Contracts (
                  {projectDocuments.length})
                </CardTitle>
                <CardDescription>
                  Controlled architectural drawings, municipal sanctions, soil test reports, and signed contracts
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {projectDocuments.length === 0 ? (
                  <div className="p-5">
                    <EmptyState
                      icon={FileText}
                      title="No project documents uploaded"
                      description="Store municipal sanctions, RCC drawings, and customer agreements in one place."
                    />
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Document Title</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>File Name</TableHead>
                        <TableHead>Version</TableHead>
                        <TableHead>Uploaded By</TableHead>
                        <TableHead className="text-right">Size</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {projectDocuments.map((doc) => (
                        <TableRow key={doc.id}>
                          <TableCell className="font-medium text-[#252A27]">
                            {doc.title}
                          </TableCell>
                          <TableCell className="text-xs text-[#57564F]">
                            {doc.category}
                          </TableCell>
                          <TableCell className="font-mono text-xs text-[#57564F]">
                            {doc.fileName ??
                              `${doc.title.toLowerCase().replace(/\s+/g, '_')}.pdf`}
                          </TableCell>
                          <TableCell>
                            <Badge variant="neutral">
                              {doc.version ?? 'v1.0'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-[#57564F]">
                            <div>{doc.uploadedBy}</div>
                            <div className="font-mono text-[#77766F] tabular-nums">
                              {formatIndianDate(doc.uploadedDate)}
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs text-[#57564F] tabular-nums">
                            {doc.fileSize}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Edit Project Dialog */}
      <ProjectFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        initialProject={project}
        onSubmit={(values) => {
          updateProject(project.id, values);
          assignProjectToSupervisor(project.id, values.siteManager);
        }}
      />

      {/* Assign Supervisor & Client Portal Dialog */}
      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Assign Supervisor &amp; Client Account</DialogTitle>
            <DialogDescription>
              Connect {project.name} to a site supervisor and a client portal account so both roles can access this project.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              let targetCredId = selectedClientCredId;
              if (selectedClientCredId === 'auto_create') {
                const baseUser =
                  project.customerName
                    .trim()
                    .toLowerCase()
                    .replace(/[^a-z0-9]+/g, '.')
                    .replace(/^\.|\.$/g, '')
                    .split('.')[0] || 'client';
                const createdCred = createClientCredential({
                  customerId: project.customerId,
                  customerName: project.customerName,
                  email: `${baseUser}@client.buildflow.in`,
                  phone: project.customerPhone,
                  username: `${baseUser}.client`,
                  assignedProjectIds: [project.id],
                  accountStatus: 'Active',
                });
                syncClientCredentialUser(createdCred);
                targetCredId = createdCred.id;
              }
              const updatedCred = assignProjectRoles(
                project.id,
                selectedSupervisor,
                targetCredId !== 'none' ? targetCredId : undefined
              );
              assignProjectToSupervisor(project.id, selectedSupervisor);
              if (updatedCred) {
                syncClientCredentialUser(updatedCred);
              }
              setAssignBanner(
                `Assigned ${project.name} to Supervisor ${selectedSupervisor}${
                  updatedCred
                    ? ` and Client Account @${updatedCred.username}`
                    : ''
                }.`
              );
              setAssignOpen(false);
            }}
          >
            <div className="px-6 py-5 space-y-4">
              <div className="space-y-1.5">
                <Label>Assigned Site Supervisor</Label>
                <Select
                  value={selectedSupervisor}
                  onValueChange={setSelectedSupervisor}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Prakash Gowda">
                      Prakash Gowda (Senior Site Supervisor)
                    </SelectItem>
                    <SelectItem value="Manjunath R">
                      Manjunath R (Site Engineer)
                    </SelectItem>
                    <SelectItem value="Vikram Menon">
                      Vikram Menon (Owner / Principal Engineer)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Assigned Client Portal Account</Label>
                <Select
                  value={selectedClientCredId}
                  onValueChange={setSelectedClientCredId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select client account" />
                  </SelectTrigger>
                  <SelectContent>
                    {clientCredentials.map((cred) => (
                      <SelectItem key={cred.id} value={cred.id}>
                        {cred.customerName} (@{cred.username})
                      </SelectItem>
                    ))}
                    <SelectItem value="auto_create">
                      + Create &amp; Link New Client Account for{' '}
                      {project.customerName}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setAssignOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit">Save Role Assignment</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Confirm Mark Payment Received Dialog */}
      <ConfirmActionDialog
        open={Boolean(confirmPaymentId)}
        onOpenChange={(open) => !open && setConfirmPaymentId(null)}
        title="Confirm Customer Payment Receipt"
        description="Are you sure you want to mark this milestone invoice as Received? This immediately updates the project's collected balance and the Client Portal payment ledger."
        confirmLabel="Mark Payment Received"
        variant="success"
        onConfirm={() => {
          if (confirmPaymentId) {
            markPaymentReceived(confirmPaymentId);
            setConfirmPaymentId(null);
          }
        }}
      />

      {/* Add Progress Report Dialog */}
      <Dialog open={progressDialogOpen} onOpenChange={setProgressDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Log Site Progress Report</DialogTitle>
            <DialogDescription>
              Record daily or weekly stage progress for {project.name}.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmitProgress}>
            <div className="px-6 py-5 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="pr-stage">Work Stage *</Label>
                <Input
                  id="pr-stage"
                  placeholder="e.g. Second Floor Electrical Concealing"
                  value={reportStage}
                  onChange={(e) => setReportStage(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="pr-workers">Workers</Label>
                  <Input
                    id="pr-workers"
                    type="number"
                    min={1}
                    value={reportWorkers}
                    onChange={(e) => setReportWorkers(e.target.value)}
                    className="tabular-nums"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="pr-delta">Progress +%</Label>
                  <Input
                    id="pr-delta"
                    type="number"
                    min={0}
                    max={25}
                    value={reportDelta}
                    onChange={(e) => setReportDelta(e.target.value)}
                    className="tabular-nums"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Weather</Label>
                  <Select
                    value={reportWeather}
                    onValueChange={(v) =>
                      setReportWeather(
                        v as 'Clear' | 'Partly Cloudy' | 'Light Rain'
                      )
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Clear">Clear</SelectItem>
                      <SelectItem value="Partly Cloudy">
                        Partly Cloudy
                      </SelectItem>
                      <SelectItem value="Light Rain">Light Rain</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="pr-summary">Site Summary *</Label>
                <Textarea
                  id="pr-summary"
                  placeholder="Describe completed structural/finishing tasks, material usage, or site blockers..."
                  value={reportSummary}
                  onChange={(e) => setReportSummary(e.target.value)}
                />
              </div>

              {reportError && (
                <p className="text-xs text-[#9A3026]">{reportError}</p>
              )}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setProgressDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit">Submit Report</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
