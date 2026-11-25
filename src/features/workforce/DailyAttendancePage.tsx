import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  CheckCheck,
  CheckCircle2,
  Lock,
  Save,
  Send,
  SlidersHorizontal,
  UserPlus,
} from 'lucide-react';
import { useAuth } from '@/src/context/AuthContext';
import { useBuildFlow } from '@/src/context/BuildFlowContext';
import {
  calculateAttendanceWage,
  validateAttendanceEntry,
} from '@/src/lib/wageCalculations';
import { formatIndianDate, formatINR } from '@/src/lib/utils';
import { PageContainer, PageHeader } from '@/src/components/layout/PageContainer';
import { Badge, getPaymentStatusVariant } from '@/src/components/ui/badge';
import { Button } from '@/src/components/ui/button';
import { Card, CardContent } from '@/src/components/ui/card';
import { EmptyState } from '@/src/components/ui/feedback';
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
import type {
  AttendanceRecord,
  AttendanceStatus,
  AttendanceSubmissionStatus,
} from '@/src/types';

const ATTENDANCE_STATUS_OPTIONS: AttendanceStatus[] = [
  'Present',
  'Half Day',
  'Absent',
  'Leave',
  'Pending verification',
];

interface DraftRow {
  existingRecordId?: string;
  workerId: string;
  status: AttendanceStatus;
  shiftMode: string; // shiftRuleId OR 'custom'
  startTime: string;
  endTime: string;
  breakDurationMinutes: number;
  submissionStatus: AttendanceSubmissionStatus;
}

