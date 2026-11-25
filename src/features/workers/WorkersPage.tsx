import React, { useEffect, useMemo, useState } from 'react';
import {
  CheckCheck,
  CheckCircle2,
  FileText,
  IndianRupee,
  Pencil,
  Plus,
  Printer,
  RotateCcw,
  Search,
  ShieldCheck,
  UserPlus,
} from 'lucide-react';
import { PageContainer, PageHeader } from '@/src/components/layout/PageContainer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';
import { Badge, getPaymentStatusVariant } from '@/src/components/ui/badge';
import { Input, Label } from '@/src/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/src/components/ui/tabs';
import { EmptyState } from '@/src/components/ui/feedback';
import { ConfirmActionDialog } from '@/src/components/ui/confirm-dialog';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/src/components/ui/table';
import { useBuildFlow } from '@/src/context/BuildFlowContext';
import { formatINR, formatIndianDate } from '@/src/lib/utils';
import { WorkerStatementDialog } from './components/WorkerStatementDialog';
import type { AttendanceStatus, PaymentMode, Worker, WorkerRole } from '@/src/types';

const WORKER_ROLES: WorkerRole[] = [
  'Site Engineer',
  'Head Mason',
  'Mason',
  'Bar Bender',
  'Carpenter (Shuttering)',
  'Electrician',
  'Plumber',
  'Tile Layer',
  'Painter',
  'Site Helper',
];

const ATTENDANCE_STATES: AttendanceStatus[] = ['Present', 'Half Day', 'Absent', 'Leave'];

