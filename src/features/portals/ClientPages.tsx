import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  Camera,
  CheckCircle2,
  Clock,
  CloudSun,
  Eye,
  FileText,
  FolderOpen,
  Hammer,
  Layers,
  Lock,
  MapPin,
  Printer,
  Receipt,
} from 'lucide-react';
import { useAuth } from '@/src/context/AuthContext';
import { useBuildFlow } from '@/src/context/BuildFlowContext';
import {
  getProjectCoverImage,
  SITE_GALLERY_FALLBACKS,
} from '@/src/data/projectVisuals';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/src/components/ui/dialog';
import { EmptyState, ProgressBar } from '@/src/components/ui/feedback';
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
import type { StandardMilestoneStage } from '@/src/types';

interface PreviewModalItem {
  id: string;
  title: string;
  category:
    | 'Progress photo'
    | 'Approved bill'
    | 'Payment receipt'
    | 'Project document'
    | 'Weekly report';
  date: string;
  stage?: string;
  weekLabel?: string;
  fileName?: string;
  amount?: number;
  reference?: string;
  description: string;
  uploadedBy: string;
  imageSrc?: string;
}

const STANDARD_STAGES: StandardMilestoneStage[] = [
  'Foundation',
  'Brickwork',
  'Roof slab',
  'Plumbing and electrical',
  'Plastering',
  'Flooring',
  'Painting',
  'Final handover',
];

/**
 * Strictly scopes all client portal queries to the authenticated client's
 * assignedProjectIds. Never exposes worker salaries, wage records,
 * internal contractor profit, or other clients' projects.
 */
function useClientPortalScope() {
  const { currentUser } = useAuth();
  const store = useBuildFlow();

  const assignedProjects = useMemo(() => {
    if (!currentUser) return [];
    if (currentUser.role === 'owner') return store.projects;
    const allowedIds = currentUser.assignedProjectIds ?? [];
    return store.projects.filter((p) => allowedIds.includes(p.id));
  }, [currentUser, store.projects]);

  const [selectedProjectId, setSelectedProjectId] = useState<string>('');

  const project = useMemo(() => {
    if (assignedProjects.length === 0) return undefined;
    return (
      assignedProjects.find((p) => p.id === selectedProjectId) ??
      assignedProjects[0]
    );
  }, [assignedProjects, selectedProjectId]);

  const pid = project?.id ?? '';

  const milestones = useMemo(
    () =>
      store.milestones
        .filter((m) => m.projectId === pid)
        .sort((a, b) => a.stageOrder - b.stageOrder),
    [store.milestones, pid],
  );

  // Only show client-facing progress reports approved by Owner (Reviewed; never expose internal notesForOwner)
  const reports = useMemo(
    () =>
      store.progressReports
        .filter(
          (r) =>
            r.projectId === pid &&
            (r.reviewStatus === 'Reviewed' || !r.reviewStatus),
        )
        .sort((a, b) => b.reportDate.localeCompare(a.reportDate)),
    [store.progressReports, pid],
  );

  const photos = useMemo(
    () =>
      store.sitePhotos
        .filter(
          (p) =>
            p.projectId === pid &&
            p.clientVisible &&
            (p.reviewStatus === 'Reviewed' || !p.reviewStatus),
        )
        .sort((a, b) => b.capturedDate.localeCompare(a.capturedDate)),
    [store.sitePhotos, pid],
  );

  const payments = useMemo(
    () =>
      store.payments
        .filter((p) => p.projectId === pid)
        .sort((a, b) => a.dueDate.localeCompare(b.dueDate)),
    [store.payments, pid],
  );

  const documents = useMemo(
    () =>
      store.documents
        .filter((d) => d.projectId === pid)
        .sort((a, b) => b.uploadedDate.localeCompare(a.uploadedDate)),
    [store.documents, pid],
  );

  // Only expose Supervisor uploads that are explicitly clientVisible AND Reviewed by Owner
  const approvedClientUploads = useMemo(
    () =>
      store.siteUploads
        .filter(
          (u) =>
            u.projectId === pid &&
            u.clientVisible &&
            u.reviewStatus === 'Reviewed',
        )
        .sort((a, b) => b.uploadDate.localeCompare(a.uploadDate)),
    [store.siteUploads, pid],
  );

  const variations = useMemo(
    () => store.clientVariations.filter((v) => v.projectId === pid),
    [store.clientVariations, pid],
  );

  // Derived payment totals (no hardcoded contradictory numbers)
  const financials = useMemo(() => {
    const contractAmount = project?.contractValue ?? 0;
    const approvedVariationsAmount = variations
      .filter((v) => v.status === 'Approved')
      .reduce((sum, v) => sum + v.amount, 0);
    const totalAmountDue = contractAmount + approvedVariationsAmount;
    const amountPaid = payments
      .filter((p) => p.status === 'Received')
      .reduce((sum, p) => sum + p.amount, 0);
    const outstandingAmount = Math.max(0, totalAmountDue - amountPaid);
    const upcomingPayments = payments.filter((p) => p.status !== 'Received');
    const nextUpcomingPayment = upcomingPayments[0];

    return {
      contractAmount,
      approvedVariationsAmount,
      totalAmountDue,
      amountPaid,
      outstandingAmount,
      upcomingPayments,
      nextUpcomingPayment,
    };
  }, [project, variations, payments]);

  return {
    currentUser,
    assignedProjects,
    project,
    setSelectedProjectId,
    milestones,
    reports,
    photos,
    payments,
    documents,
    approvedClientUploads,
    variations,
    financials,
  };
}

function ClientProjectSelector({
  assignedProjects,
  activeProjectId,
  onSelect,
}: {
  assignedProjects: Array<{ id: string; code: string; name: string }>;
  activeProjectId: string;
  onSelect: (id: string) => void;
}) {
  if (assignedProjects.length <= 1) return null;
  return (
    <div className="w-[240px]">
      <Select value={activeProjectId} onValueChange={onSelect}>
        <SelectTrigger>
          <SelectValue placeholder="Switch Project" />
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
  );
}

function ClientPrivacyNotice({ projectName }: { projectName: string }) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-2 rounded-[4px] border border-[#D8D1C5] bg-[#FAF8F3] px-4 py-2.5 text-xs text-[#57564F]">
      <div className="flex items-center gap-2">
        <Lock className="h-3.5 w-3.5 text-[#A65229] shrink-0" />
        <span>
          Homeowner Dossier scoped strictly to{' '}
          <strong className="text-[#252A27]">{projectName}</strong>. Verified site progress, approved bills, and payment receipts only.
        </span>
      </div>
      <Badge variant="blue">Client Portal</Badge>
    </div>
  );
}

