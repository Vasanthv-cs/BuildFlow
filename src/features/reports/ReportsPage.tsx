import React, { useMemo, useState } from 'react';
import {
  Building2,
  Calculator,
  CheckCircle2,
  FileSpreadsheet,
  HardHat,
  IndianRupee,
  Printer,
  Search,
} from 'lucide-react';
import { PageContainer, PageHeader } from '@/src/components/layout/PageContainer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';
import { Badge, getProjectStatusVariant } from '@/src/components/ui/badge';
import { Input, Label } from '@/src/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/src/components/ui/tabs';
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
import { useBuildFlow } from '@/src/context/BuildFlowContext';
import {
  calculateScheduleWageTally,
  calculateShiftExamplesForDailyWage,
} from '@/src/lib/wageCalculations';
import { formatIndianDate, formatINR } from '@/src/lib/utils';

export function ReportsPage() {
  const {
    projects,
    workers,
    progressReports,
    getProjectFinancials,
    getWorkerWageSummary,
  } = useBuildFlow();

  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFrom, setDateFrom] = useState('2026-11-01');
  const [dateTo, setDateTo] = useState('2026-11-30');
  const [testDailyWage, setTestDailyWage] = useState('1000');

  const parsedDailyWage = Math.max(100, Number(testDailyWage) || 1000);

  const shiftValidationExamples = useMemo(
    () => calculateShiftExamplesForDailyWage(parsedDailyWage),
    [parsedDailyWage],
  );

  const compositeScheduleValidation = useMemo(
    () =>
      calculateScheduleWageTally(parsedDailyWage, {
        longDays: 3,
        normalDaysWithHalfAdditionalUnit: 1,
        normalDays: 3,
      }),
    [parsedDailyWage],
  );

  const projectFinancialRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return projects
      .filter((p) => {
        if (projectFilter !== 'all' && p.id !== projectFilter) return false;
        if (q) {
          const hay = [p.name, p.code, p.customerName, p.siteManager, p.city]
            .join(' ')
            .toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      })
      .map((project) => ({
        project,
        fin: getProjectFinancials(project.id),
      }));
  }, [projects, projectFilter, searchQuery, getProjectFinancials]);

  const workforcePayrollRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return workers
      .filter((w) => {
        if (projectFilter !== 'all' && w.assignedProjectId !== projectFilter) return false;
        if (q) {
          const hay = [w.name, w.workerCode ?? '', w.role, w.phone]
            .join(' ')
            .toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      })
      .map((w) => getWorkerWageSummary(w.id));
  }, [workers, projectFilter, searchQuery, getWorkerWageSummary]);

  const filteredProgressReports = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return progressReports
      .filter((r) => {
        if (projectFilter !== 'all' && r.projectId !== projectFilter) return false;
        if (dateFrom && r.reportDate < dateFrom) return false;
        if (dateTo && r.reportDate > dateTo) return false;
        if (q) {
          const hay = [r.stage, r.summary, r.submittedBy, r.weekLabel ?? '']
            .join(' ')
            .toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => b.reportDate.localeCompare(a.reportDate));
  }, [progressReports, projectFilter, dateFrom, dateTo, searchQuery]);

  const totals = useMemo(() => {
    const contractTotal = projectFinancialRows.reduce(
      (s, r) => s + r.fin.contractValue,
      0,
    );
    const receivedTotal = projectFinancialRows.reduce(
      (s, r) => s + r.fin.amountReceived,
      0,
    );
    const expensesTotal = projectFinancialRows.reduce(
      (s, r) => s + r.fin.recordedExpenses,
      0,
    );
    const grossPayroll = workforcePayrollRows.reduce(
      (s, r) => s + r.grossWages,
      0,
    );
    const netPayablePayroll = workforcePayrollRows.reduce(
      (s, r) => s + r.netPayable,
      0,
    );
    return {
      contractTotal,
      receivedTotal,
      expensesTotal,
      grossPayroll,
      netPayablePayroll,
    };
  }, [projectFinancialRows, workforcePayrollRows]);

  return (
    <PageContainer>
      <PageHeader
        title="Financial, Payroll & Site Progress Reports"
        description="Printable executive statements across project profitability, attendance-driven weekly payroll registers, and shift wage validation."
        actions={
          <Button size="sm" onClick={() => window.print()}>
            <Printer className="h-4 w-4" />
            <span>Print Executive Report</span>
          </Button>
        }
      />

      {/* Executive KPI Summary */}
      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card className="p-4">
          <p className="text-xs font-medium text-slate-500">Portfolio Contract Value</p>
          <p className="mt-1.5 font-mono text-lg font-semibold text-slate-900 tabular-nums">
            {formatINR(totals.contractTotal, { compact: true })}
          </p>
          <p className="mt-0.5 text-[11px] text-slate-400 tabular-nums">
            {formatINR(totals.contractTotal)}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-medium text-slate-500">Client Collections</p>
          <p className="mt-1.5 font-mono text-lg font-semibold text-emerald-700 tabular-nums">
            {formatINR(totals.receivedTotal, { compact: true })}
          </p>
          <p className="mt-0.5 text-[11px] text-slate-400 tabular-nums">
            {formatINR(totals.receivedTotal)}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-medium text-slate-500">Recorded Site Expenses</p>
          <p className="mt-1.5 font-mono text-lg font-semibold text-slate-900 tabular-nums">
            {formatINR(totals.expensesTotal, { compact: true })}
          </p>
          <p className="mt-0.5 text-[11px] text-slate-400 tabular-nums">
            {formatINR(totals.expensesTotal)}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-medium text-slate-500">Gross Workforce Wages</p>
          <p className="mt-1.5 font-mono text-lg font-semibold text-[#A65229] tabular-nums">
            {formatINR(totals.grossPayroll)}
          </p>
          <p className="mt-0.5 text-[11px] text-slate-400">
            {workforcePayrollRows.length} workers in scope
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-medium text-slate-500">Net Payroll Outstanding</p>
          <p className="mt-1.5 font-mono text-lg font-semibold text-amber-700 tabular-nums">
            {formatINR(totals.netPayablePayroll)}
          </p>
          <p className="mt-0.5 text-[11px] text-slate-400">
            After advances &amp; payments
          </p>
        </Card>
      </div>

      {/* Global Report Filters */}
      <Card className="mb-5 p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search project, worker, stage..."
              className="pl-9"
            />
          </div>
          <Select value={projectFilter} onValueChange={setProjectFilter}>
            <SelectTrigger>
              <SelectValue placeholder="All Projects" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Projects</SelectItem>
              {projects.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name} ({p.code})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2">
            <Label className="text-xs text-slate-500 shrink-0">From</Label>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-xs text-slate-500 shrink-0">To</Label>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </div>
        </div>
      </Card>

      <Tabs defaultValue="financial">
        <TabsList>
          <TabsTrigger value="financial">
            <Building2 className="mr-1.5 h-3.5 w-3.5" />
            Project Financial Statement ({projectFinancialRows.length})
          </TabsTrigger>
          <TabsTrigger value="payroll">
            <HardHat className="mr-1.5 h-3.5 w-3.5" />
            Workforce Payroll Register ({workforcePayrollRows.length})
          </TabsTrigger>
          <TabsTrigger value="wage_validator">
            <Calculator className="mr-1.5 h-3.5 w-3.5" />
            Salary Formula Validator (D)
          </TabsTrigger>
          <TabsTrigger value="progress">
            <FileSpreadsheet className="mr-1.5 h-3.5 w-3.5" />
            Site Progress Audit ({filteredProgressReports.length})
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Project Financial Statement */}
        <TabsContent value="financial">
          <Card>
            <CardHeader className="border-b border-slate-100">
              <CardTitle>Project-Wise Profitability &amp; Cashflow Statement</CardTitle>
              <CardDescription>
                Contract value, customer collections, outstanding dues, recorded site expenses, and projected margin in INR
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Project &amp; Customer</TableHead>
                    <TableHead>Supervisor</TableHead>
                    <TableHead className="text-right">Contract Value</TableHead>
                    <TableHead className="text-right">Received</TableHead>
                    <TableHead className="text-right">Client Balance</TableHead>
                    <TableHead className="text-right">Recorded Expenses</TableHead>
                    <TableHead className="text-right">Projected Margin</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {projectFinancialRows.map(({ project, fin }) => (
                    <TableRow key={project.id}>
                      <TableCell>
                        <div className="font-semibold text-slate-900">{project.name}</div>
                        <div className="text-xs text-slate-500">
                          {project.code} · {project.customerName}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-slate-700">
                        {project.siteManager}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs font-medium tabular-nums">
                        {formatINR(fin.contractValue)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs text-emerald-700 tabular-nums">
                        {formatINR(fin.amountReceived)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs text-amber-700 tabular-nums">
                        {formatINR(fin.outstandingCustomerBalance)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs tabular-nums">
                        {formatINR(fin.recordedExpenses)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs font-semibold text-slate-900 tabular-nums">
                        {formatINR(fin.projectedMargin)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getProjectStatusVariant(project.status)}>
                          {project.status} ({project.progressPercent}%)
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Workforce Payroll Register */}
        <TabsContent value="payroll">
          <Card>
            <CardHeader className="border-b border-slate-100">
              <CardTitle>Workforce Weekly Wage &amp; Attendance Register</CardTitle>
              <CardDescription>
                Centralized calculation from daily salary (role default or individual override) and shift multipliers
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Worker</TableHead>
                    <TableHead>Role &amp; Source</TableHead>
                    <TableHead className="text-right">Daily Rate (D)</TableHead>
                    <TableHead className="text-right">Regular Units</TableHead>
                    <TableHead className="text-right">Regular Wages</TableHead>
                    <TableHead className="text-right">Addl Wages</TableHead>
                    <TableHead className="text-right">Gross Wages</TableHead>
                    <TableHead className="text-right">Deductions</TableHead>
                    <TableHead className="text-right">Paid</TableHead>
                    <TableHead className="text-right">Net Payable</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {workforcePayrollRows.map((row) => (
                    <TableRow key={row.worker.id}>
                      <TableCell>
                        <div className="font-semibold text-slate-900">{row.worker.name}</div>
                        <div className="font-mono text-xs text-slate-500">
                          {row.worker.workerCode ?? row.worker.id}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-xs font-medium text-slate-800">
                          {row.worker.role}
                        </div>
                        <Badge
                          variant={
                            row.salarySource === 'individual_override' ? 'blue' : 'neutral'
                          }
                        >
                          {row.salarySource === 'individual_override'
                            ? 'Individual Override'
                            : 'Role Default'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs font-semibold tabular-nums">
                        {formatINR(row.effectiveDailySalary)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs tabular-nums">
                        {row.regularUnits} u
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs tabular-nums">
                        {formatINR(row.regularWages)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs text-[#A65229] tabular-nums">
                        {formatINR(row.additionalWages)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs font-medium tabular-nums">
                        {formatINR(row.grossWages)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs text-amber-700 tabular-nums">
                        {formatINR(row.approvedDeductions)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs text-emerald-700 tabular-nums">
                        {formatINR(row.wagesPaid)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs font-semibold text-slate-900 tabular-nums">
                        {formatINR(row.netPayable)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3: Interactive Salary Calculation Validator (Configurable Daily Wage D) */}
        <TabsContent value="wage_validator">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            <Card className="lg:col-span-6">
              <CardHeader className="border-b border-slate-100">
                <CardTitle className="flex items-center gap-2">
                  <IndianRupee className="h-4 w-4 text-[#A65229]" />
                  Configurable Daily Wage (D) Shift Multipliers
                </CardTitle>
                <CardDescription>
                  Live verification of BuildFlow centralized shift wage formulas without double-counting
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-5 space-y-4">
                <div className="max-w-xs space-y-1.5">
                  <Label htmlFor="daily-wage-d">Configurable Daily Wage D (₹)</Label>
                  <Input
                    id="daily-wage-d"
                    type="number"
                    min={100}
                    value={testDailyWage}
                    onChange={(e) => setTestDailyWage(e.target.value)}
                    className="font-mono text-base font-semibold tabular-nums"
                  />
                </div>

                <div className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-slate-50/60 px-4">
                  {[
                    [
                      'Normal 9 AM–6 PM day (1.0 × D)',
                      shiftValidationExamples.normalDay,
                      '1.0 × D',
                    ],
                    [
                      '6 AM–6 PM long day (1.5 × D)',
                      shiftValidationExamples.longDay,
                      '1.5 × D',
                    ],
                    [
                      'Half day (0.5 × D)',
                      shiftValidationExamples.halfDay,
                      '0.5 × D',
                    ],
                    [
                      'Three long days (3 × 1.5 × D = 4.5 × D)',
                      shiftValidationExamples.threeLongDays,
                      '4.5 × D',
                    ],
                    [
                      'Three normal days (3 × 1.0 × D = 3.0 × D)',
                      shiftValidationExamples.threeNormalDays,
                      '3.0 × D',
                    ],
                  ].map(([label, amount, formula]) => (
                    <div
                      key={String(label)}
                      className="flex items-center justify-between py-3 text-sm"
                    >
                      <div>
                        <p className="font-medium text-slate-900">{label}</p>
                        <p className="font-mono text-xs text-slate-500">
                          Formula: {formula} (D = {formatINR(parsedDailyWage)})
                        </p>
                      </div>
                      <span className="font-mono text-base font-semibold text-slate-900 tabular-nums">
                        {formatINR(Number(amount))}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="lg:col-span-6">
              <CardHeader className="border-b border-slate-100">
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  Composite Weekly Schedule Verification (No Double-Counting)
                </CardTitle>
                <CardDescription>
                  3 long days + 1 normal day with 0.5 additional wage unit + 3 normal days
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-5 space-y-4">
                <div className="rounded-[5px] border border-[#E7C4B3] bg-[#FBF1EC]/70 p-4 space-y-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-[#4F504B]">
                      Base Working Days (3 + 1 + 3 = 7 full working days)
                    </span>
                    <span className="font-mono font-medium text-[#252A27] tabular-nums">
                      7 × D = {formatINR(compositeScheduleValidation.regularAttendanceEarnings)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#4F504B]">
                      Additional Wage Unit (+0.5 × D without double-counting)
                    </span>
                    <span className="font-mono font-medium text-[#A65229] tabular-nums">
                      0.5 × D = {formatINR(compositeScheduleValidation.additionalWageEarnings)}
                    </span>
                  </div>
                  <div className="border-t border-[#E7C4B3] pt-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-[#252A27]">
                        Regular Attendance Earnings ({compositeScheduleValidation.regularAttendanceUnits} × D)
                      </span>
                      <span className="font-mono font-semibold text-[#252A27] tabular-nums">
                        {compositeScheduleValidation.regularAttendanceUnits} × D ={' '}
                        {formatINR(compositeScheduleValidation.regularAttendanceEarnings)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-[#252A27]">
                        Additional Wage ({compositeScheduleValidation.additionalWageUnits} × D)
                      </span>
                      <span className="font-mono font-semibold text-[#A65229] tabular-nums">
                        {compositeScheduleValidation.additionalWageUnits} × D ={' '}
                        {formatINR(compositeScheduleValidation.additionalWageEarnings)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between border-t border-[#E7C4B3] pt-2 text-base">
                      <span className="font-semibold text-slate-900">
                        Total Weekly Wage ({compositeScheduleValidation.totalUnits} × D)
                      </span>
                      <span className="font-mono font-bold text-emerald-700 tabular-nums">
                        {compositeScheduleValidation.totalUnits} × D ={' '}
                        {formatINR(compositeScheduleValidation.totalEarnings)}
                      </span>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Note: Long-shift multiplier (1.5×) already includes its 0.5× extended-hours premium inside the shift multiplier. When a normal day (1.0×) has an explicit +0.5 additional wage unit, regular earnings and additional wage units are tallied distinctly without counting the long-shift premium twice.
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab 4: Site Progress Audit */}
        <TabsContent value="progress">
          <Card>
            <CardHeader className="border-b border-slate-100">
              <CardTitle>Site Progress &amp; Review Status Audit Log</CardTitle>
              <CardDescription>
                Filterable log of daily and weekly progress reports across all construction sites
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date &amp; Week</TableHead>
                    <TableHead>Project</TableHead>
                    <TableHead>Stage</TableHead>
                    <TableHead>Summary</TableHead>
                    <TableHead>Submitted By</TableHead>
                    <TableHead>Review Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProgressReports.map((rep) => {
                    const proj = projects.find((p) => p.id === rep.projectId);
                    const status = rep.reviewStatus ?? 'Reviewed';
                    return (
                      <TableRow key={rep.id}>
                        <TableCell className="text-xs tabular-nums whitespace-nowrap">
                          <div className="font-medium text-slate-900">
                            {formatIndianDate(rep.reportDate)}
                          </div>
                          {rep.weekLabel && (
                            <div className="text-slate-500">{rep.weekLabel}</div>
                          )}
                        </TableCell>
                        <TableCell className="font-medium text-slate-900">
                          {proj?.name ?? rep.projectId}
                        </TableCell>
                        <TableCell className="text-xs text-slate-700">
                          {rep.stage}
                        </TableCell>
                        <TableCell className="text-xs text-slate-600 max-w-md">
                          {rep.summary}
                        </TableCell>
                        <TableCell className="text-xs text-slate-700">
                          {rep.submittedBy}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              status === 'Reviewed'
                                ? 'green'
                                : status === 'Needs correction'
                                ? 'red'
                                : 'amber'
                            }
                          >
                            {status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </PageContainer>
  );
}