export function DailyAttendancePage() {
  const { currentUser, permissions } = useAuth();
  const {
    projects,
    workers,
    roleWageConfigs,
    shiftRules,
    attendanceRecords,
    upsertAttendanceEntries,
    verifyAttendanceRecords,
  } = useBuildFlow();

  // Supervisor sees ONLY assigned sites; Owner sees all sites
  const accessibleProjects = useMemo(() => {
    if (!currentUser) return [];
    if (currentUser.role === 'owner') return projects;
    return projects.filter((p) => currentUser.assignedProjectIds.includes(p.id));
  }, [projects, currentUser]);

  const activeShiftRules = useMemo(
    () => shiftRules.filter((r) => r.active),
    [shiftRules],
  );

  const defaultNormalRule = useMemo(
    () =>
      activeShiftRules.find((r) => r.isDefaultNormal) ??
      activeShiftRules.find((r) => r.wageMultiplier === 1) ??
      activeShiftRules[0],
    [activeShiftRules],
  );

  const [selectedProjectId, setSelectedProjectId] = useState(
    accessibleProjects[0]?.id ?? '',
  );
  const [selectedDate, setSelectedDate] = useState('2026-11-25');
  const [extraWorkerIds, setExtraWorkerIds] = useState<string[]>([]);
  const [addWorkerChoice, setAddWorkerChoice] = useState<string>('');
  const [drafts, setDrafts] = useState<Record<string, DraftRow>>({});
  const [feedbackBanner, setFeedbackBanner] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // Ensure selectedProjectId stays within accessibleProjects when role switches
  useEffect(() => {
    if (
      accessibleProjects.length > 0 &&
      !accessibleProjects.some((p) => p.id === selectedProjectId)
    ) {
      setSelectedProjectId(accessibleProjects[0].id);
    }
  }, [accessibleProjects, selectedProjectId]);

  // Active workers primarily assigned to this site OR already logged on this date/site OR manually pulled in for multi-site split
  const siteWorkers = useMemo(() => {
    const existingIdsForSiteDate = new Set(
      attendanceRecords
        .filter((r) => r.projectId === selectedProjectId && r.date === selectedDate)
        .map((r) => r.workerId),
    );
    const extraSet = new Set(extraWorkerIds);

    return workers.filter(
      (w) =>
        (w.active ?? true) &&
        (w.assignedProjectId === selectedProjectId ||
          (w.assignedProjectIds ?? []).includes(selectedProjectId) ||
          existingIdsForSiteDate.has(w.id) ||
          extraSet.has(w.id)),
    );
  }, [workers, selectedProjectId, selectedDate, attendanceRecords, extraWorkerIds]);

  // Active workers from OTHER sites available to pull in for a valid multi-site split day
  const otherSiteActiveWorkers = useMemo(() => {
    const shownIds = new Set(siteWorkers.map((w) => w.id));
    return workers.filter((w) => (w.active ?? true) && !shownIds.has(w.id));
  }, [workers, siteWorkers]);

  // Hydrate drafts whenever site or date changes
  useEffect(() => {
    const nextDrafts: Record<string, DraftRow> = {};
    for (const worker of siteWorkers) {
      const existing = attendanceRecords.find(
        (r) =>
          r.workerId === worker.id &&
          r.projectId === selectedProjectId &&
          r.date === selectedDate,
      );

      if (existing) {
        const matchedRule = existing.shiftRuleId
          ? activeShiftRules.find((r) => r.id === existing.shiftRuleId)
          : undefined;
        nextDrafts[worker.id] = {
          existingRecordId: existing.id,
          workerId: worker.id,
          status: existing.status,
          shiftMode: matchedRule ? matchedRule.id : existing.startTime ? 'custom' : defaultNormalRule?.id ?? 'custom',
          startTime: existing.startTime ?? defaultNormalRule?.startTime ?? '09:00',
          endTime: existing.endTime ?? defaultNormalRule?.endTime ?? '18:00',
          breakDurationMinutes:
            existing.breakDurationMinutes ??
            defaultNormalRule?.breakDurationMinutes ??
            60,
          submissionStatus: existing.submissionStatus ?? 'Submitted',
        };
      } else {
        nextDrafts[worker.id] = {
          workerId: worker.id,
          status: 'Present',
          shiftMode: defaultNormalRule?.id ?? 'custom',
          startTime: defaultNormalRule?.startTime ?? '09:00',
          endTime: defaultNormalRule?.endTime ?? '18:00',
          breakDurationMinutes: defaultNormalRule?.breakDurationMinutes ?? 60,
          submissionStatus: 'Draft',
        };
      }
    }
    setDrafts(nextDrafts);
    setFeedbackBanner(null);
  }, [selectedProjectId, selectedDate, siteWorkers.length, attendanceRecords]);

  const projectNameMap = useMemo(
    () => new Map(projects.map((p) => [p.id, p.name])),
    [projects],
  );

  // Compute live wage calculation + multi-site/duplicate validation for each visible worker row
  const computedRows = useMemo(() => {
    return siteWorkers.map((worker) => {
      const draft: DraftRow = drafts[worker.id] ?? {
        workerId: worker.id,
        status: 'Present',
        shiftMode: defaultNormalRule?.id ?? 'custom',
        startTime: defaultNormalRule?.startTime ?? '09:00',
        endTime: defaultNormalRule?.endTime ?? '18:00',
        breakDurationMinutes: defaultNormalRule?.breakDurationMinutes ?? 60,
        submissionStatus: 'Draft',
      };

      const selectedRule =
        draft.shiftMode !== 'custom'
          ? activeShiftRules.find((r) => r.id === draft.shiftMode)
          : undefined;

      const calc = calculateAttendanceWage({
        worker,
        roleWageConfigs,
        status: draft.status,
        shiftRule: selectedRule,
        shiftRules: activeShiftRules,
        startTime: draft.shiftMode === 'custom' ? draft.startTime : selectedRule?.startTime,
        endTime: draft.shiftMode === 'custom' ? draft.endTime : selectedRule?.endTime,
        breakDurationMinutes:
          draft.shiftMode === 'custom'
            ? draft.breakDurationMinutes
            : selectedRule?.breakDurationMinutes,
      });

      const validation = validateAttendanceEntry(
        {
          recordId: draft.existingRecordId,
          workerId: worker.id,
          projectId: selectedProjectId,
          date: selectedDate,
          status: draft.status,
          startTime: calc.startTime,
          endTime: calc.endTime,
          attendanceUnits: calc.attendanceUnits,
        },
        attendanceRecords,
      );

      return { worker, draft, calc, validation };
    });
  }, [
    siteWorkers,
    drafts,
    activeShiftRules,
    roleWageConfigs,
    selectedProjectId,
    selectedDate,
    attendanceRecords,
    defaultNormalRule,
  ]);

  const summary = useMemo(() => {
    const presentCount = computedRows.filter(
      (r) => r.draft.status === 'Present' || r.draft.status === 'Pending verification',
    ).length;
    const halfDayCount = computedRows.filter(
      (r) => r.draft.status === 'Half Day',
    ).length;
    const totalUnits =
      Math.round(
        computedRows.reduce((sum, r) => sum + r.calc.attendanceUnits, 0) * 100,
      ) / 100;
    const totalWage = computedRows.reduce(
      (sum, r) => sum + r.calc.calculatedWage,
      0,
    );
    const errorCount = computedRows.filter((r) => !r.validation.valid).length;
    const submittedUnverifiedIds = computedRows
      .filter(
        (r) =>
          r.draft.existingRecordId && r.draft.submissionStatus !== 'Verified',
      )
      .map((r) => r.draft.existingRecordId!);

    return {
      presentCount,
      halfDayCount,
      totalUnits,
      totalWage,
      errorCount,
      submittedUnverifiedIds,
    };
  }, [computedRows]);

  const updateRow = (workerId: string, updater: (prev: DraftRow) => DraftRow) => {
    setDrafts((prev) => {
      const current = prev[workerId];
      if (!current) return prev;
      return { ...prev, [workerId]: updater(current) };
    });
    setFeedbackBanner(null);
  };

  const handleStatusChange = (workerId: string, status: AttendanceStatus) => {
    const halfRule = activeShiftRules.find((r) => r.wageMultiplier === 0.5);
    updateRow(workerId, (row) => {
      if (status === 'Half Day' && halfRule) {
        return {
          ...row,
          status,
          shiftMode: halfRule.id,
          startTime: halfRule.startTime,
          endTime: halfRule.endTime,
          breakDurationMinutes: halfRule.breakDurationMinutes,
        };
      }
      if (
        (status === 'Present' || status === 'Pending verification') &&
        defaultNormalRule &&
        row.status === 'Half Day'
      ) {
        return {
          ...row,
          status,
          shiftMode: defaultNormalRule.id,
          startTime: defaultNormalRule.startTime,
          endTime: defaultNormalRule.endTime,
          breakDurationMinutes: defaultNormalRule.breakDurationMinutes,
        };
      }
      return { ...row, status };
    });
  };

  const handleShiftChange = (workerId: string, mode: string) => {
    const rule = activeShiftRules.find((r) => r.id === mode);
    updateRow(workerId, (row) => {
      if (rule) {
        return {
          ...row,
          shiftMode: rule.id,
          status:
            rule.wageMultiplier <= 0.5
              ? 'Half Day'
              : row.status === 'Absent' || row.status === 'Leave' || row.status === 'Half Day'
              ? 'Present'
              : row.status,
          startTime: rule.startTime,
          endTime: rule.endTime,
          breakDurationMinutes: rule.breakDurationMinutes,
        };
      }
      return {
        ...row,
        shiftMode: 'custom',
        status:
          row.status === 'Absent' || row.status === 'Leave' ? 'Present' : row.status,
      };
    });
  };

  // Bulk Actions
  const bulkMarkStatus = (status: AttendanceStatus) => {
    setDrafts((prev) => {
      const next = { ...prev };
      for (const worker of siteWorkers) {
        const cur = next[worker.id];
        if (!cur) continue;
        next[worker.id] = { ...cur, status };
      }
      return next;
    });
    setFeedbackBanner(null);
  };

  const bulkApplyShift = (shiftId: string) => {
    const rule = activeShiftRules.find((r) => r.id === shiftId);
    if (!rule) return;
    setDrafts((prev) => {
      const next = { ...prev };
      for (const worker of siteWorkers) {
        const cur = next[worker.id];
        if (!cur) continue;
        next[worker.id] = {
          ...cur,
          status: rule.wageMultiplier <= 0.5 ? 'Half Day' : 'Present',
          shiftMode: rule.id,
          startTime: rule.startTime,
          endTime: rule.endTime,
          breakDurationMinutes: rule.breakDurationMinutes,
        };
      }
      return next;
    });
    setFeedbackBanner(null);
  };

  const handlePersist = (submissionStatus: AttendanceSubmissionStatus) => {
    if (summary.errorCount > 0) {
      setFeedbackBanner({
        type: 'error',
        message: `Resolve ${summary.errorCount} validation conflict(s) (overlapping multi-site hours or >1.5 daily units) before submitting.`,
      });
      return;
    }

    const entries: Array<Omit<AttendanceRecord, 'id'> & { id?: string }> =
      computedRows.map(({ worker, draft, calc }) => ({
        id: draft.existingRecordId,
        workerId: worker.id,
        projectId: selectedProjectId,
        date: selectedDate,
        status: draft.status,
        shiftRuleId: draft.shiftMode !== 'custom' ? draft.shiftMode : undefined,
        shiftName: calc.appliedRuleName,
        startTime: calc.startTime,
        endTime: calc.endTime,
        breakDurationMinutes: calc.breakDurationMinutes,
        attendanceUnits: calc.attendanceUnits,
        wageMultiplier: calc.wageMultiplier,
        effectiveDailyRate: calc.effectiveDailyRate,
        calculatedWage: calc.calculatedWage,
        submissionStatus,
        submittedBy: currentUser?.fullName ?? 'Supervisor',
        submittedAt: `${selectedDate} 18:10`,
      }));

    upsertAttendanceEntries(entries);
    setFeedbackBanner({
      type: 'success',
      message:
        submissionStatus === 'Draft'
          ? `Saved draft attendance for ${entries.length} worker(s) on ${formatIndianDate(selectedDate)}.`
          : `Submitted daily attendance for ${entries.length} worker(s) (${formatINR(summary.totalWage)} total wages).`,
    });
  };

  const handleAddMultiSiteWorker = () => {
    if (!addWorkerChoice) return;
    setExtraWorkerIds((prev) =>
      prev.includes(addWorkerChoice) ? prev : [...prev, addWorkerChoice],
    );
    setAddWorkerChoice('');
  };

  const longShiftRule = activeShiftRules.find((r) => r.wageMultiplier >= 1.5);

  return (
    <PageContainer>
      <PageHeader
        title="Daily Site Attendance"
        description="Mark daily site muster, select shift rules or custom working hours, and calculate wages automatically using Owner-configured rates."
        actions={
          permissions.canEditWageRates ? (
            <Button variant="outline" size="sm" asChild>
              <Link to="/wage-config">
                <SlidersHorizontal className="h-3.5 w-3.5" />
                <span>Configure Rates &amp; Shifts</span>
              </Link>
            </Button>
          ) : (
            <div className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-600">
              <Lock className="h-3.5 w-3.5 text-slate-400" />
              <span>Rates &amp; multipliers locked by Owner</span>
            </div>
          )
        }
      />

      {/* Step 1 & 2: Site & Date Selection + Summary */}
      <Card className="mb-5 p-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-12 md:items-end">
          <div className="md:col-span-4 space-y-1.5">
            <Label>Assigned Construction Site *</Label>
            <Select
              value={selectedProjectId}
              onValueChange={(val) => {
                setSelectedProjectId(val);
                setExtraWorkerIds([]);
              }}
            >
              <SelectTrigger aria-label="Select assigned site">
                <SelectValue placeholder="Choose site" />
              </SelectTrigger>
              <SelectContent>
                {accessibleProjects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name} ({p.city})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="md:col-span-3 space-y-1.5">
            <Label htmlFor="att-date">Attendance Date *</Label>
            <Input
              id="att-date"
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="font-mono tabular-nums"
            />
          </div>

          <div className="md:col-span-5 flex flex-wrap items-center gap-2 md:justify-end">
            <span className="font-mono text-[11px] uppercase tracking-[0.06em] text-[#77766F] mr-1">
              Quick dates:
            </span>
            {['2026-11-25', '2026-11-24', '2026-11-22', '2026-11-19'].map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setSelectedDate(d)}
                className={`min-h-[36px] rounded-[4px] px-3 py-1.5 text-xs font-mono transition-colors cursor-pointer ${
                  selectedDate === d
                    ? 'bg-[#252A27] text-[#F4F0E8]'
                    : 'bg-[#EAE4D9] text-[#57564F] hover:bg-[#DFD7C9] hover:text-[#252A27]'
                }`}
              >
                {formatIndianDate(d).slice(0, 6)}
              </button>
            ))}
          </div>
        </div>

        {/* Summary Strip + Bulk Actions */}
        <div className="mt-4 border-t border-[#E6E0D5] pt-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-[#57564F] tabular-nums">
            <span>
              Present:{' '}
              <strong className="text-[#252A27]">{summary.presentCount}</strong>
            </span>
            <span>
              Half Day:{' '}
              <strong className="text-[#252A27]">{summary.halfDayCount}</strong>
            </span>
            <span>
              Total Units:{' '}
              <strong className="font-mono text-[#252A27]">
                {summary.totalUnits}
              </strong>
            </span>
            <span>
              Calculated Site Wages:{' '}
              <strong className="font-mono text-[#A65229]">
                {formatINR(summary.totalWage)}
              </strong>
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => bulkMarkStatus('Present')}
            >
              <CheckCheck className="h-3.5 w-3.5" />
              <span>Mark All Present</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => bulkMarkStatus('Absent')}
            >
              <span>Mark All Absent</span>
            </Button>
            {defaultNormalRule && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => bulkApplyShift(defaultNormalRule.id)}
              >
                Normal 9–6 (1.0x)
              </Button>
            )}
            {longShiftRule && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => bulkApplyShift(longShiftRule.id)}
              >
                Long 6–6 (1.5x)
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Multi-site worker add bar */}
      {otherSiteActiveWorkers.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3">
          <div className="text-xs text-slate-600">
            <strong className="text-slate-800">Multi-Site Allocation:</strong>{' '}
            Pull an active worker from another site for a split-day shift (overlap &amp; 1.5-unit daily cap validated automatically).
          </div>
          <div className="flex items-center gap-2">
            <div className="w-[220px]">
              <Select value={addWorkerChoice} onValueChange={setAddWorkerChoice}>
                <SelectTrigger aria-label="Add worker from another site">
                  <SelectValue placeholder="Add worker to this site..." />
                </SelectTrigger>
                <SelectContent>
                  {otherSiteActiveWorkers.map((w) => (
                    <SelectItem key={w.id} value={w.id}>
                      {w.name} ({w.role})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!addWorkerChoice}
              onClick={handleAddMultiSiteWorker}
            >
              <UserPlus className="h-3.5 w-3.5" />
              <span>Add</span>
            </Button>
          </div>
        </div>
      )}

      {feedbackBanner && (
        <div
          className={`mb-4 rounded-lg border px-4 py-3 text-xs font-medium flex items-center gap-2 ${
            feedbackBanner.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border-red-200 bg-red-50 text-red-800'
          }`}
        >
          {feedbackBanner.type === 'success' ? (
            <CheckCircle2 className="h-4 w-4 shrink-0" />
          ) : (
            <AlertTriangle className="h-4 w-4 shrink-0" />
          )}
          <span>{feedbackBanner.message}</span>
        </div>
      )}

      {/* Attendance Grid (Desktop Table + Mobile Cards) */}
      {computedRows.length === 0 ? (
        <EmptyState
          title="No active workers assigned to this site"
          description="Select another assigned site or pull in an active worker using the Multi-Site Allocation control above."
        />
      ) : (
        <>
          {/* Desktop High-Density Table */}
          <Card className="hidden lg:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Worker &amp; Role</TableHead>
                  <TableHead className="w-[175px]">Attendance</TableHead>
                  <TableHead className="w-[235px]">Shift Rule / Hours</TableHead>
                  <TableHead className="w-[180px]">Start – End</TableHead>
                  <TableHead className="text-right">Units / Mult</TableHead>
                  <TableHead className="text-right">Calculated Wage</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {computedRows.map(({ worker, draft, calc, validation }) => {
                  const isWorking =
                    draft.status !== 'Absent' && draft.status !== 'Leave';
                  return (
                    <TableRow
                      key={worker.id}
                      className={!validation.valid ? 'bg-red-50/40' : ''}
                    >
                      <TableCell>
                        <div className="font-semibold text-slate-900">
                          {worker.name}
                        </div>
                        <div className="text-xs text-slate-500">
                          {worker.role} ·{' '}
                          <span className="font-mono">{worker.workerCode}</span>
                        </div>
                        {validation.otherSiteEntries.length > 0 && (
                          <div className="mt-1 text-[11px] text-amber-800">
                            Also on:{' '}
                            {validation.otherSiteEntries
                              .map(
                                (o) =>
                                  `${projectNameMap.get(o.projectId) ?? o.projectId} (${o.startTime}–${o.endTime}, ${o.attendanceUnits ?? 0}u)`,
                              )
                              .join('; ')}
                          </div>
                        )}
                        {validation.errors.map((err) => (
                          <div
                            key={err}
                            className="mt-1 flex items-start gap-1 text-[11px] font-medium text-red-700"
                          >
                            <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
                            <span>{err}</span>
                          </div>
                        ))}
                      </TableCell>

                      <TableCell>
                        <Select
                          value={draft.status}
                          onValueChange={(v) =>
                            handleStatusChange(worker.id, v as AttendanceStatus)
                          }
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {ATTENDANCE_STATUS_OPTIONS.map((st) => (
                              <SelectItem key={st} value={st}>
                                {st}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>

                      <TableCell>
                        {isWorking ? (
                          <Select
                            value={draft.shiftMode}
                            onValueChange={(v) =>
                              handleShiftChange(worker.id, v)
                            }
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {activeShiftRules.map((rule) => (
                                <SelectItem key={rule.id} value={rule.id}>
                                  {rule.name} ({rule.wageMultiplier}x)
                                </SelectItem>
                              ))}
                              <SelectItem value="custom">
                                Custom Working Hours
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <span className="text-xs text-slate-400">
                            No shift ({draft.status})
                          </span>
                        )}
                      </TableCell>

                      <TableCell>
                        {isWorking ? (
                          draft.shiftMode === 'custom' ? (
                            <div className="flex items-center gap-1.5">
                              <Input
                                type="time"
                                value={draft.startTime}
                                onChange={(e) =>
                                  updateRow(worker.id, (r) => ({
                                    ...r,
                                    startTime: e.target.value,
                                  }))
                                }
                                className="h-8 px-1.5 text-xs font-mono"
                              />
                              <span className="text-slate-400">–</span>
                              <Input
                                type="time"
                                value={draft.endTime}
                                onChange={(e) =>
                                  updateRow(worker.id, (r) => ({
                                    ...r,
                                    endTime: e.target.value,
                                  }))
                                }
                                className="h-8 px-1.5 text-xs font-mono"
                              />
                            </div>
                          ) : (
                            <div className="font-mono text-xs text-slate-700 tabular-nums">
                              {calc.startTime} – {calc.endTime}
                              <div className="text-[11px] font-sans text-slate-400">
                                {calc.netWorkedHours}h net · {calc.breakDurationMinutes}m break
                              </div>
                            </div>
                          )
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </TableCell>

                      <TableCell className="text-right font-mono text-xs tabular-nums">
                        <div className="font-medium text-slate-800">
                          {calc.attendanceUnits} u
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {calc.wageMultiplier}x
                        </div>
                      </TableCell>

                      <TableCell className="text-right font-mono tabular-nums">
                        <div className="font-semibold text-slate-900">
                          {formatINR(calc.calculatedWage)}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          Base {formatINR(calc.effectiveDailyRate)}
                        </div>
                      </TableCell>

                      <TableCell>
                        <Badge
                          variant={
                            draft.submissionStatus === 'Verified'
                              ? 'green'
                              : draft.submissionStatus === 'Submitted'
                              ? 'blue'
                              : 'neutral'
                          }
                        >
                          {draft.submissionStatus}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>

          {/* Mobile-Friendly Stacked Cards (< lg) */}
          <div className="space-y-3 lg:hidden">
            {computedRows.map(({ worker, draft, calc, validation }) => {
              const isWorking =
                draft.status !== 'Absent' && draft.status !== 'Leave';
              return (
                <Card
                  key={worker.id}
                  className={!validation.valid ? 'border-red-300 bg-red-50/30' : ''}
                >
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">
                          {worker.name}
                        </p>
                        <p className="text-xs text-slate-500">
                          {worker.role} · {worker.workerCode}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-mono text-sm font-bold text-slate-900 tabular-nums">
                          {formatINR(calc.calculatedWage)}
                        </p>
                        <Badge
                          variant={getPaymentStatusVariant(draft.submissionStatus)}
                        >
                          {draft.submissionStatus}
                        </Badge>
                      </div>
                    </div>

                    {/* Mobile-Friendly Large Touch-Target Quick Attendance Buttons (>=44px) */}
                    <div className="space-y-1.5">
                      <Label>Quick Attendance Tap</Label>
                      <div className="grid grid-cols-4 gap-1.5">
                        {(['Present', 'Half Day', 'Absent', 'Leave'] as const).map(
                          (quickStatus) => {
                            const isActive = draft.status === quickStatus;
                            return (
                              <button
                                key={quickStatus}
                                type="button"
                                onClick={() =>
                                  handleStatusChange(worker.id, quickStatus)
                                }
                                className={`min-h-[44px] rounded-[4px] border px-2 py-2 text-xs font-semibold transition-colors cursor-pointer ${
                                  isActive
                                    ? quickStatus === 'Present'
                                      ? 'border-[#5E6951] bg-[#5E6951] text-white'
                                      : quickStatus === 'Half Day'
                                      ? 'border-[#C66A3D] bg-[#C66A3D] text-white'
                                      : 'border-[#9A3026] bg-[#9A3026] text-white'
                                    : 'border-[#D8D1C5] bg-[#FAF8F3] text-[#252A27] hover:bg-[#EFEAE0]'
                                }`}
                              >
                                {quickStatus}
                              </button>
                            );
                          },
                        )}
                      </div>
                    </div>

                    {isWorking && (
                      <div className="space-y-1">
                        <Label>Shift Rule</Label>
                        <Select
                          value={draft.shiftMode}
                          onValueChange={(v) =>
                            handleShiftChange(worker.id, v)
                          }
                        >
                          <SelectTrigger className="h-11">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {activeShiftRules.map((rule) => (
                              <SelectItem key={rule.id} value={rule.id}>
                                {rule.name} ({rule.wageMultiplier}x)
                              </SelectItem>
                            ))}
                            <SelectItem value="custom">
                              Custom Working Hours
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {isWorking && draft.shiftMode === 'custom' && (
                      <div className="grid grid-cols-3 gap-2">
                        <div className="space-y-1">
                          <Label>Start</Label>
                          <Input
                            type="time"
                            value={draft.startTime}
                            onChange={(e) =>
                              updateRow(worker.id, (r) => ({
                                ...r,
                                startTime: e.target.value,
                              }))
                            }
                          />
                        </div>
                        <div className="space-y-1">
                          <Label>End</Label>
                          <Input
                            type="time"
                            value={draft.endTime}
                            onChange={(e) =>
                              updateRow(worker.id, (r) => ({
                                ...r,
                                endTime: e.target.value,
                              }))
                            }
                          />
                        </div>
                        <div className="space-y-1">
                          <Label>Break (m)</Label>
                          <Input
                            type="number"
                            value={draft.breakDurationMinutes}
                            onChange={(e) =>
                              updateRow(worker.id, (r) => ({
                                ...r,
                                breakDurationMinutes: Math.max(
                                  0,
                                  Number(e.target.value) || 0,
                                ),
                              }))
                            }
                          />
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between text-xs text-slate-500 border-t border-slate-100 pt-2 tabular-nums">
                      <span>
                        {isWorking
                          ? `${calc.startTime}–${calc.endTime} (${calc.netWorkedHours}h net)`
                          : draft.status}
                      </span>
                      <span className="font-mono">
                        {calc.attendanceUnits}u · {calc.wageMultiplier}x
                      </span>
                    </div>

                    {validation.errors.map((err) => (
                      <p key={err} className="text-xs font-medium text-red-700">
                        {err}
                      </p>
                    ))}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Sticky Action Footer */}
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-5 py-4">
            <div className="text-xs text-slate-600">
              <strong className="text-slate-900">
                {projectNameMap.get(selectedProjectId)}
              </strong>{' '}
              · {formatIndianDate(selectedDate)} ·{' '}
              <span className="font-mono font-semibold text-slate-900 tabular-nums">
                {formatINR(summary.totalWage)}
              </span>{' '}
              calculated across {computedRows.length} workers
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handlePersist('Draft')}
              >
                <Save className="h-3.5 w-3.5" />
                <span>Save Draft</span>
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => handlePersist('Submitted')}
              >
                <Send className="h-3.5 w-3.5" />
                <span>Submit Attendance</span>
              </Button>
              {permissions.canVerifyAttendance &&
                summary.submittedUnverifiedIds.length > 0 && (
                  <Button
                    type="button"
                    variant="navy"
                    size="sm"
                    onClick={() => {
                      verifyAttendanceRecords(summary.submittedUnverifiedIds);
                      setFeedbackBanner({
                        type: 'success',
                        message: `Verified ${summary.submittedUnverifiedIds.length} attendance record(s) for payroll.`,
                      });
                    }}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>
                      Verify ({summary.submittedUnverifiedIds.length})
                    </span>
                  </Button>
                )}
            </div>
          </div>
        </>
      )}
    </PageContainer>
  );
}