function ClientFilePreviewModal({
  item,
  open,
  onOpenChange,
  projectName,
}: {
  item: PreviewModalItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectName: string;
}) {
  if (!item) return null;

  const fallbackPhoto = SITE_GALLERY_FALLBACKS[0];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="blue">{item.category}</Badge>
            {item.stage && <Badge variant="neutral">{item.stage}</Badge>}
            {item.weekLabel && <Badge variant="green">{item.weekLabel}</Badge>}
          </div>
          <DialogTitle className="mt-1.5">{item.title}</DialogTitle>
          <DialogDescription>
            {projectName} · {formatIndianDate(item.date)} · Uploaded by {item.uploadedBy}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 px-6 py-4 overflow-y-auto">
          {item.category === 'Progress photo' ? (
            <div className="overflow-hidden rounded-[6px] border border-[#D8D1C5] bg-[#FAF8F3]">
              <div className="aspect-[16/10] w-full overflow-hidden bg-[#EAE4D9]">
                <img
                  src={item.imageSrc ?? fallbackPhoto.src}
                  alt={item.title}
                  referrerPolicy="no-referrer"
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="p-4">
                <p className="text-sm font-semibold text-[#252A27]">{item.title}</p>
                <p className="mt-0.5 font-mono text-[11px] text-[#77766F]">
                  {item.fileName ?? `${item.id}.jpg`}
                </p>
                <p className="mt-2.5 text-xs text-[#57564F] leading-relaxed">
                  {item.description}
                </p>
              </div>
            </div>
          ) : (
            <div className="rounded-[6px] border border-[#D8D1C5] bg-[#FAF8F3] p-4 space-y-3">
              <div className="flex items-start justify-between border-b border-[#E6E0D5] pb-2.5">
                <div>
                  <p className="arch-label">
                    BuildFlow Verified Client Copy
                  </p>
                  <p className="mt-0.5 text-sm font-semibold text-[#252A27]">
                    {item.title}
                  </p>
                </div>
                <Badge variant="green">Verified</Badge>
              </div>
              <p className="text-xs leading-relaxed text-[#3F4340]">
                {item.description}
              </p>
              {item.amount !== undefined && (
                <div className="flex items-center justify-between rounded-[4px] border border-[#D8D1C5] bg-[#FFFFFF] px-3 py-2">
                  <span className="text-xs text-[#77766F]">Approved Amount</span>
                  <span className="font-mono text-sm font-bold text-[#252A27] tabular-nums">
                    {formatINR(item.amount)}
                  </span>
                </div>
              )}
              {item.reference && (
                <p className="font-mono text-xs text-[#77766F]">
                  Reference: {item.reference}
                </p>
              )}
            </div>
          )}

          <div className="flex items-center justify-between rounded-[4px] border border-[#E6E0D5] bg-[#FAF8F3] px-3 py-2 font-mono text-[10.5px] text-[#77766F]">
            <span>
              Vault Ref: {item.fileName ?? item.id}
            </span>
            <span>Read-Only Homeowner Copy</span>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="h-3.5 w-3.5" />
            <span>Print / Save PDF</span>
          </Button>
          <Button size="sm" onClick={() => onOpenChange(false)}>
            Close Preview
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ============================================================================
 * 1. CLIENT DASHBOARD (/client)
 * ========================================================================== */
export function ClientDashboardPage() {
  const {
    assignedProjects,
    project,
    setSelectedProjectId,
    milestones,
    reports,
    photos,
    financials,
  } = useClientPortalScope();

  const [previewItem, setPreviewItem] = useState<PreviewModalItem | null>(null);

  if (!project) {
    return (
      <PageContainer>
        <EmptyState
          icon={Building2}
          title="No assigned project found"
          description="Your homeowner account does not have an assigned construction project yet."
        />
      </PageContainer>
    );
  }

  const completedMilestones = milestones.filter((m) => m.status === 'Completed');
  const remainingMilestones = milestones.filter((m) => m.status !== 'Completed');
  const latestReport = reports[0];

  return (
    <PageContainer>
      <PageHeader
        title={project.name}
        description={`${project.code} · ${project.siteAddress} · Target Handover ${formatIndianDate(
          project.estimatedCompletionDate,
        )}`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <ClientProjectSelector
              assignedProjects={assignedProjects}
              activeProjectId={project.id}
              onSelect={setSelectedProjectId}
            />
            <Button variant="outline" size="sm" asChild>
              <Link to="/client/progress">Project Progress</Link>
            </Button>
            <Button size="sm" asChild>
              <Link to="/client/payments">
                <span>Payments &amp; Dues</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
        }
      />

      <ClientPrivacyNotice projectName={project.name} />

      {/* Architectural Progress Report Hero & Financial Strip */}
      <section className="mb-6 overflow-hidden rounded-[6px] border border-[#D8D1C5] bg-[#FFFFFF]">
        <div className="grid grid-cols-1 lg:grid-cols-12">
          <div className="lg:col-span-7 p-6 bg-[#FAF8F3] bg-blueprint-grid flex flex-col justify-between gap-5">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs font-semibold uppercase tracking-[0.1em] text-[#A65229]">
                  {project.code}
                </span>
                <Badge variant={getProjectStatusVariant(project.status)}>
                  {project.status}
                </Badge>
                <span className="font-mono text-xs text-[#77766F]">
                  {project.projectType} · {formatArea(project.builtUpAreaSqFt)} · {project.floors} Floors
                </span>
              </div>
              <h2 className="mt-2.5 text-2xl sm:text-[28px] font-semibold tracking-[-0.025em] text-[#252A27]">
                {project.name}
              </h2>
              <p className="mt-1.5 flex items-center gap-1.5 text-xs text-[#57564F]">
                <MapPin className="h-3.5 w-3.5 text-[#77766F] shrink-0" />
                <span>{project.siteAddress}</span>
              </p>

              <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 border-y border-[#D8D1C5] py-3 text-xs text-[#57564F]">
                <span>
                  Site Engineer:{' '}
                  <strong className="text-[#252A27]">{project.siteManager}</strong>
                </span>
                <span>
                  Start:{' '}
                  <strong className="font-mono text-[#252A27] tabular-nums">
                    {formatIndianDate(project.startDate)}
                  </strong>
                </span>
                <span>
                  Planned Handover:{' '}
                  <strong className="font-mono text-[#252A27] tabular-nums">
                    {formatIndianDate(project.estimatedCompletionDate)}
                  </strong>
                </span>
              </div>
            </div>

            <div className="rounded-[4px] border border-[#D8D1C5] bg-[#FFFFFF] p-4">
              <div className="flex items-baseline justify-between">
                <span className="arch-label">
                  Overall Construction Completion
                </span>
                <span className="font-mono text-2xl font-semibold text-[#A65229] tabular-nums">
                  {project.progressPercent}%
                </span>
              </div>
              <ProgressBar
                value={project.progressPercent}
                className="mt-2.5 h-2.5"
                barClassName={
                  project.progressPercent >= 90 ? 'bg-[#6E7A5F]' : 'bg-[#C66A3D]'
                }
              />
              <div className="mt-2 flex items-center justify-between font-mono text-[11px] text-[#77766F] tabular-nums">
                <span>
                  {completedMilestones.length} of {milestones.length} milestones complete
                </span>
                <span>{remainingMilestones.length} stages remaining</span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 border-t border-[#D8D1C5] lg:border-t-0 lg:border-l bg-[#252A27] flex flex-col">
            <div className="flex-1 min-h-[220px] overflow-hidden bg-[#1D211F]">
              <img
                src={getProjectCoverImage(project.id).src}
                alt={getProjectCoverImage(project.id).alt}
                referrerPolicy="no-referrer"
                className="h-full w-full object-cover"
              />
            </div>
            <div className="border-t border-[#363C38] px-4 py-2.5">
              <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-[#A7A49B]">
                Verified Site Progress Frame
              </p>
              <p className="mt-0.5 text-xs text-[#F4F0E8] truncate">
                {getProjectCoverImage(project.id).caption}
              </p>
            </div>
          </div>
        </div>

        {/* Transparent Homeowner Financial Strip */}
        <div className="grid grid-cols-1 divide-y divide-[#E6E0D5] border-t border-[#D8D1C5] sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-4 lg:divide-x">
          <div className="p-5">
            <p className="arch-label">Contract Value</p>
            <p className="mt-1.5 font-mono text-2xl font-semibold text-[#252A27] tabular-nums">
              {formatINR(financials.contractAmount, { compact: true })}
            </p>
            <p className="mt-1 font-mono text-[11px] text-[#77766F] tabular-nums">
              {financials.approvedVariationsAmount > 0
                ? `+ ${formatINR(financials.approvedVariationsAmount, { compact: true })} approved variations`
                : formatINR(financials.contractAmount)}
            </p>
          </div>

          <div className="p-5 sm:border-l sm:border-[#E6E0D5] lg:border-l-0">
            <p className="arch-label">Amount Paid</p>
            <p className="mt-1.5 font-mono text-2xl font-semibold text-[#4A543E] tabular-nums">
              {formatINR(financials.amountPaid, { compact: true })}
            </p>
            <p className="mt-1 font-mono text-[11px] text-[#57564F] tabular-nums">
              {formatINR(financials.amountPaid)} settled
            </p>
          </div>

          <div className="p-5 border-t border-[#E6E0D5] lg:border-t-0">
            <p className="arch-label">Outstanding Balance</p>
            <p className="mt-1.5 font-mono text-2xl font-semibold text-[#A65229] tabular-nums">
              {formatINR(financials.outstandingAmount, { compact: true })}
            </p>
            <p className="mt-1 font-mono text-[11px] text-[#77766F] tabular-nums">
              Total due: {formatINR(financials.totalAmountDue, { compact: true })}
            </p>
          </div>

          <div className="p-5 border-t border-[#E6E0D5] sm:border-l lg:border-t-0 lg:border-l-0 bg-[#FAF8F3]">
            <p className="arch-label">Upcoming Payment Due</p>
            <p className="mt-1.5 font-mono text-2xl font-semibold text-[#252A27] tabular-nums">
              {financials.nextUpcomingPayment
                ? formatINR(financials.nextUpcomingPayment.amount, { compact: true })
                : 'All Clear'}
            </p>
            <p className="mt-1 text-xs text-[#57564F] truncate">
              {financials.nextUpcomingPayment
                ? `${financials.nextUpcomingPayment.stage} · Due ${formatIndianDate(
                    financials.nextUpcomingPayment.dueDate,
                  )}`
                : 'No pending installment'}
            </p>
          </div>
        </div>
      </section>

      {/* Completed Work vs Remaining Work */}
      <div className="mb-5 grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <div>
              <CardTitle>Completed Work</CardTitle>
              <CardDescription>
                Construction stages completed and inspected on site
              </CardDescription>
            </div>
            <Badge variant="green">{completedMilestones.length} Completed</Badge>
          </CardHeader>
          <CardContent className="pt-0">
            <ul className="divide-y divide-slate-100">
              {completedMilestones.map((ms) => (
                <li key={ms.id} className="py-3 first:pt-1 last:pb-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-slate-900">
                      {ms.stageCategory ?? ms.title}
                    </span>
                    <span className="text-xs text-emerald-700 tabular-nums">
                      Completed {formatIndianDate(ms.actualDate ?? ms.plannedDate)}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                    {ms.completedWorkDescription ?? ms.title}
                  </p>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <div>
              <CardTitle>Remaining Work</CardTitle>
              <CardDescription>
                In-progress and upcoming residential construction milestones
              </CardDescription>
            </div>
            <Badge variant="blue">{remainingMilestones.length} Remaining</Badge>
          </CardHeader>
          <CardContent className="pt-0">
            <ul className="divide-y divide-slate-100">
              {remainingMilestones.map((ms) => (
                <li key={ms.id} className="py-3 first:pt-1 last:pb-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-slate-900">
                        {ms.stageCategory ?? ms.title}
                      </span>
                      <Badge
                        variant={
                          ms.status === 'In Progress'
                            ? 'blue'
                            : ms.status === 'Delayed'
                            ? 'red'
                            : 'neutral'
                        }
                      >
                        {ms.status} ({ms.actualProgressPercent ?? 0}%)
                      </Badge>
                    </div>
                    <span className="text-xs text-slate-500 tabular-nums">
                      Target {formatIndianDate(ms.plannedDate)}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                    {ms.remainingWorkDescription ?? ms.expectedNextActivity ?? ms.title}
                  </p>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Latest Weekly Report & Latest Site Photos */}
      <div className="mb-5 grid grid-cols-1 gap-5 lg:grid-cols-12">
        <Card className="lg:col-span-6">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <div>
              <CardTitle>Latest Weekly Report</CardTitle>
              <CardDescription>
                Most recent progress summary from your site engineer
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link to="/client/weekly-reports">All Reports</Link>
            </Button>
          </CardHeader>
          <CardContent className="pt-0">
            {latestReport ? (
              <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50/70 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Badge variant="blue">{latestReport.stage}</Badge>
                  <span className="text-xs text-slate-500 tabular-nums">
                    {latestReport.weekStartDate && latestReport.weekEndDate
                      ? `${formatIndianDate(latestReport.weekStartDate)} – ${formatIndianDate(
                          latestReport.weekEndDate,
                        )}`
                      : formatIndianDate(latestReport.reportDate)}
                  </span>
                </div>
                <p className="text-sm font-medium text-slate-900 leading-relaxed">
                  {latestReport.clientVisibleSummary ?? latestReport.summary}
                </p>
                {latestReport.workCompleted && (
                  <div className="rounded border border-emerald-200 bg-emerald-50/60 p-2.5 text-xs text-emerald-950">
                    <strong>Completed: </strong>
                    {latestReport.workCompleted}
                  </div>
                )}
                {latestReport.nextDayPlan && (
                  <div className="rounded border border-slate-200 bg-white p-2.5 text-xs text-slate-700">
                    <strong>Next Week&apos;s Plan: </strong>
                    {latestReport.nextDayPlan}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-slate-500">No weekly reports published yet.</p>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-6">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <div>
              <CardTitle>Latest Site Photos</CardTitle>
              <CardDescription>
                Inspection photographs shared from your site
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link to="/client/photos">All Photos</Link>
            </Button>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {photos.slice(0, 4).map((photo, idx) => {
                const visual = SITE_GALLERY_FALLBACKS[idx % SITE_GALLERY_FALLBACKS.length];
                return (
                  <button
                    key={photo.id}
                    type="button"
                    onClick={() =>
                      setPreviewItem({
                        id: photo.id,
                        title: photo.title,
                        category: 'Progress photo',
                        date: photo.capturedDate,
                        stage: photo.stage,
                        weekLabel: photo.weekLabel,
                        fileName: photo.fileName,
                        description: photo.caption,
                        uploadedBy: photo.uploadedBy,
                        imageSrc: visual.src,
                      })
                    }
                    className="group overflow-hidden rounded-[6px] border border-[#D8D1C5] bg-[#FFFFFF] text-left transition hover:border-[#C66A3D] cursor-pointer flex flex-col"
                  >
                    <div className="aspect-[16/9] w-full overflow-hidden border-b border-[#E6E0D5] bg-[#EAE4D9]">
                      <img
                        src={visual.src}
                        alt={photo.title}
                        referrerPolicy="no-referrer"
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                      />
                    </div>
                    <div className="p-3 flex-1 flex flex-col justify-between">
                      <div>
                        <span className="text-xs font-semibold text-[#252A27] line-clamp-1">
                          {photo.title}
                        </span>
                        <p className="mt-1 text-xs text-[#57564F] line-clamp-2">
                          {photo.caption}
                        </p>
                      </div>
                      <div className="mt-2 flex items-center justify-between border-t border-[#E6E0D5] pt-2 font-mono text-[10.5px] text-[#77766F]">
                        <span>{photo.stage}</span>
                        <span>{formatIndianDate(photo.capturedDate)}</span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Important Project Milestones */}
      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <div>
            <CardTitle>Important Project Milestones</CardTitle>
            <CardDescription>
              8-stage residential construction schedule from Foundation to Final Handover
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link to="/client/progress">Full Progress Details</Link>
          </Button>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {milestones.map((ms) => (
              <div
                key={ms.id}
                className="rounded-lg border border-slate-200 bg-slate-50/60 p-3.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-slate-900">
                    {ms.stageOrder}. {ms.stageCategory ?? ms.title}
                  </span>
                  <Badge
                    variant={
                      ms.status === 'Completed'
                        ? 'green'
                        : ms.status === 'In Progress'
                        ? 'blue'
                        : ms.status === 'Delayed'
                        ? 'red'
                        : 'neutral'
                    }
                  >
                    {ms.actualProgressPercent ?? 0}%
                  </Badge>
                </div>
                <ProgressBar
                  value={ms.actualProgressPercent ?? 0}
                  className="mt-2"
                />
                <p className="mt-2 text-[11px] text-slate-500">
                  Target: {formatIndianDate(ms.plannedDate)}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <ClientFilePreviewModal
        item={previewItem}
        open={Boolean(previewItem)}
        onOpenChange={(open) => !open && setPreviewItem(null)}
        projectName={project.name}
      />
    </PageContainer>
  );
}

/* ============================================================================
 * 2. MY PROJECT (/client/project)
 * ========================================================================== */
export function ClientProjectPage() {
  const { assignedProjects, project, setSelectedProjectId, milestones } =
    useClientPortalScope();

  if (!project) return null;

  return (
    <PageContainer>
      <PageHeader
        title="My Project Specifications"
        description={`Turnkey residential build details for ${project.name}`}
        actions={
          <ClientProjectSelector
            assignedProjects={assignedProjects}
            activeProjectId={project.id}
            onSelect={setSelectedProjectId}
          />
        }
      />

      <ClientPrivacyNotice projectName={project.name} />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        <Card className="lg:col-span-6 p-5 space-y-3">
          <h3 className="text-sm font-semibold text-slate-900">
             Architectural &amp; Contract Profile
          </h3>
          <dl className="divide-y divide-slate-100 text-xs">
            <div className="flex justify-between py-2.5">
              <dt className="text-slate-500">Project Code</dt>
              <dd className="font-mono font-medium text-slate-900">{project.code}</dd>
            </div>
            <div className="flex justify-between py-2.5">
              <dt className="text-slate-500">Homeowner</dt>
              <dd className="font-medium text-slate-900">{project.customerName}</dd>
            </div>
            <div className="flex justify-between py-2.5">
              <dt className="text-slate-500">Site Address</dt>
              <dd className="font-medium text-slate-900 text-right max-w-xs">
                {project.siteAddress}
              </dd>
            </div>
            <div className="flex justify-between py-2.5">
              <dt className="text-slate-500">Structure Type &amp; Built-up Area</dt>
              <dd className="font-medium text-slate-900">
                {project.projectType} · {formatArea(project.builtUpAreaSqFt)} ({project.floors} Floors)
              </dd>
            </div>
            <div className="flex justify-between py-2.5">
              <dt className="text-slate-500">Contract Method</dt>
              <dd className="font-medium text-slate-900">{project.pricingMethod}</dd>
            </div>
            <div className="flex justify-between py-2.5">
              <dt className="text-slate-500">Assigned Site Engineer</dt>
              <dd className="font-medium text-slate-900">{project.siteManager}</dd>
            </div>
            <div className="flex justify-between py-2.5">
              <dt className="text-slate-500">Start &amp; Target Handover</dt>
              <dd className="font-medium text-slate-900 tabular-nums">
                {formatIndianDate(project.startDate)} →{' '}
                {formatIndianDate(project.estimatedCompletionDate)}
              </dd>
            </div>
          </dl>
        </Card>

        <Card className="lg:col-span-6 p-5 space-y-3">
          <h3 className="text-sm font-semibold text-slate-900">
            Scope Summary &amp; Stage Weights
          </h3>
          <p className="text-xs text-slate-600 leading-relaxed">{project.notes}</p>
          <div className="pt-2 space-y-2.5">
            {milestones.map((m) => (
              <div key={m.id} className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="font-medium text-slate-800">
                    {m.stageOrder}. {m.stageCategory ?? m.title} ({m.weightPercent}% weight)
                  </span>
                  <span className="font-mono font-semibold text-slate-900">
                    {m.actualProgressPercent ?? 0}%
                  </span>
                </div>
                <ProgressBar value={m.actualProgressPercent ?? 0} />
              </div>
            ))}
          </div>
        </Card>
      </div>
    </PageContainer>
  );
}

/* ============================================================================
 * 3. PROJECT PROGRESS (/client/progress)
 * ========================================================================== */
export function ClientWorkProgressPage() {
  const { assignedProjects, project, setSelectedProjectId, milestones } =
    useClientPortalScope();

  if (!project) return null;

  // Map all 8 standard construction milestones so foundation through final handover are always clear
  const fullMilestones = STANDARD_STAGES.map((stageName, idx) => {
    const found =
      milestones.find((m) => m.stageCategory === stageName) ?? milestones[idx];
    if (found) return found;
    return {
      id: `std-${stageName}`,
      projectId: project.id,
      title: stageName,
      stageCategory: stageName,
      stageOrder: idx + 1,
      plannedDate: project.estimatedCompletionDate,
      plannedProgressPercent: 0,
      actualProgressPercent: 0,
      weightPercent: 10,
      status: 'Upcoming' as const,
      completedWorkDescription: 'Not yet started.',
      remainingWorkDescription: `Complete ${stageName.toLowerCase()} works as per schedule.`,
      expectedNextActivity: 'Scheduled after preceding milestone sign-off.',
    };
  });

  return (
    <PageContainer>
      <PageHeader
        title="Work Progress & Milestones"
        description={`Stage-by-stage planned vs actual completion, completed & remaining work, and delay notes for ${project.name}`}
        actions={
          <ClientProjectSelector
            assignedProjects={assignedProjects}
            activeProjectId={project.id}
            onSelect={setSelectedProjectId}
          />
        }
      />

      <ClientPrivacyNotice projectName={project.name} />

      <div className="space-y-4">
        {fullMilestones.map((ms) => {
          const actualPct =
            ms.actualProgressPercent ?? (ms.status === 'Completed' ? 100 : 0);
          const plannedPct = ms.plannedProgressPercent ?? actualPct;

          return (
            <Card key={ms.id} className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-xs font-semibold text-slate-700">
                      Stage 0{ms.stageOrder}
                    </span>
                    <h3 className="text-base font-bold text-slate-900">
                      {ms.stageCategory ?? ms.title}
                    </h3>
                    <Badge
                      variant={
                        ms.status === 'Completed'
                          ? 'green'
                          : ms.status === 'In Progress'
                          ? 'blue'
                          : ms.status === 'Delayed'
                          ? 'red'
                          : 'neutral'
                      }
                    >
                      {ms.status}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-slate-600">{ms.title}</p>
                  <div className="mt-2 flex flex-wrap gap-5 text-xs text-slate-500">
                    <span>
                      Planned Completion:{' '}
                      <strong className="text-slate-900">
                        {formatIndianDate(ms.plannedDate)}
                      </strong>{' '}
                      (Planned {plannedPct}%)
                    </span>
                    <span>
                      Actual Completion:{' '}
                      <strong className="text-emerald-700">
                        {ms.actualDate ? formatIndianDate(ms.actualDate) : `${actualPct}% Complete`}
                      </strong>
                    </span>
                  </div>
                </div>

                <div className="min-w-[180px] text-right">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Progress Percentage</span>
                    <span className="font-mono text-sm font-bold text-slate-900">
                      {actualPct}%
                    </span>
                  </div>
                  <ProgressBar value={actualPct} className="mt-1.5" />
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
                <div className="rounded-lg border border-slate-100 bg-slate-50/70 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700">
                    Completed Work Description
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-700">
                    {ms.completedWorkDescription ?? 'Completed as per drawing specifications.'}
                  </p>
                </div>

                <div className="rounded-lg border border-slate-100 bg-slate-50/70 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-[#A65229]">
                    Remaining Work Description
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-700">
                    {ms.remainingWorkDescription ??
                      (ms.status === 'Completed'
                        ? 'None — stage 100% completed.'
                        : 'Remaining tasks scheduled per blueprint.')}
                  </p>
                </div>

                <div className="rounded-lg border border-slate-100 bg-slate-50/70 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-600">
                    Expected Next Activity
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-700">
                    {ms.expectedNextActivity ?? 'Proceed to next milestone.'}
                  </p>
                </div>
              </div>

              {ms.notes && (
                <div className="mt-3 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-xs text-amber-900">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                  <div>
                    <span className="font-semibold">
                      {ms.status === 'Delayed' ? 'Delay Note: ' : 'Engineer Note: '}
                    </span>
                    {ms.notes}
                  </div>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </PageContainer>
  );
}

/* ============================================================================
 * 4. WEEKLY REPORTS (/client/weekly-reports)
 * ========================================================================== */
export function ClientWeeklyReportsPage() {
  const {
    assignedProjects,
    project,
    setSelectedProjectId,
    reports,
    photos,
    documents,
    approvedClientUploads,
  } = useClientPortalScope();

  const [previewItem, setPreviewItem] = useState<PreviewModalItem | null>(null);

  if (!project) return null;

  return (
    <PageContainer>
      <PageHeader
        title="Weekly Progress Reports"
        description={`Weekly site reports with completed work, remaining work, materials, site conditions, delays, next week's plan, and verified attachments for ${project.name}`}
        actions={
          <ClientProjectSelector
            assignedProjects={assignedProjects}
            activeProjectId={project.id}
            onSelect={setSelectedProjectId}
          />
        }
      />

      <ClientPrivacyNotice projectName={project.name} />

      <div className="space-y-4">
        {reports.map((rep) => {
          const attachedPhotos = photos.filter(
            (p) =>
              rep.attachedPhotoIds?.includes(p.id) ||
              p.stage === rep.stage,
          );
          const attachedDocs = documents.filter((d) =>
            rep.attachedDocumentIds?.includes(d.id),
          );
          const approvedBills = approvedClientUploads.filter(
            (u) => u.category === 'Bill' || u.category === 'Receipt',
          );

          return (
            <Card key={rep.id} className="p-5 space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-2 border-b border-slate-100 pb-3.5">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="blue">
                      {rep.weekStartDate && rep.weekEndDate
                        ? `Week: ${formatIndianDate(rep.weekStartDate)} – ${formatIndianDate(
                            rep.weekEndDate,
                          )}`
                        : `Week of ${formatIndianDate(rep.reportDate)}`}
                    </Badge>
                    <Badge variant="neutral">{rep.stage}</Badge>
                    {rep.progressPercent !== undefined && (
                      <Badge variant="green">{rep.progressPercent}% Overall</Badge>
                    )}
                  </div>
                  <h3 className="mt-2 text-base font-bold text-slate-900">
                    {rep.clientVisibleSummary ?? rep.summary}
                  </h3>
                </div>
                <span className="text-xs text-slate-500 tabular-nums">
                  Submitted {formatIndianDate(rep.reportDate)} by {rep.submittedBy}
                </span>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-3.5">
                  <p className="text-xs font-semibold uppercase tracking-wider text-emerald-800">
                    Work Completed
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-800">
                    {rep.workCompleted ?? rep.summary}
                  </p>
                </div>

                <div className="rounded-[4px] border border-[#E7C4B3] bg-[#FBF1EC]/65 p-3.5">
                  <p className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.08em] text-[#9F4E26]">
                    Work Remaining
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-800">
                    {rep.workRemaining ?? rep.workPlanned ?? 'Continuing next stage tasks.'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3.5">
                  <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-600">
                    <Hammer className="h-3.5 w-3.5 text-slate-500" />
                    <span>Materials &amp; Site Activities</span>
                  </div>
                  <p className="mt-1.5 text-xs leading-relaxed text-slate-700">
                    {rep.materialsUsed ?? 'Standard stage materials issued from site store.'}
                  </p>
                </div>

                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3.5">
                  <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-600">
                    <CloudSun className="h-3.5 w-3.5 text-slate-500" />
                    <span>Site Conditions</span>
                  </div>
                  <p className="mt-1.5 text-xs leading-relaxed text-slate-700">
                    Weather: {rep.weather} · {rep.workersOnSite} crew active on site
                  </p>
                  {rep.safetyOrQualityObservations && (
                    <p className="mt-1 text-[11px] text-emerald-700">
                      Quality Check: {rep.safetyOrQualityObservations}
                    </p>
                  )}
                </div>

                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3.5">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                    Next Week&apos;s Planned Work
                  </p>
                  <p className="mt-1.5 text-xs leading-relaxed text-slate-700">
                    {rep.nextDayPlan ?? rep.workPlanned ?? 'Proceed with scheduled stage tasks.'}
                  </p>
                </div>
              </div>

              {rep.problemsOrDelays &&
                !rep.problemsOrDelays.toLowerCase().startsWith('none') && (
                  <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                    <div>
                      <span className="font-semibold">Delays &amp; Reasons: </span>
                      {rep.problemsOrDelays}
                    </div>
                  </div>
                )}

              {/* Uploaded Photos & Approved Bills / Documents */}
              <div className="border-t border-slate-100 pt-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Uploaded Photos &amp; Approved Bills / Documents
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {attachedPhotos.slice(0, 3).map((ph) => (
                    <Button
                      key={ph.id}
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setPreviewItem({
                          id: ph.id,
                          title: ph.title,
                          category: 'Progress photo',
                          date: ph.capturedDate,
                          stage: ph.stage,
                          weekLabel: ph.weekLabel,
                          fileName: ph.fileName,
                          description: ph.caption,
                          uploadedBy: ph.uploadedBy,
                        })
                      }
                    >
                      <Camera className="h-3.5 w-3.5 text-[#A65229]" />
                      <span>{ph.title}</span>
                    </Button>
                  ))}

                  {attachedDocs.map((doc) => (
                    <Button
                      key={doc.id}
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setPreviewItem({
                          id: doc.id,
                          title: doc.title,
                          category: 'Project document',
                          date: doc.uploadedDate,
                          stage: doc.milestoneStage,
                          weekLabel: doc.weekLabel,
                          fileName: doc.fileName,
                          description: `${doc.category} (${doc.fileSize}) · Version ${doc.version}`,
                          uploadedBy: doc.uploadedBy,
                        })
                      }
                    >
                      <FileText className="h-3.5 w-3.5 text-slate-600" />
                      <span>{doc.title}</span>
                    </Button>
                  ))}

                  {approvedBills.slice(0, 2).map((bill) => (
                    <Button
                      key={bill.id}
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setPreviewItem({
                          id: bill.id,
                          title: bill.title,
                          category: 'Approved bill',
                          date: bill.uploadDate,
                          stage: bill.stage,
                          weekLabel: bill.weekLabel,
                          fileName: bill.fileName,
                          amount: bill.amount,
                          reference: bill.billNumber,
                          description: bill.description,
                          uploadedBy: bill.uploadedBy,
                        })
                      }
                    >
                      <Receipt className="h-3.5 w-3.5 text-emerald-600" />
                      <span>{bill.title}</span>
                    </Button>
                  ))}
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <ClientFilePreviewModal
        item={previewItem}
        open={Boolean(previewItem)}
        onOpenChange={(open) => !open && setPreviewItem(null)}
        projectName={project.name}
      />
    </PageContainer>
  );
}

/* ============================================================================
 * 5. PHOTOS (/client/photos) — Grouped by Week or Project Milestone
 * ========================================================================== */
export function ClientPhotosPage() {
  const {
    assignedProjects,
    project,
    setSelectedProjectId,
    photos,
    approvedClientUploads,
  } = useClientPortalScope();

  const [groupBy, setGroupBy] = useState<'milestone' | 'week'>('milestone');
  const [previewItem, setPreviewItem] = useState<PreviewModalItem | null>(null);

  if (!project) return null;

  const combinedPhotos = [
    ...photos.map((p) => ({
      id: p.id,
      title: p.title,
      stage: p.stage,
      weekLabel: p.weekLabel ?? 'Week of 18 Nov – 24 Nov 2026',
      date: p.capturedDate,
      uploadedBy: p.uploadedBy,
      fileName: p.fileName,
      caption: p.caption,
    })),
    ...approvedClientUploads
      .filter((u) => u.category === 'Progress photo')
      .map((u) => ({
        id: u.id,
        title: u.title,
        stage: u.stage,
        weekLabel: u.weekLabel ?? 'Week of 18 Nov – 24 Nov 2026',
        date: u.uploadDate,
        uploadedBy: u.uploadedBy,
        fileName: u.fileName,
        caption: u.description,
      })),
  ];

  // Deduplicate by fileName
  const uniquePhotos = combinedPhotos.filter(
    (item, idx, arr) =>
      arr.findIndex((other) => other.fileName === item.fileName) === idx,
  );

  const grouped = uniquePhotos.reduce<Record<string, typeof uniquePhotos>>(
    (acc, photo) => {
      const key = groupBy === 'milestone' ? photo.stage : photo.weekLabel;
      if (!acc[key]) acc[key] = [];
      acc[key].push(photo);
      return acc;
    },
    {},
  );

  return (
    <PageContainer>
      <PageHeader
        title="Site Photos Gallery"
        description={`Timestamped progress photographs for ${project.name}, grouped by project milestone or week`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <ClientProjectSelector
              assignedProjects={assignedProjects}
              activeProjectId={project.id}
              onSelect={setSelectedProjectId}
            />
            <div className="inline-flex rounded-[4px] border border-[#D8D1C5] bg-[#EAE4D9] p-0.5">
              <button
                type="button"
                onClick={() => setGroupBy('milestone')}
                className={`rounded-[3px] px-2.5 py-1 text-xs font-semibold cursor-pointer ${
                  groupBy === 'milestone'
                    ? 'bg-[#252A27] text-[#F4F0E8]'
                    : 'text-[#57564F] hover:text-[#252A27]'
                }`}
              >
                Group by Milestone
              </button>
              <button
                type="button"
                onClick={() => setGroupBy('week')}
                className={`rounded-[3px] px-2.5 py-1 text-xs font-semibold cursor-pointer ${
                  groupBy === 'week'
                    ? 'bg-[#252A27] text-[#F4F0E8]'
                    : 'text-[#57564F] hover:text-[#252A27]'
                }`}
              >
                Group by Week
              </button>
            </div>
          </div>
        }
      />

      <ClientPrivacyNotice projectName={project.name} />

      <div className="space-y-6">
        {Object.entries(grouped).map(([groupTitle, items]) => (
          <div key={groupTitle} className="space-y-3">
            <div className="flex items-center justify-between border-b border-[#D8D1C5] pb-2">
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-[#A65229]" />
                <h3 className="text-sm font-semibold text-[#252A27]">{groupTitle}</h3>
              </div>
              <Badge variant="neutral">{items.length} Photos</Badge>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((photo, idx) => {
                const visual = SITE_GALLERY_FALLBACKS[idx % SITE_GALLERY_FALLBACKS.length];
                return (
                  <Card key={photo.id} className="overflow-hidden flex flex-col">
                    <div className="aspect-[16/10] w-full overflow-hidden border-b border-[#D8D1C5] bg-[#EAE4D9]">
                      <img
                        src={visual.src}
                        alt={photo.title}
                        referrerPolicy="no-referrer"
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <CardContent className="p-4 flex-1 flex flex-col justify-between space-y-3">
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <Badge variant="blue">{photo.stage}</Badge>
                          <span className="font-mono text-[11px] text-[#77766F] tabular-nums">
                            {formatIndianDate(photo.date)}
                          </span>
                        </div>
                        <h4 className="mt-2 text-sm font-semibold text-[#252A27]">
                          {photo.title}
                        </h4>
                        <p className="mt-1 text-xs text-[#57564F] leading-relaxed">
                          {photo.caption}
                        </p>
                      </div>
                      <div className="flex items-center justify-between border-t border-[#E6E0D5] pt-2.5">
                        <span className="font-mono text-[10.5px] text-[#77766F]">
                          By {photo.uploadedBy}
                        </span>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setPreviewItem({
                              id: photo.id,
                              title: photo.title,
                              category: 'Progress photo',
                              date: photo.date,
                              stage: photo.stage,
                              weekLabel: photo.weekLabel,
                              fileName: photo.fileName,
                              description: photo.caption,
                              uploadedBy: photo.uploadedBy,
                              imageSrc: visual.src,
                            })
                          }
                        >
                          <Eye className="h-3.5 w-3.5" />
                          <span>Inspect</span>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <ClientFilePreviewModal
        item={previewItem}
        open={Boolean(previewItem)}
        onOpenChange={(open) => !open && setPreviewItem(null)}
        projectName={project.name}
      />
    </PageContainer>
  );
}

/* ============================================================================
 * 6. PAYMENTS AND DUES (/client/payments)
 * ========================================================================== */
export function ClientPaymentsPage() {
  const {
    assignedProjects,
    project,
    setSelectedProjectId,
    payments,
    variations,
    financials,
  } = useClientPortalScope();

  const [selectedReceiptId, setSelectedReceiptId] = useState<string | null>(null);

  if (!project) return null;

  const selectedReceipt = payments.find((p) => p.id === selectedReceiptId);

  return (
    <PageContainer>
      <PageHeader
        title="Payments and Dues"
        description={`Derived contract accounting, approved variations, installment schedule, and payment receipts for ${project.name}`}
        actions={
          <ClientProjectSelector
            assignedProjects={assignedProjects}
            activeProjectId={project.id}
            onSelect={setSelectedProjectId}
          />
        }
      />

      <ClientPrivacyNotice projectName={project.name} />

      {/* 5 Derived Financial Cards */}
      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card className="p-4">
          <p className="text-xs font-medium text-slate-500">1. Contract Amount</p>
          <p className="mt-1.5 font-mono text-xl font-semibold text-slate-900 tabular-nums">
            {formatINR(financials.contractAmount)}
          </p>
          <p className="mt-1 text-[11px] text-slate-500">Base signed agreement</p>
        </Card>

        <Card className="p-4">
          <p className="text-xs font-medium text-slate-500">
            2. Approved Variations
          </p>
          <p className="mt-1.5 font-mono text-xl font-semibold text-[#A65229] tabular-nums">
            {formatINR(financials.approvedVariationsAmount)}
          </p>
          <p className="mt-1 text-[11px] text-slate-500">
            {variations.filter((v) => v.status === 'Approved').length} approved scope additions
          </p>
        </Card>

        <Card className="p-4 border-slate-300 bg-slate-50/70">
          <p className="text-xs font-semibold text-slate-700">3. Total Amount Due</p>
          <p className="mt-1.5 font-mono text-xl font-bold text-slate-900 tabular-nums">
            {formatINR(financials.totalAmountDue)}
          </p>
          <p className="mt-1 text-[11px] text-slate-500">
            Contract + Approved Variations
          </p>
        </Card>

        <Card className="p-4">
          <p className="text-xs font-medium text-slate-500">
            4. Payments Received
          </p>
          <p className="mt-1.5 font-mono text-xl font-semibold text-emerald-700 tabular-nums">
            {formatINR(financials.amountPaid)}
          </p>
          <p className="mt-1 text-[11px] text-slate-500">
            {payments.filter((p) => p.status === 'Received').length} installments settled
          </p>
        </Card>

        <Card className="p-4">
          <p className="text-xs font-medium text-slate-500">
            5. Outstanding Balance
          </p>
          <p className="mt-1.5 font-mono text-xl font-semibold text-amber-700 tabular-nums">
            {formatINR(financials.outstandingAmount)}
          </p>
          <p className="mt-1 text-[11px] text-slate-500">Remaining payable</p>
        </Card>
      </div>

      {/* Approved Variations & Additional Work */}
      <Card className="mb-5">
        <CardHeader className="pb-3">
          <CardTitle>Approved Variations &amp; Additional Work</CardTitle>
          <CardDescription>
            Signed change orders and homeowner-requested upgrades added to base contract
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {variations.length === 0 ? (
            <div className="p-5 text-xs text-slate-500">
              No additional work variations recorded for this project.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reference</TableHead>
                  <TableHead>Variation Title</TableHead>
                  <TableHead>Approved Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {variations.map((v) => (
                  <TableRow key={v.id}>
                    <TableCell className="font-mono text-xs text-slate-600">
                      {v.referenceCode}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-slate-900">{v.title}</div>
                      <div className="text-xs text-slate-500">{v.description}</div>
                    </TableCell>
                    <TableCell className="text-xs text-slate-600 tabular-nums">
                      {formatIndianDate(v.approvedDate)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={v.status === 'Approved' ? 'green' : 'amber'}>
                        {v.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono font-semibold text-slate-900 tabular-nums">
                      {formatINR(v.amount)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Payment History, Due Dates & Receipts */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Payment History, Schedule &amp; Receipts</CardTitle>
          <CardDescription>
            Stage-linked payment schedule with due dates and printable payment receipts
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice / Receipt</TableHead>
                <TableHead>Milestone Stage</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Paid Date</TableHead>
                <TableHead>Mode &amp; Reference</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Receipt</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.map((pay) => (
                <TableRow key={pay.id}>
                  <TableCell className="font-mono text-xs font-medium text-slate-900">
                    <div>{pay.invoiceNumber}</div>
                    {pay.receiptNumber && (
                      <div className="text-[11px] text-emerald-700">
                        {pay.receiptNumber}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="font-medium text-slate-900">
                    {pay.stage}
                  </TableCell>
                  <TableCell className="text-xs text-slate-600 tabular-nums">
                    {formatIndianDate(pay.dueDate)}
                  </TableCell>
                  <TableCell className="text-xs text-slate-600 tabular-nums">
                    {pay.paidDate ? formatIndianDate(pay.paidDate) : '—'}
                  </TableCell>
                  <TableCell className="text-xs text-slate-600">
                    {pay.mode ? `${pay.mode} · ${pay.referenceNo ?? ''}` : '—'}
                  </TableCell>
                  <TableCell className="text-right font-mono font-semibold text-slate-900 tabular-nums">
                    {formatINR(pay.amount)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={getPaymentStatusVariant(pay.status)}>
                      {pay.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {pay.status === 'Received' ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedReceiptId(pay.id)}
                      >
                        <Receipt className="h-3.5 w-3.5 text-emerald-600" />
                        <span>Receipt</span>
                      </Button>
                    ) : (
                      <span className="text-xs text-slate-400">Upcoming</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Printable Payment Receipt Modal */}
      <Dialog
        open={Boolean(selectedReceipt)}
        onOpenChange={(open) => !open && setSelectedReceiptId(null)}
      >
        <DialogContent className="max-w-lg">
          {selectedReceipt && (
            <>
              <DialogHeader>
                <div className="flex items-center justify-between">
                  <Badge variant="green">OFFICIAL PAYMENT RECEIPT</Badge>
                  <span className="font-mono text-xs text-slate-500">
                    {selectedReceipt.receiptNumber ?? selectedReceipt.invoiceNumber}
                  </span>
                </div>
                <DialogTitle className="mt-1.5">
                  BuildFlow Residential Constructions
                </DialogTitle>
                <DialogDescription>
                  Verified Customer Payment Acknowledgement
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-2.5 px-6 py-4 text-xs">
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-2.5">
                  <div className="flex justify-between border-b border-slate-200 pb-2">
                    <span className="text-slate-500">Homeowner:</span>
                    <span className="font-semibold text-slate-900">
                      {selectedReceipt.customerName}
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-slate-200 pb-2">
                    <span className="text-slate-500">Project:</span>
                    <span className="font-semibold text-slate-900">
                      {project.name} ({project.code})
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-slate-200 pb-2">
                    <span className="text-slate-500">Stage / Tranche:</span>
                    <span className="font-semibold text-slate-900">
                      {selectedReceipt.stage}
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-slate-200 pb-2">
                    <span className="text-slate-500">Paid Date:</span>
                    <span className="font-semibold text-slate-900">
                      {formatIndianDate(
                        selectedReceipt.paidDate ?? selectedReceipt.dueDate,
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-slate-200 pb-2">
                    <span className="text-slate-500">Mode &amp; Reference:</span>
                    <span className="font-mono font-semibold text-slate-900">
                      {selectedReceipt.mode} ({selectedReceipt.referenceNo})
                    </span>
                  </div>
                  <div className="flex items-center justify-between pt-1 text-sm">
                    <span className="font-bold text-slate-700">Amount Received:</span>
                    <span className="font-mono text-base font-bold text-emerald-700">
                      {formatINR(selectedReceipt.amount)}
                    </span>
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" size="sm" onClick={() => window.print()}>
                  <Printer className="h-3.5 w-3.5" />
                  <span>Print Receipt</span>
                </Button>
                <Button size="sm" onClick={() => setSelectedReceiptId(null)}>
                  Done
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}

/* ============================================================================
 * 7. BILLS AND DOCUMENTS (/client/documents) — Grouped by Type, Milestone, or Week
 * ========================================================================== */
export function ClientDocumentsPage() {
  const {
    assignedProjects,
    project,
    setSelectedProjectId,
    documents,
    photos,
    payments,
    reports,
    approvedClientUploads,
  } = useClientPortalScope();

  const [groupBy, setGroupBy] = useState<'category' | 'milestone' | 'week'>(
    'category',
  );
  const [previewItem, setPreviewItem] = useState<PreviewModalItem | null>(null);

  if (!project) return null;

  // Build unified vault covering all 5 required client document categories:
  // Progress photos, Approved bills, Payment receipts, Project documents, Weekly reports
  const vaultItems: PreviewModalItem[] = [
    ...documents.map((d) => ({
      id: d.id,
      title: d.title,
      category: 'Project document' as const,
      date: d.uploadedDate,
      stage: d.milestoneStage ?? 'Foundation',
      weekLabel: d.weekLabel ?? 'Master Project Drawings',
      fileName: d.fileName,
      description: `${d.category} · ${d.fileSize} · Version ${d.version}`,
      uploadedBy: d.uploadedBy,
    })),
    ...approvedClientUploads
      .filter((u) => u.category === 'Bill' || u.category === 'Receipt')
      .map((u) => ({
        id: u.id,
        title: u.title,
        category:
          u.category === 'Bill'
            ? ('Approved bill' as const)
            : ('Payment receipt' as const),
        date: u.uploadDate,
        stage: u.stage,
        weekLabel: u.weekLabel ?? 'Week of 18 Nov – 24 Nov 2026',
        fileName: u.fileName,
        amount: u.amount,
        reference: u.billNumber,
        description: u.description,
        uploadedBy: u.uploadedBy,
      })),
    ...payments
      .filter((p) => p.status === 'Received')
      .map((p) => ({
        id: `rcpt-${p.id}`,
        title: `Payment Receipt — ${p.stage}`,
        category: 'Payment receipt' as const,
        date: p.paidDate ?? p.dueDate,
        stage: p.stage,
        weekLabel: 'Verified Payment Receipts',
        fileName: `${p.receiptNumber ?? p.invoiceNumber}.pdf`,
        amount: p.amount,
        reference: p.referenceNo,
        description: `Verified payment of ${formatINR(p.amount)} received via ${p.mode}.`,
        uploadedBy: 'BuildFlow Accounts',
      })),
    ...reports.map((r) => ({
      id: `rep-${r.id}`,
      title: `Weekly Report — ${r.stage}`,
      category: 'Weekly report' as const,
      date: r.reportDate,
      stage: r.stage,
      weekLabel:
        r.weekStartDate && r.weekEndDate
          ? `Week of ${formatIndianDate(r.weekStartDate)}`
          : 'Weekly Engineering Reports',
      fileName: `Weekly_Report_${r.reportDate}.pdf`,
      description: r.clientVisibleSummary ?? r.summary,
      uploadedBy: r.submittedBy,
    })),
    ...photos.slice(0, 4).map((p) => ({
      id: `ph-${p.id}`,
      title: p.title,
      category: 'Progress photo' as const,
      date: p.capturedDate,
      stage: p.stage,
      weekLabel: p.weekLabel ?? 'Week of 18 Nov – 24 Nov 2026',
      fileName: p.fileName,
      description: p.caption,
      uploadedBy: p.uploadedBy,
    })),
  ];

  const grouped = vaultItems.reduce<Record<string, PreviewModalItem[]>>(
    (acc, item) => {
      const key =
        groupBy === 'category'
          ? item.category
          : groupBy === 'milestone'
          ? item.stage ?? 'General'
          : item.weekLabel ?? 'General';
      if (!acc[key]) acc[key] = [];
      acc[key].push(item);
      return acc;
    },
    {},
  );

  return (
    <PageContainer>
      <PageHeader
        title="Bills, Receipts & Project Documents"
        description={`Approved bills, payment receipts, architectural drawings, progress photos, and weekly reports for ${project.name}`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <ClientProjectSelector
              assignedProjects={assignedProjects}
              activeProjectId={project.id}
              onSelect={setSelectedProjectId}
            />
            <div className="inline-flex rounded-md border border-slate-200 bg-white p-0.5">
              <button
                type="button"
                onClick={() => setGroupBy('category')}
                className={`rounded px-2.5 py-1 text-xs font-semibold cursor-pointer ${
                  groupBy === 'category'
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                By Category
              </button>
              <button
                type="button"
                onClick={() => setGroupBy('milestone')}
                className={`rounded px-2.5 py-1 text-xs font-semibold cursor-pointer ${
                  groupBy === 'milestone'
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                By Milestone
              </button>
              <button
                type="button"
                onClick={() => setGroupBy('week')}
                className={`rounded px-2.5 py-1 text-xs font-semibold cursor-pointer ${
                  groupBy === 'week'
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                By Week
              </button>
            </div>
          </div>
        }
      />

      <ClientPrivacyNotice projectName={project.name} />

      <div className="space-y-5">
        {Object.entries(grouped).map(([groupTitle, items]) => (
          <Card key={groupTitle}>
            <CardHeader className="py-3.5 border-b border-slate-100 flex flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <FolderOpen className="h-4 w-4 text-[#A65229]" />
                <CardTitle className="text-sm">{groupTitle}</CardTitle>
              </div>
              <Badge variant="neutral">{items.length} Files</Badge>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title &amp; File</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Milestone</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Verified Amount</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <p className="font-medium text-slate-900">{item.title}</p>
                        <p className="font-mono text-[11px] text-slate-500">
                          {item.fileName}
                        </p>
                      </TableCell>
                      <TableCell>
                        <Badge variant="blue">{item.category}</Badge>
                      </TableCell>
                      <TableCell className="text-xs text-slate-600">
                        {item.stage ?? 'General'}
                      </TableCell>
                      <TableCell className="text-xs text-slate-600 tabular-nums">
                        {formatIndianDate(item.date)}
                      </TableCell>
                      <TableCell className="text-right font-mono font-semibold text-slate-900 tabular-nums">
                        {item.amount ? formatINR(item.amount) : '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setPreviewItem(item)}
                        >
                          <Eye className="h-3.5 w-3.5" />
                          <span>Preview / Open</span>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ))}
      </div>

      <ClientFilePreviewModal
        item={previewItem}
        open={Boolean(previewItem)}
        onOpenChange={(open) => !open && setPreviewItem(null)}
        projectName={project.name}
      />
    </PageContainer>
  );
}