export function WorkersPage() {
  const {
    projects,
    workers,
    attendanceRecords,
    workerAdvances,
    wagePayments,
    createWorker,
    updateWorker,
    recordBulkAttendance,
    verifyAttendanceRecords,
    recordWorkerAdvance,
    recordWagePayment,
    getWorkerWageSummary,
  } = useBuildFlow();

  // Search & filter state for Weekly Wages & Workers
  const [searchQuery, setSearchQuery] = useState('');
  const [projectFilter, setProjectFilter] = useState('all');
  const [payrollStatusFilter, setPayrollStatusFilter] = useState<
    'all' | 'Paid' | 'Partially Paid' | 'Pending'
  >('all');
  const [confirmVerifyAllOpen, setConfirmVerifyAllOpen] = useState(false);

  // Attendance tab state
  const [attProjectId, setAttProjectId] = useState(projects[0]?.id ?? '');
  const [attDate, setAttDate] = useState('2026-11-24');
  const [bulkDraft, setBulkDraft] = useState<Record<string, AttendanceStatus>>({});
  const [attNotice, setAttNotice] = useState('');

  // Dialog states
  const [workerDialogOpen, setWorkerDialogOpen] = useState(false);
  const [editingWorker, setEditingWorker] = useState<Worker | undefined>();
  const [advanceWorker, setAdvanceWorker] = useState<Worker | undefined>();
  const [payWorker, setPayWorker] = useState<Worker | undefined>();
  const [statementWorkerId, setStatementWorkerId] = useState<string | undefined>();

  // Worker form fields
  const [wName, setWName] = useState('');
  const [wPhone, setWPhone] = useState('+91 ');
  const [wRole, setWRole] = useState<WorkerRole>('Mason');
  const [wDailyWage, setWDailyWage] = useState('950');
  const [wJoinedDate, setWJoinedDate] = useState('2026-11-24');
  const [wProjectId, setWProjectId] = useState(projects[0]?.id ?? '');
  const [wActive, setWActive] = useState(true);

  // Advance form fields
  const [advAmount, setAdvAmount] = useState('');
  const [advDate, setAdvDate] = useState('2026-11-24');
  const [advReason, setAdvReason] = useState('');

  // Wage payment fields
  const [payAmount, setPayAmount] = useState('');
  const [payDate, setPayDate] = useState('2026-11-24');
  const [payMode, setPayMode] = useState<PaymentMode>('UPI');
  const [payRef, setPayRef] = useState('');
  const [payPeriod, setPayPeriod] = useState('Nov 2026 Weekly Settlement');

  const assignedWorkersForSite = useMemo(
    () =>
      workers.filter(
        (w) =>
          (w.active ?? true) &&
          (w.assignedProjectId === attProjectId ||
            (w.assignedProjectIds ?? []).includes(attProjectId)),
      ),
    [workers, attProjectId],
  );

  // Check existing attendance records for selected project & date (duplicate guard)
  const existingAttendanceMap = useMemo(() => {
    const map = new Map<string, AttendanceStatus>();
    for (const rec of attendanceRecords) {
      if (rec.projectId === attProjectId && rec.date === attDate) {
        map.set(rec.workerId, rec.status);
      }
    }
    return map;
  }, [attendanceRecords, attProjectId, attDate]);

  useEffect(() => {
    const init: Record<string, AttendanceStatus> = {};
    for (const w of assignedWorkersForSite) {
      init[w.id] = existingAttendanceMap.get(w.id) ?? 'Present';
    }
    setBulkDraft(init);
    setAttNotice('');
  }, [assignedWorkersForSite, existingAttendanceMap]);

  const wageSummaries = useMemo(
    () => workers.map((w) => getWorkerWageSummary(w.id)),
    [workers, getWorkerWageSummary],
  );

  const filteredWageSummaries = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return wageSummaries.filter((item) => {
      if (projectFilter !== 'all' && item.worker.assignedProjectId !== projectFilter) {
        return false;
      }
      if (payrollStatusFilter !== 'all' && item.payrollStatus !== payrollStatusFilter) {
        return false;
      }
      if (q) {
        const hay = [
          item.worker.name,
          item.worker.workerCode ?? '',
          item.worker.role,
          item.worker.phone,
        ]
          .join(' ')
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [wageSummaries, searchQuery, projectFilter, payrollStatusFilter]);

  const unverifiedAttendanceIds = useMemo(
    () =>
      attendanceRecords
        .filter((r) => r.submissionStatus !== 'Verified')
        .map((r) => r.id),
    [attendanceRecords],
  );

  const totalUnpaidWages = useMemo(
    () => wageSummaries.reduce((s, item) => s + item.netPayable, 0),
    [wageSummaries],
  );

  const getProjectName = (id: string) => projects.find((p) => p.id === id)?.name ?? 'Project';

  const openWorkerModal = (worker?: Worker) => {
    setEditingWorker(worker);
    if (worker) {
      setWName(worker.name);
      setWPhone(worker.phone);
      setWRole(worker.role);
      setWDailyWage(String(worker.dailyWage));
      setWJoinedDate(worker.joinedDate);
      setWProjectId(worker.assignedProjectId);
      setWActive(worker.active ?? true);
    } else {
      setWName('');
      setWPhone('+91 ');
      setWRole('Mason');
      setWDailyWage('950');
      setWJoinedDate('2026-11-24');
      setWProjectId(projects[0]?.id ?? '');
      setWActive(true);
    }
    setWorkerDialogOpen(true);
  };

  const handleSaveWorker = (e: React.FormEvent) => {
    e.preventDefault();
    if (!wName.trim() || Number(wDailyWage) <= 0) return;
    if (editingWorker) {
      updateWorker(editingWorker.id, {
        name: wName.trim(),
        phone: wPhone.trim(),
        role: wRole,
        dailyWage: Number(wDailyWage),
        joinedDate: wJoinedDate,
        assignedProjectId: wProjectId,
        assignedProjectIds: [wProjectId],
        active: wActive,
      });
    } else {
      createWorker({
        name: wName.trim(),
        phone: wPhone.trim(),
        role: wRole,
        dailyWage: Number(wDailyWage),
        joinedDate: wJoinedDate,
        assignedProjectId: wProjectId,
        assignedProjectIds: [wProjectId],
        active: wActive,
      });
    }
    setWorkerDialogOpen(false);
  };

  const handleSaveBulkAttendance = () => {
    const entries = assignedWorkersForSite.map((w) => ({
      workerId: w.id,
      status: bulkDraft[w.id] ?? 'Present',
    }));
    const result = recordBulkAttendance(attProjectId, attDate, entries);
    setAttNotice(
      result.updated > 0 && result.created === 0
        ? `Updated ${result.updated} existing record(s) for ${formatIndianDate(attDate)} (duplicates prevented).`
        : `Saved attendance: ${result.created} new, ${result.updated} updated for ${formatIndianDate(attDate)}.`,
    );
  };

  const handleRecordAdvance = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Number(advAmount);
    if (!advanceWorker || !Number.isFinite(amt) || amt <= 0) return;
    recordWorkerAdvance({
      workerId: advanceWorker.id,
      projectId: advanceWorker.assignedProjectId,
      date: advDate,
      amount: amt,
      approvedDeduction: true,
      reason: advReason.trim() || 'Weekly site advance',
    });
    setAdvanceWorker(undefined);
    setAdvAmount('');
    setAdvReason('');
  };

  const handleRecordWagePay = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Number(payAmount);
    if (!payWorker || !Number.isFinite(amt) || amt <= 0) return;
    recordWagePayment({
      workerId: payWorker.id,
      projectId: payWorker.assignedProjectId,
      date: payDate,
      amount: amt,
      mode: payMode,
      referenceNo: payRef.trim() || `PAY-${Date.now().toString().slice(-5)}`,
      periodLabel: payPeriod.trim() || 'Weekly Wages',
    });
    setPayWorker(undefined);
    setPayAmount('');
    setPayRef('');
  };

  const statementSummary = statementWorkerId
    ? wageSummaries.find((s) => s.worker.id === statementWorkerId)
    : undefined;

  return (
    <PageContainer>
      <PageHeader
        title="Weekly Wages, Attendance Review & Payroll"
        description="Approve supervisor-submitted attendance, review shift-based wage tallies, disburse weekly payments, and print worker statements."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => window.print()}>
              <Printer className="h-4 w-4" />
              Print Payroll Register
            </Button>
            <Button size="sm" onClick={() => openWorkerModal()}>
              <UserPlus className="h-4 w-4" />
              Add Worker
            </Button>
          </div>
        }
      />

      {/* Owner Attendance Approval & Payroll Banner */}
      <Card className="mb-5 border-[#E7C4B3] bg-[#FBF1EC]/75 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-[5px] bg-[#C66A3D] text-white">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                Owner Attendance Verification &amp; Weekly Wage Tally
              </h3>
              <p className="text-xs text-slate-600">
                {unverifiedAttendanceIds.length > 0
                  ? `${unverifiedAttendanceIds.length} attendance entry/entries submitted by site supervisors are awaiting Owner verification.`
                  : 'All submitted attendance records are verified and synced with Worker Portal wage statements.'}
              </p>
            </div>
          </div>
          {unverifiedAttendanceIds.length > 0 ? (
            <Button size="sm" onClick={() => setConfirmVerifyAllOpen(true)}>
              <CheckCircle2 className="h-4 w-4" />
              Approve &amp; Verify All ({unverifiedAttendanceIds.length})
            </Button>
          ) : (
            <Badge variant="success">All Attendance Verified</Badge>
          )}
        </div>
      </Card>

      {/* Top KPI Summary */}
      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="p-5">
          <p className="text-xs font-medium text-[#64748B]">Active Workforce</p>
          <p className="mt-1.5 font-mono text-xl font-semibold text-[#0F172A] tabular-nums">
            {workers.filter((w) => w.active ?? true).length}{' '}
            <span className="font-sans text-xs font-normal text-[#64748B]">
              of {workers.length} registered
            </span>
          </p>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-medium text-[#64748B]">Attendance Records Logged</p>
          <p className="mt-1.5 font-mono text-xl font-semibold text-[#0F172A] tabular-nums">
            {attendanceRecords.length}{' '}
            <span className="font-sans text-xs font-normal text-emerald-700">
              ({attendanceRecords.length - unverifiedAttendanceIds.length} verified)
            </span>
          </p>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-medium text-[#64748B]">Net Unpaid Wages Payable</p>
          <p className="mt-1.5 font-mono text-xl font-semibold text-[#B45309] tabular-nums">
            {formatINR(totalUnpaidWages)}
          </p>
        </Card>
      </div>

      {/* Filter Bar */}
      <Card className="mb-5 p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="relative lg:col-span-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search worker name, WRK code, trade role..."
              className="pl-9"
            />
          </div>
          <Select value={projectFilter} onValueChange={setProjectFilter}>
            <SelectTrigger>
              <SelectValue placeholder="All Projects" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Assigned Sites</SelectItem>
              {projects.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2">
            <Select
              value={payrollStatusFilter}
              onValueChange={(v) =>
                setPayrollStatusFilter(
                  v as 'all' | 'Paid' | 'Partially Paid' | 'Pending',
                )
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="All Payroll Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Payroll Statuses</SelectItem>
                <SelectItem value="Pending">Pending</SelectItem>
                <SelectItem value="Partially Paid">Partially Paid</SelectItem>
                <SelectItem value="Paid">Paid (Settled)</SelectItem>
              </SelectContent>
            </Select>
            {(searchQuery || projectFilter !== 'all' || payrollStatusFilter !== 'all') && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setSearchQuery('');
                  setProjectFilter('all');
                  setPayrollStatusFilter('all');
                }}
                title="Reset filters"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </Card>

      <Tabs defaultValue="wages">
        <TabsList>
          <TabsTrigger value="wages">
            Wages &amp; Payroll ({filteredWageSummaries.length})
          </TabsTrigger>
          <TabsTrigger value="workers">Workers ({workers.length})</TabsTrigger>
          <TabsTrigger value="attendance">Quick Bulk Attendance</TabsTrigger>
        </TabsList>

        {/* Tab 1: Workers Directory */}
        <TabsContent value="workers">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Worker</TableHead>
                    <TableHead>Work Type</TableHead>
                    <TableHead>Assigned Project</TableHead>
                    <TableHead className="text-right">Daily Wage</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {workers.map((worker) => {
                    const isActive = worker.active ?? true;
                    return (
                      <TableRow key={worker.id}>
                        <TableCell>
                          <p className="font-medium text-[#0F172A]">{worker.name}</p>
                          <p className="text-xs text-[#64748B]">{worker.phone}</p>
                        </TableCell>
                        <TableCell className="text-xs text-[#334155]">{worker.role}</TableCell>
                        <TableCell className="text-xs text-[#334155]">
                          {getProjectName(worker.assignedProjectId)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs font-semibold tabular-nums">
                          {formatINR(worker.dailyWage)}/day
                        </TableCell>
                        <TableCell className="text-xs text-[#475569] tabular-nums">
                          {formatIndianDate(worker.joinedDate)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={isActive ? 'success' : 'neutral'}>
                            {isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openWorkerModal(worker)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            Edit
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Bulk Daily Attendance with Duplicate Guard */}
        <TabsContent value="attendance">
          <Card>
            <CardHeader className="border-b border-[#F1F5F9]">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <CardTitle>Site Attendance Muster Roll</CardTitle>
                  <CardDescription>
                    Select project and date for bulk entry. Existing entries for the same worker,
                    project, and date are updated rather than duplicated.
                  </CardDescription>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Select value={attProjectId} onValueChange={setAttProjectId}>
                    <SelectTrigger className="w-[210px] bg-white">
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
                  <Input
                    type="date"
                    value={attDate}
                    onChange={(e) => setAttDate(e.target.value)}
                    className="w-[155px]"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const allPresent: Record<string, AttendanceStatus> = {};
                      for (const w of assignedWorkersForSite) allPresent[w.id] = 'Present';
                      setBulkDraft(allPresent);
                    }}
                  >
                    Mark All Present
                  </Button>
                </div>
              </div>
              {existingAttendanceMap.size > 0 && (
                <p className="mt-2 text-xs font-medium text-[#A65229]">
                  Attendance already exists for {existingAttendanceMap.size} worker(s) on{' '}
                  {formatIndianDate(attDate)} — saving will update existing entries cleanly without
                  creating duplicates.
                </p>
              )}
              {attNotice && (
                <p className="mt-2 rounded border border-[#BBF7D0] bg-[#F0FDF4] px-3 py-2 text-xs font-medium text-[#15803D]">
                  {attNotice}
                </p>
              )}
            </CardHeader>

            <CardContent className="p-0">
              <div className="divide-y divide-[#F1F5F9]">
                {assignedWorkersForSite.map((worker) => {
                  const selected = bulkDraft[worker.id] ?? 'Present';
                  return (
                    <div
                      key={worker.id}
                      className="flex flex-col gap-3 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <p className="text-sm font-medium text-[#0F172A]">{worker.name}</p>
                        <p className="text-xs text-[#64748B]">
                          {worker.role} · {formatINR(worker.dailyWage)}/day
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {ATTENDANCE_STATES.map((st) => (
                          <button
                            key={st}
                            type="button"
                            onClick={() =>
                              setBulkDraft((prev) => ({ ...prev, [worker.id]: st }))
                            }
                            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer border ${
                              selected === st
                                ? st === 'Present'
                                  ? 'bg-[#15803D] text-white border-[#15803D]'
                                  : st === 'Half Day'
                                    ? 'bg-[#B45309] text-white border-[#B45309]'
                                    : st === 'Absent'
                                      ? 'bg-[#DC2626] text-white border-[#DC2626]'
                                      : 'bg-[#475569] text-white border-[#475569]'
                                : 'bg-white text-[#475569] border-[#CBD5E1] hover:bg-[#F8FAFC]'
                            }`}
                          >
                            {st}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-end border-t border-[#E2E8F0] bg-[#F8FAFC] px-5 py-3.5 rounded-b-lg">
                <Button onClick={handleSaveBulkAttendance}>
                  <CheckCheck className="h-4 w-4" />
                  Save Bulk Attendance
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3: Wages, Advances & Statements */}
        <TabsContent value="wages">
          <Card>
            <CardContent className="p-0">
              {filteredWageSummaries.length === 0 ? (
                <div className="p-6">
                  <EmptyState
                    title="No matching payroll records"
                    description="Try clearing the active search or payroll status filter."
                  />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Worker &amp; Rate</TableHead>
                      <TableHead className="text-right">Days &amp; Units</TableHead>
                      <TableHead className="text-right">Regular Wages</TableHead>
                      <TableHead className="text-right">Addl / Overtime</TableHead>
                      <TableHead className="text-right">Gross Wages</TableHead>
                      <TableHead className="text-right">Deductions</TableHead>
                      <TableHead className="text-right">Paid</TableHead>
                      <TableHead className="text-right">Net Payable</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredWageSummaries.map((item) => (
                      <TableRow key={item.worker.id}>
                        <TableCell>
                          <p className="font-medium text-[#0F172A]">{item.worker.name}</p>
                          <p className="text-xs text-[#64748B]">
                            {item.worker.role} · {formatINR(item.effectiveDailySalary)}/day
                            {item.salarySource === 'individual_override' ? ' (Override)' : ''}
                          </p>
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs tabular-nums">
                          {item.totalUnits} u
                          <p className="text-[11px] text-[#64748B]">
                            {item.presentDays}P / {item.halfDays}H ({item.verifiedDays} verified)
                          </p>
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs tabular-nums">
                          {formatINR(item.regularWages)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs text-[#A65229] tabular-nums">
                          {item.additionalWages > 0 ? `+${formatINR(item.additionalWages)}` : '₹0'}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs font-medium tabular-nums">
                          {formatINR(item.grossWages)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs text-[#B45309] tabular-nums">
                          {formatINR(item.approvedDeductions)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs text-[#15803D] tabular-nums">
                          {formatINR(item.wagesPaid)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm font-semibold text-[#0F172A] tabular-nums">
                          {formatINR(item.netPayable)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              item.payrollStatus === 'Paid'
                                ? 'success'
                                : item.payrollStatus === 'Partially Paid'
                                ? 'info'
                                : 'warning'
                            }
                          >
                            {item.payrollStatus}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="inline-flex items-center gap-1.5">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setAdvanceWorker(item.worker);
                                setAdvAmount('1000');
                              }}
                            >
                              <Plus className="h-3 w-3" />
                              Advance
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={item.netPayable <= 0}
                              onClick={() => {
                                setPayWorker(item.worker);
                                setPayAmount(String(item.netPayable));
                              }}
                            >
                              <IndianRupee className="h-3 w-3" />
                              Pay
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setStatementWorkerId(item.worker.id)}
                            >
                              <FileText className="h-3.5 w-3.5" />
                              Statement
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <ConfirmActionDialog
        open={confirmVerifyAllOpen}
        onOpenChange={setConfirmVerifyAllOpen}
        title="Verify All Submitted Attendance Records"
        description={`Verify ${unverifiedAttendanceIds.length} attendance entry/entries submitted by site supervisors? Verified records lock shift multipliers and update worker wage statements immediately.`}
        confirmLabel="Approve & Verify Attendance"
        variant="success"
        onConfirm={() => {
          verifyAttendanceRecords(unverifiedAttendanceIds);
        }}
      />

      {/* Add / Edit Worker Dialog */}
      <Dialog open={workerDialogOpen} onOpenChange={setWorkerDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingWorker ? 'Edit Worker Profile' : 'Add Site Worker'}</DialogTitle>
            <DialogDescription>
              Maintain contact info, daily wage rate, active status, and assigned site.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveWorker} className="flex flex-col overflow-hidden">
            <div className="px-6 py-5 space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Full Name *</Label>
                  <Input value={wName} onChange={(e) => setWName(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Phone *</Label>
                  <Input value={wPhone} onChange={(e) => setWPhone(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Work Type *</Label>
                  <Select value={wRole} onValueChange={(v) => setWRole(v as WorkerRole)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {WORKER_ROLES.map((r) => (
                        <SelectItem key={r} value={r}>
                          {r}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Daily Wage Rate (₹) *</Label>
                  <Input
                    type="number"
                    min={200}
                    value={wDailyWage}
                    onChange={(e) => setWDailyWage(e.target.value)}
                    className="font-mono tabular-nums"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Assigned Project *</Label>
                  <Select value={wProjectId} onValueChange={setWProjectId}>
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
                <div className="space-y-1.5">
                  <Label>Joining Date</Label>
                  <Input
                    type="date"
                    value={wJoinedDate}
                    onChange={(e) => setWJoinedDate(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <input
                  id="worker-active"
                  type="checkbox"
                  checked={wActive}
                  onChange={(e) => setWActive(e.target.checked)}
                  className="h-4 w-4 rounded border-[#CBD5E1]"
                />
                <Label htmlFor="worker-active">Worker is currently active on roster</Label>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setWorkerDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">{editingWorker ? 'Save Changes' : 'Add Worker'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Record Worker Advance Dialog */}
      <Dialog open={Boolean(advanceWorker)} onOpenChange={(o) => !o && setAdvanceWorker(undefined)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Record Worker Advance — {advanceWorker?.name}</DialogTitle>
            <DialogDescription>
              Advances are automatically deducted from gross wages in payroll.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleRecordAdvance} className="flex flex-col overflow-hidden">
            <div className="px-6 py-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Advance Amount (₹) *</Label>
                  <Input
                    type="number"
                    min={100}
                    value={advAmount}
                    onChange={(e) => setAdvAmount(e.target.value)}
                    className="font-mono tabular-nums"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Date</Label>
                  <Input type="date" value={advDate} onChange={(e) => setAdvDate(e.target.value)} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Reason / Notes</Label>
                <Input
                  value={advReason}
                  onChange={(e) => setAdvReason(e.target.value)}
                  placeholder="Weekly cash kharchi / advance"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAdvanceWorker(undefined)}>
                Cancel
              </Button>
              <Button type="submit">Record Advance</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Record Wage Payment Dialog */}
      <Dialog open={Boolean(payWorker)} onOpenChange={(o) => !o && setPayWorker(undefined)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Record Wage Payment — {payWorker?.name}</DialogTitle>
            <DialogDescription>Disburse net payable wages and update unpaid balance.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleRecordWagePay} className="flex flex-col overflow-hidden">
            <div className="px-6 py-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Amount Paid (₹) *</Label>
                  <Input
                    type="number"
                    min={1}
                    value={payAmount}
                    onChange={(e) => setPayAmount(e.target.value)}
                    className="font-mono tabular-nums"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Date</Label>
                  <Input type="date" value={payDate} onChange={(e) => setPayDate(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Mode</Label>
                  <Select value={payMode} onValueChange={(v) => setPayMode(v as PaymentMode)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="UPI">UPI</SelectItem>
                      <SelectItem value="Cash">Cash</SelectItem>
                      <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Reference</Label>
                  <Input value={payRef} onChange={(e) => setPayRef(e.target.value)} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Payroll Period Label</Label>
                <Input value={payPeriod} onChange={(e) => setPayPeriod(e.target.value)} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setPayWorker(undefined)}>
                Cancel
              </Button>
              <Button type="submit">Record Wage Payment</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <WorkerStatementDialog
        summary={statementSummary}
        projectName={
          statementSummary ? getProjectName(statementSummary.worker.assignedProjectId) : ''
        }
        advances={workerAdvances.filter((a) => a.workerId === statementWorkerId)}
        payments={wagePayments.filter((p) => p.workerId === statementWorkerId)}
        open={Boolean(statementSummary)}
        onOpenChange={(o) => !o && setStatementWorkerId(undefined)}
      />
    </PageContainer>
  );
}
