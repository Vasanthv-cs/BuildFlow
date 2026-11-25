import React, { useMemo, useState } from 'react';
import {
  Camera,
  CheckCircle2,
  ClipboardPlus,
  FileText,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  X,
} from 'lucide-react';
import { PageContainer, PageHeader } from '@/src/components/layout/PageContainer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';
import { Badge } from '@/src/components/ui/badge';
import { Input, Label, Textarea } from '@/src/components/ui/input';
import { ProgressBar } from '@/src/components/ui/progress';
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
import { ConfirmActionDialog } from '@/src/components/ui/confirm-dialog';
import { useBuildFlow } from '@/src/context/BuildFlowContext';
import { formatIndianDate, formatINR } from '@/src/lib/utils';
import type {
  MilestoneStatus,
  ProjectMilestone,
  ReviewStatus,
  StandardMilestoneStage,
} from '@/src/types';

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

export function SiteProgressPage() {
  const {
    projects,
    milestones,
    progressReports,
    siteUploads,
    workers,
    submitProgressReport,
    updateMilestoneProgress,
    reviewProgressReport,
    reviewSiteUpload,
  } = useBuildFlow();

  const [selectedProjectId, setSelectedProjectId] = useState(projects[0]?.id ?? '');
  const [queueStatusFilter, setQueueStatusFilter] = useState<'All' | ReviewStatus>('All');
  const [queueSearch, setQueueSearch] = useState('');
  const [confirmApproveReportId, setConfirmApproveReportId] = useState<string | null>(null);

  // Quick-Entry Mobile-Friendly Daily Progress Report state
  const [reportDate, setReportDate] = useState('2026-11-24');
  const [stage, setStage] = useState<StandardMilestoneStage>('Flooring');
  const [workCompleted, setWorkCompleted] = useState('');
  const [workPlanned, setWorkPlanned] = useState('');
  const [workersPresent, setWorkersPresent] = useState('8');
  const [materialsUsed, setMaterialsUsed] = useState('');
  const [problemsOrDelays, setProblemsOrDelays] = useState('');
  const [nextDayPlan, setNextDayPlan] = useState('');
  const [weather, setWeather] = useState<'Clear' | 'Partly Cloudy' | 'Light Rain'>('Clear');
  const [deltaPercent, setDeltaPercent] = useState('2');
  const [photoInput, setPhotoInput] = useState('');
  const [photos, setPhotos] = useState<string[]>(['Site_Progress_24Nov_Morning.jpg']);
  const [submittedBanner, setSubmittedBanner] = useState('');

  // Milestone edit dialog
  const [editingMilestone, setEditingMilestone] = useState<ProjectMilestone | undefined>();
  const [msProgress, setMsProgress] = useState('50');
  const [msStatus, setMsStatus] = useState<MilestoneStatus>('In Progress');
  const [msNotes, setMsNotes] = useState('');

  const selectedProject = projects.find((p) => p.id === selectedProjectId) ?? projects[0];

  const projectMilestones = useMemo(
    () =>
      milestones
        .filter((m) => m.projectId === selectedProjectId)
        .sort((a, b) => a.stageOrder - b.stageOrder),
    [milestones, selectedProjectId],
  );

  const projectReports = useMemo(
    () =>
      progressReports
        .filter((r) => r.projectId === selectedProjectId)
        .sort((a, b) => (a.reportDate < b.reportDate ? 1 : -1)),
    [progressReports, selectedProjectId],
  );

  const filteredReviewReports = useMemo(() => {
    const q = queueSearch.trim().toLowerCase();
    return progressReports
      .filter((r) => {
        const status = r.reviewStatus ?? 'Reviewed';
        if (queueStatusFilter !== 'All' && status !== queueStatusFilter) return false;
        if (q) {
          const projName = projects.find((p) => p.id === r.projectId)?.name ?? '';
          const hay = [projName, r.stage, r.summary, r.submittedBy, r.weekLabel ?? '']
            .join(' ')
            .toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => b.reportDate.localeCompare(a.reportDate));
  }, [progressReports, queueStatusFilter, queueSearch, projects]);

  const filteredReviewUploads = useMemo(() => {
    const q = queueSearch.trim().toLowerCase();
    return siteUploads
      .filter((u) => {
        if (queueStatusFilter !== 'All' && u.reviewStatus !== queueStatusFilter) return false;
        if (q) {
          const projName = projects.find((p) => p.id === u.projectId)?.name ?? '';
          const hay = [projName, u.title, u.category, u.fileName, u.uploadedBy, u.stage]
            .join(' ')
            .toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => b.uploadDate.localeCompare(a.uploadDate));
  }, [siteUploads, queueStatusFilter, queueSearch, projects]);

  const pendingReviewCount = useMemo(() => {
    const repPending = progressReports.filter((r) => r.reviewStatus === 'Submitted').length;
    const uplPending = siteUploads.filter((u) => u.reviewStatus === 'Submitted').length;
    return repPending + uplPending;
  }, [progressReports, siteUploads]);

  const siteWorkerCount = useMemo(
    () =>
      workers.filter(
        (w) => w.assignedProjectId === selectedProjectId && w.attendanceToday !== 'Absent',
      ).length,
    [workers, selectedProjectId],
  );

  const handleAddPhotoPlaceholder = () => {
    const label = photoInput.trim() || `Site_Photo_${photos.length + 1}.jpg`;
    setPhotos((prev) => [...prev, label]);
    setPhotoInput('');
  };

  const handleSubmitDPR = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject || !workCompleted.trim()) return;

    submitProgressReport({
      projectId: selectedProject.id,
      reportDate,
      submittedBy: selectedProject.siteManager,
      stage,
      summary: workCompleted.trim(),
      workPlanned: workPlanned.trim() || undefined,
      materialsUsed: materialsUsed.trim() || undefined,
      problemsOrDelays: problemsOrDelays.trim() || 'None reported',
      nextDayPlan: nextDayPlan.trim() || undefined,
      photoPlaceholders: photos,
      workersOnSite: Number(workersPresent) || siteWorkerCount,
      weather,
      completionDeltaPercent: Math.max(0, Math.min(20, Number(deltaPercent) || 0)),
    });

    setWorkCompleted('');
    setWorkPlanned('');
    setMaterialsUsed('');
    setProblemsOrDelays('');
    setNextDayPlan('');
    setSubmittedBanner(
      `Daily Progress Report saved for ${selectedProject.name} (${formatIndianDate(reportDate)}).`,
    );
  };

  const openMilestoneEditor = (ms: ProjectMilestone) => {
    setEditingMilestone(ms);
    setMsProgress(String(ms.actualProgressPercent ?? (ms.status === 'Completed' ? 100 : 0)));
    setMsStatus(ms.status);
    setMsNotes(ms.notes ?? '');
  };

  const handleSaveMilestone = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMilestone) return;
    updateMilestoneProgress(
      editingMilestone.id,
      msStatus === 'Completed' ? 100 : Number(msProgress) || 0,
      msStatus,
      msNotes.trim(),
    );
    setEditingMilestone(undefined);
  };

  return (
    <PageContainer>
      <PageHeader
        title="Construction Progress & Milestones"
        description="Mobile-friendly daily site progress reporting and 8-stage planned vs actual residential milestone tracking."
        actions={
          <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
            <SelectTrigger className="w-[230px] bg-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {projects.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name} ({p.progressPercent}%)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />

      {/* Active Site Progress Summary */}
      {selectedProject && (
        <Card className="mb-6 p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-medium text-[#64748B]">
                {selectedProject.code} · Site Engineer: {selectedProject.siteManager}
              </p>
              <h2 className="text-lg font-semibold text-[#0F172A]">{selectedProject.name}</h2>
            </div>
            <div className="sm:w-64">
              <div className="mb-1 flex items-center justify-between text-xs">
                <span className="text-[#64748B]">Overall Completion</span>
                <span className="font-mono font-semibold text-[#A65229] tabular-nums">
                  {selectedProject.progressPercent}%
                </span>
              </div>
              <ProgressBar value={selectedProject.progressPercent} />
            </div>
          </div>
        </Card>
      )}

      <Tabs defaultValue="review_queue">
        <TabsList>
          <TabsTrigger value="review_queue">
            Owner Review Queue ({pendingReviewCount} Pending)
          </TabsTrigger>
          <TabsTrigger value="dpr">Daily Progress Report (Quick Entry)</TabsTrigger>
          <TabsTrigger value="milestones">
            Project Milestones ({projectMilestones.length} Stages)
          </TabsTrigger>
        </TabsList>

        {/* Tab 0: Owner Review Queue for Supervisor Weekly Reports & Site Uploads */}
        <TabsContent value="review_queue">
          <div className="space-y-5">
            <Card className="p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="relative flex-1 max-w-md">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    value={queueSearch}
                    onChange={(e) => setQueueSearch(e.target.value)}
                    placeholder="Search reports, photos, bills, project, or supervisor..."
                    className="pl-9"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Select
                    value={queueStatusFilter}
                    onValueChange={(v) => setQueueStatusFilter(v as 'All' | ReviewStatus)}
                  >
                    <SelectTrigger className="w-[190px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="All">All Review Statuses</SelectItem>
                      <SelectItem value="Submitted">Submitted (Pending Review)</SelectItem>
                      <SelectItem value="Reviewed">Reviewed (Approved)</SelectItem>
                      <SelectItem value="Needs correction">Needs Correction</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </Card>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
              <Card className="lg:col-span-7">
                <CardHeader className="border-b border-[#F1F5F9]">
                  <CardTitle className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-[#A65229]" />
                    Supervisor Weekly &amp; Daily Progress Reports ({filteredReviewReports.length})
                  </CardTitle>
                  <CardDescription>
                    Approving a report updates the project completion % and publishes the report to the Client Portal
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <ul className="divide-y divide-[#F1F5F9]">
                    {filteredReviewReports.map((rep) => {
                      const proj = projects.find((p) => p.id === rep.projectId);
                      const status = rep.reviewStatus ?? 'Reviewed';
                      return (
                        <li key={rep.id} className="p-5 space-y-2.5">
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div>
                              <p className="text-xs font-medium text-[#A65229]">
                                {proj?.name ?? rep.projectId} · {rep.weekLabel ?? formatIndianDate(rep.reportDate)}
                              </p>
                              <p className="text-sm font-semibold text-[#0F172A]">{rep.stage}</p>
                              <p className="text-xs text-[#64748B]">
                                Submitted by {rep.submittedBy} · {rep.workersOnSite} workers ·{' '}
                                {rep.weather}
                              </p>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Badge
                                variant={
                                  status === 'Reviewed'
                                    ? 'success'
                                    : status === 'Needs correction'
                                    ? 'danger'
                                    : 'warning'
                                }
                              >
                                {status === 'Reviewed' ? 'Approved (Client Visible)' : status}
                              </Badge>
                              <Badge variant="info">
                                {typeof rep.progressPercent === 'number'
                                  ? `${rep.progressPercent}% overall`
                                  : `+${rep.completionDeltaPercent}%`}
                              </Badge>
                            </div>
                          </div>

                          <p className="text-xs text-[#334155] leading-relaxed">{rep.summary}</p>
                          {rep.notesForOwner && (
                            <p className="rounded border border-amber-200 bg-amber-50/70 px-3 py-1.5 text-xs text-amber-900">
                              <strong>Supervisor Note for Owner:</strong> {rep.notesForOwner}
                            </p>
                          )}

                          {status !== 'Reviewed' && (
                            <div className="flex items-center gap-2 pt-2">
                              <Button
                                size="sm"
                                onClick={() => setConfirmApproveReportId(rep.id)}
                              >
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                Approve &amp; Publish to Client
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  reviewProgressReport(
                                    rep.id,
                                    'Needs correction',
                                    'Please verify quantities and attach clearer site photos.',
                                  )
                                }
                              >
                                Request Correction
                              </Button>
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </CardContent>
              </Card>

              <Card className="lg:col-span-5">
                <CardHeader className="border-b border-[#F1F5F9]">
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-[#A65229]" />
                    Uploaded Site Photos, Bills &amp; Receipts ({filteredReviewUploads.length})
                  </CardTitle>
                  <CardDescription>
                    Approve supervisor uploads to sync with Project Documents and Client Portal
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <ul className="divide-y divide-[#F1F5F9]">
                    {filteredReviewUploads.map((upl) => {
                      const proj = projects.find((p) => p.id === upl.projectId);
                      return (
                        <li key={upl.id} className="p-4 space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="text-[11px] font-medium text-[#A65229]">
                                {proj?.name ?? upl.projectId} · {upl.category}
                              </p>
                              <p className="text-sm font-semibold text-[#0F172A]">{upl.title}</p>
                              <p className="text-xs text-[#64748B]">
                                {upl.fileName} · {formatIndianDate(upl.uploadDate)} · {upl.uploadedBy}
                              </p>
                              {upl.billAmount ? (
                                <p className="text-xs font-mono font-semibold text-[#0F172A] mt-0.5">
                                  Amount: {formatINR(upl.billAmount)}{' '}
                                  {upl.vendorName ? `· ${upl.vendorName}` : ''}
                                </p>
                              ) : null}
                            </div>
                            <Badge
                              variant={
                                upl.reviewStatus === 'Reviewed'
                                  ? 'success'
                                  : upl.reviewStatus === 'Needs correction'
                                  ? 'danger'
                                  : 'warning'
                              }
                            >
                              {upl.reviewStatus}
                            </Badge>
                          </div>

                          {upl.reviewStatus !== 'Reviewed' && (
                            <div className="flex items-center gap-2 pt-1">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  reviewSiteUpload(upl.id, 'Reviewed', 'Verified by Owner')
                                }
                              >
                                Approve Upload
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() =>
                                  reviewSiteUpload(
                                    upl.id,
                                    'Needs correction',
                                    'Please upload legible bill / photo',
                                  )
                                }
                              >
                                Return
                              </Button>
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Tab 1: Mobile-Friendly Quick-Entry DPR Form + Log */}
        <TabsContent value="dpr">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            {/* Quick-Entry Form */}
            <Card className="lg:col-span-6">
              <CardHeader className="border-b border-[#F1F5F9]">
                <CardTitle className="flex items-center gap-2">
                  <ClipboardPlus className="h-4 w-4 text-[#A65229]" />
                  Quick Site DPR Entry
                </CardTitle>
                <CardDescription>
                  Designed for fast mobile entry by site engineers at end of shift
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-5">
                {submittedBanner && (
                  <div className="mb-4 flex items-center gap-2 rounded-md border border-[#BBF7D0] bg-[#F0FDF4] px-3.5 py-2.5 text-xs font-medium text-[#15803D]">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    {submittedBanner}
                  </div>
                )}

                <form onSubmit={handleSubmitDPR} className="space-y-4">
                  <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label>Report Date *</Label>
                      <Input
                        type="date"
                        value={reportDate}
                        onChange={(e) => setReportDate(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Active Milestone Stage *</Label>
                      <Select
                        value={stage}
                        onValueChange={(v) => setStage(v as StandardMilestoneStage)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {STANDARD_STAGES.map((s) => (
                            <SelectItem key={s} value={s}>
                              {s}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Workers Present</Label>
                      <Input
                        type="number"
                        min={0}
                        value={workersPresent}
                        onChange={(e) => setWorkersPresent(e.target.value)}
                        className="font-mono tabular-nums"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1.5">
                        <Label>Weather</Label>
                        <Select
                          value={weather}
                          onValueChange={(v) =>
                            setWeather(v as 'Clear' | 'Partly Cloudy' | 'Light Rain')
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Clear">Clear</SelectItem>
                            <SelectItem value="Partly Cloudy">Cloudy</SelectItem>
                            <SelectItem value="Light Rain">Light Rain</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label>Progress +%</Label>
                        <Input
                          type="number"
                          min={0}
                          max={20}
                          value={deltaPercent}
                          onChange={(e) => setDeltaPercent(e.target.value)}
                          className="font-mono tabular-nums"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label>Work Completed Today *</Label>
                    <Textarea
                      value={workCompleted}
                      onChange={(e) => setWorkCompleted(e.target.value)}
                      placeholder="Summarize completed masonry, concrete pour, plumbing, or flooring..."
                      rows={3}
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label>Work Planned Today</Label>
                      <Input
                        value={workPlanned}
                        onChange={(e) => setWorkPlanned(e.target.value)}
                        placeholder="Target set for today's shift"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Materials Used</Label>
                      <Input
                        value={materialsUsed}
                        onChange={(e) => setMaterialsUsed(e.target.value)}
                        placeholder="e.g. 25 bags cement, 180 blocks"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label>Problems or Delays</Label>
                    <Input
                      value={problemsOrDelays}
                      onChange={(e) => setProblemsOrDelays(e.target.value)}
                      placeholder="Material shortage, weather hold, inspection wait (or None)"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label>Next Day&apos;s Plan</Label>
                    <Input
                      value={nextDayPlan}
                      onChange={(e) => setNextDayPlan(e.target.value)}
                      placeholder="Crew and material plan for tomorrow"
                    />
                  </div>

                  {/* Site Photographs Placeholder */}
                  <div className="rounded-md border border-dashed border-[#CBD5E1] bg-[#F8FAFC] p-3.5 space-y-2.5">
                    <Label className="flex items-center gap-1.5">
                      <Camera className="h-3.5 w-3.5 text-[#64748B]" />
                      Site Photographs Placeholder (Mock Captions)
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        value={photoInput}
                        onChange={(e) => setPhotoInput(e.target.value)}
                        placeholder="e.g. Slab_Steel_Inspection.jpg"
                        className="bg-white text-xs h-8"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleAddPhotoPlaceholder}
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Add Tag
                      </Button>
                    </div>
                    {photos.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {photos.map((ph, idx) => (
                          <span
                            key={`${ph}-${idx}`}
                            className="inline-flex items-center gap-1.5 rounded border border-[#CBD5E1] bg-white px-2 py-1 font-mono text-[11px] text-[#334155]"
                          >
                            {ph}
                            <button
                              type="button"
                              onClick={() => setPhotos((prev) => prev.filter((_, i) => i !== idx))}
                              className="text-[#94A3B8] hover:text-[#0F172A] cursor-pointer"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <Button type="submit" className="w-full sm:w-auto">
                    Submit Daily Progress Report
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Recent Daily Progress Reports Feed */}
            <Card className="lg:col-span-6">
              <CardHeader className="border-b border-[#F1F5F9]">
                <CardTitle>Submitted Site Reports ({projectReports.length})</CardTitle>
                <CardDescription>Daily field logs for {selectedProject?.name}</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <ul className="divide-y divide-[#F1F5F9]">
                  {projectReports.map((rep) => (
                    <li key={rep.id} className="p-5 space-y-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold text-[#0F172A]">{rep.stage}</p>
                          <p className="text-xs text-[#64748B]">
                            {formatIndianDate(rep.reportDate)} · {rep.submittedBy} ·{' '}
                            {rep.workersOnSite} workers · {rep.weather}
                          </p>
                        </div>
                        <Badge variant="info">+{rep.completionDeltaPercent}%</Badge>
                      </div>

                      <div className="space-y-1.5 text-xs leading-relaxed text-[#334155]">
                        <p>
                          <span className="font-semibold text-[#0F172A]">Completed:</span>{' '}
                          {rep.summary}
                        </p>
                        {rep.workPlanned && (
                          <p>
                            <span className="font-semibold text-[#0F172A]">Planned:</span>{' '}
                            {rep.workPlanned}
                          </p>
                        )}
                        {rep.materialsUsed && (
                          <p>
                            <span className="font-semibold text-[#0F172A]">Materials Used:</span>{' '}
                            {rep.materialsUsed}
                          </p>
                        )}
                        {rep.problemsOrDelays && (
                          <p>
                            <span className="font-semibold text-[#B45309]">Problems / Delays:</span>{' '}
                            {rep.problemsOrDelays}
                          </p>
                        )}
                        {rep.nextDayPlan && (
                          <p>
                            <span className="font-semibold text-[#0F172A]">Next Day Plan:</span>{' '}
                            {rep.nextDayPlan}
                          </p>
                        )}
                      </div>

                      {rep.photoPlaceholders && rep.photoPlaceholders.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1.5 pt-1">
                          <Camera className="h-3.5 w-3.5 text-[#64748B]" />
                          {rep.photoPlaceholders.map((pName) => (
                            <span
                              key={pName}
                              className="font-mono text-[11px] text-[#A65229] bg-[#FBF1EC] border border-[#E7C4B3] px-2 py-0.5 rounded-[4px]"
                            >
                              {pName}
                            </span>
                          ))}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab 2: 8-Stage Milestones (Planned vs Actual) */}
        <TabsContent value="milestones">
          <Card>
            <CardHeader className="border-b border-[#F1F5F9]">
              <CardTitle>8-Stage Residential Construction Milestones</CardTitle>
              <CardDescription>
                Compare planned schedule progress against actual on-site completion across every
                build phase
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-[#F1F5F9]">
                {projectMilestones.map((ms) => {
                  const planned = ms.plannedProgressPercent ?? (ms.status === 'Completed' ? 100 : 0);
                  const actual = ms.actualProgressPercent ?? (ms.status === 'Completed' ? 100 : 0);
                  const variance = actual - planned;
                  return (
                    <div
                      key={ms.id}
                      className="grid grid-cols-1 gap-4 px-5 py-4 lg:grid-cols-12 lg:items-center"
                    >
                      <div className="lg:col-span-4">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-semibold text-[#64748B]">
                            0{ms.stageOrder}.
                          </span>
                          <p className="text-sm font-semibold text-[#0F172A]">{ms.title}</p>
                        </div>
                        <p className="mt-0.5 text-xs text-[#64748B] tabular-nums">
                          Target: {formatIndianDate(ms.plannedDate)}
                          {ms.actualDate ? ` · Finished: ${formatIndianDate(ms.actualDate)}` : ''}
                          {' · '}Weight: {ms.weightPercent}%
                        </p>
                        {ms.notes && (
                          <p className="mt-1 text-xs text-[#B45309]">{ms.notes}</p>
                        )}
                      </div>

                      <div className="lg:col-span-5 space-y-2">
                        <div>
                          <div className="mb-1 flex justify-between text-[11px] text-[#64748B]">
                            <span>Planned Progress</span>
                            <span className="font-mono tabular-nums">{planned}%</span>
                          </div>
                          <ProgressBar
                            value={planned}
                            indicatorClassName="bg-[#94A3B8]"
                          />
                        </div>
                        <div>
                          <div className="mb-1 flex justify-between text-[11px] text-[#0F172A] font-medium">
                            <span>Actual Progress</span>
                            <span className="font-mono tabular-nums">
                              {actual}%{' '}
                              {variance !== 0 && (
                                <span
                                  className={
                                    variance > 0 ? 'text-[#15803D]' : 'text-[#B91C1C]'
                                  }
                                >
                                  ({variance > 0 ? '+' : ''}
                                  {variance}%)
                                </span>
                              )}
                            </span>
                          </div>
                          <ProgressBar
                            value={actual}
                            indicatorClassName={
                              ms.status === 'Delayed'
                                ? 'bg-[#DC2626]'
                                : ms.status === 'Completed'
                                  ? 'bg-[#15803D]'
                                  : 'bg-[#C66A3D]'
                            }
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-2 lg:col-span-3 lg:justify-end">
                        <Badge
                          variant={
                            ms.status === 'Completed'
                              ? 'success'
                              : ms.status === 'Delayed'
                                ? 'danger'
                                : ms.status === 'In Progress'
                                  ? 'info'
                                  : 'neutral'
                          }
                        >
                          {ms.status}
                        </Badge>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openMilestoneEditor(ms)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          Update
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Update Milestone Progress Dialog */}
      <Dialog
        open={Boolean(editingMilestone)}
        onOpenChange={(o) => !o && setEditingMilestone(undefined)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Update Stage — {editingMilestone?.title}</DialogTitle>
            <DialogDescription>
              Adjust actual completion percentage and status. Overall project completion recalculates
              automatically.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveMilestone} className="flex flex-col overflow-hidden">
            <div className="px-6 py-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Actual Progress (%)</Label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={msProgress}
                    onChange={(e) => setMsProgress(e.target.value)}
                    className="font-mono tabular-nums"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Stage Status</Label>
                  <Select
                    value={msStatus}
                    onValueChange={(v) => setMsStatus(v as MilestoneStatus)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Upcoming">Upcoming</SelectItem>
                      <SelectItem value="In Progress">In Progress</SelectItem>
                      <SelectItem value="Delayed">Delayed</SelectItem>
                      <SelectItem value="Completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Engineer Notes / Delay Reason</Label>
                <Textarea
                  value={msNotes}
                  onChange={(e) => setMsNotes(e.target.value)}
                  placeholder="Optional inspection notes or bottleneck summary..."
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditingMilestone(undefined)}
              >
                Cancel
              </Button>
              <Button type="submit">Save Stage Update</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmActionDialog
        open={Boolean(confirmApproveReportId)}
        onOpenChange={(open) => !open && setConfirmApproveReportId(null)}
        title="Approve Weekly Report & Publish to Client Portal"
        description="Approving this supervisor progress report will update the project's overall completion percentage and make the client-facing summary visible in the Client Portal."
        confirmLabel="Approve & Publish"
        variant="success"
        onConfirm={() => {
          if (confirmApproveReportId) {
            reviewProgressReport(
              confirmApproveReportId,
              'Reviewed',
              'Approved and published to Client Portal.',
            );
            setConfirmApproveReportId(null);
          }
        }}
      />
    </PageContainer>
  );
}
