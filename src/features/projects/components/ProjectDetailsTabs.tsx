import { CheckCircle2, FileText } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/src/components/ui/card';
import {
  Badge,
  getPaymentStatusVariant,
} from '@/src/components/ui/badge';
import { Button } from '@/src/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/src/components/ui/table';
import { EmptyState } from '@/src/components/ui/feedback';
import { formatArea, formatINR, formatIndianDate } from '@/src/lib/utils';
import type {
  ActivityEvent,
  CustomerPayment,
  Expense,
  MaterialDelivery,
  MaterialStock,
  Project,
  ProjectDocument,
  ProjectMilestone,
  ProjectQuotation,
  SiteProgressReport,
  Worker,
} from '@/src/types';

export function ProjectOverviewTab({
  project,
  milestones,
  activities,
}: {
  project: Project;
  milestones: ProjectMilestone[];
  activities: ActivityEvent[];
}) {
  const upcomingMilestones = milestones
    .filter((m) => m.status !== 'Completed')
    .sort((a, b) => a.stageOrder - b.stageOrder);

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
      {/* Left: Project Specs & Milestones */}
      <div className="space-y-5 lg:col-span-7">
        <Card>
          <CardHeader className="border-b border-[#F1F5F9]">
            <CardTitle>Site & Contract Specifications</CardTitle>
            <CardDescription>Primary agreement details and structural scope</CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 text-sm">
              <div>
                <dt className="text-xs text-[#64748B]">Customer</dt>
                <dd className="mt-0.5 font-medium text-[#0F172A]">
                  {project.customerName} · {project.customerPhone}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-[#64748B]">Assigned Site Manager</dt>
                <dd className="mt-0.5 font-medium text-[#0F172A]">{project.siteManager}</dd>
              </div>
              <div>
                <dt className="text-xs text-[#64748B]">Project Type & Scale</dt>
                <dd className="mt-0.5 font-medium text-[#0F172A] tabular-nums">
                  {project.projectType} · {formatArea(project.builtUpAreaSqFt)} · {project.floors} Floors
                </dd>
              </div>
              <div>
                <dt className="text-xs text-[#64748B]">Pricing Method</dt>
                <dd className="mt-0.5 font-medium text-[#0F172A]">{project.pricingMethod}</dd>
              </div>
              <div>
                <dt className="text-xs text-[#64748B]">Schedule</dt>
                <dd className="mt-0.5 font-medium text-[#0F172A] tabular-nums">
                  {formatIndianDate(project.startDate)} → {formatIndianDate(project.estimatedCompletionDate)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-[#64748B]">Site Location</dt>
                <dd className="mt-0.5 font-medium text-[#0F172A]">{project.siteAddress}</dd>
              </div>
            </dl>
            {project.notes && (
              <div className="mt-5 border-t border-[#F1F5F9] pt-4">
                <p className="text-xs font-medium text-[#64748B]">Execution Notes</p>
                <p className="mt-1 text-sm leading-relaxed text-[#334155]">{project.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="border-b border-[#F1F5F9]">
            <CardTitle>Upcoming Milestones</CardTitle>
            <CardDescription>Active and remaining construction stages</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {upcomingMilestones.length === 0 ? (
              <div className="px-5 py-8 text-center text-xs text-[#64748B]">
                All scheduled milestones have been completed.
              </div>
            ) : (
              <ul className="divide-y divide-[#F1F5F9]">
                {upcomingMilestones.map((ms) => (
                  <li
                    key={ms.id}
                    className="flex items-start justify-between gap-4 px-5 py-3.5"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[#0F172A]">
                        Stage {ms.stageOrder}. {ms.title}
                      </p>
                      <p className="mt-0.5 text-xs text-[#64748B] tabular-nums">
                        Planned: {formatIndianDate(ms.plannedDate)} · Weight: {ms.weightPercent}%
                      </p>
                      {ms.notes && (
                        <p className="mt-1 text-xs text-[#B45309]">{ms.notes}</p>
                      )}
                    </div>
                    <Badge
                      variant={
                        ms.status === 'Delayed'
                          ? 'danger'
                          : ms.status === 'In Progress'
                            ? 'info'
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
      </div>

      {/* Right: Recent Project Activity */}
      <div className="lg:col-span-5">
        <Card className="h-full">
          <CardHeader className="border-b border-[#F1F5F9]">
            <CardTitle>Recent Project Activity</CardTitle>
            <CardDescription>Chronological site logs, receipts, and cost entries</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {activities.length === 0 ? (
              <div className="px-5 py-10 text-center text-xs text-[#64748B]">
                No activity logged for this project yet.
              </div>
            ) : (
              <ul className="divide-y divide-[#F1F5F9]">
                {activities.map((act) => (
                  <li key={act.id} className="px-5 py-3.5">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="text-sm font-medium text-[#0F172A]">{act.title}</p>
                      {act.amount !== undefined && (
                        <span className="font-mono text-xs font-semibold text-[#0F172A] tabular-nums">
                          {formatINR(act.amount)}
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs leading-relaxed text-[#475569]">
                      {act.description}
                    </p>
                    <p className="mt-1 text-[11px] text-[#64748B]">
                      {formatIndianDate(act.date)} · {act.actor}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export function ProjectQuotationsTab({ quotations }: { quotations: ProjectQuotation[] }) {
  if (quotations.length === 0) {
    return (
      <EmptyState
        title="No quotations attached"
        description="Approved estimates and itemized BOQ quotations for this project will appear here."
      />
    );
  }

  return (
    <div className="space-y-5">
      {quotations.map((quo) => (
        <Card key={quo.id}>
          <CardHeader className="flex flex-row items-center justify-between gap-4 border-b border-[#F1F5F9]">
            <div>
              <CardTitle>
                {quo.quotationNumber} · {quo.version}
              </CardTitle>
              <CardDescription>
                Issued {formatIndianDate(quo.issuedDate)} · Valid until{' '}
                {formatIndianDate(quo.validUntil)}
              </CardDescription>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-mono text-base font-semibold text-[#0F172A] tabular-nums">
                {formatINR(quo.totalAmount)}
              </span>
              <Badge variant={getPaymentStatusVariant(quo.status)}>{quo.status}</Badge>
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
                    <TableCell className="font-medium text-[#0F172A]">{item.workPackage}</TableCell>
                    <TableCell className="text-xs text-[#475569]">{item.specification}</TableCell>
                    <TableCell className="text-right font-mono text-xs tabular-nums">
                      {item.quantity.toLocaleString('en-IN')} {item.unit}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs tabular-nums">
                      {formatINR(item.rate)}
                    </TableCell>
                    <TableCell className="text-right font-mono font-medium tabular-nums">
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
  );
}

export function ProjectPaymentsTab({
  payments,
  onMarkReceived,
}: {
  payments: CustomerPayment[];
  onMarkReceived: (paymentId: string) => void;
}) {
  if (payments.length === 0) {
    return (
      <EmptyState
        title="No payment tranches scheduled"
        description="Stage-wise customer invoices and payment receipts will appear here."
      />
    );
  }

  return (
    <Card>
      <CardHeader className="border-b border-[#F1F5F9]">
        <CardTitle>Customer Payment Schedule</CardTitle>
        <CardDescription>
          Milestone-linked billing tranches and bank receipts
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Invoice</TableHead>
              <TableHead>Construction Stage</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead>Paid Date & Ref</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {payments.map((pay) => (
              <TableRow key={pay.id}>
                <TableCell className="font-mono text-xs font-medium text-[#0F172A]">
                  {pay.invoiceNumber}
                </TableCell>
                <TableCell className="font-medium text-[#1E293B]">{pay.stage}</TableCell>
                <TableCell className="text-xs text-[#475569] tabular-nums">
                  {formatIndianDate(pay.dueDate)}
                </TableCell>
                <TableCell className="text-xs text-[#475569]">
                  {pay.paidDate ? (
                    <>
                      <span className="tabular-nums">{formatIndianDate(pay.paidDate)}</span>
                      <p className="font-mono text-[11px] text-[#64748B]">
                        {pay.mode} · {pay.referenceNo}
                      </p>
                    </>
                  ) : (
                    '—'
                  )}
                </TableCell>
                <TableCell className="text-right font-mono font-medium tabular-nums">
                  {formatINR(pay.amount)}
                </TableCell>
                <TableCell>
                  <Badge variant={getPaymentStatusVariant(pay.status)}>{pay.status}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  {pay.status !== 'Received' ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onMarkReceived(pay.id)}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5 text-[#15803D]" />
                      Mark Received
                    </Button>
                  ) : (
                    <span className="text-xs text-[#64748B]">Settled</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

export function ProjectExpensesTab({ expenses }: { expenses: Expense[] }) {
  if (expenses.length === 0) {
    return (
      <EmptyState
        title="No expenses recorded"
        description="Material bills, labour payroll, and subcontractor vouchers for this site will appear here."
      />
    );
  }

  return (
    <Card>
      <CardHeader className="border-b border-[#F1F5F9]">
        <CardTitle>Project Expense Ledger</CardTitle>
        <CardDescription>Recorded bills, labour disbursements, and pending payables</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date & Bill</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Vendor & Description</TableHead>
              <TableHead className="text-right">Bill Amount</TableHead>
              <TableHead className="text-right">Pending</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {expenses.map((exp) => {
              const pending = Math.max(0, exp.amount - exp.paidAmount);
              return (
                <TableRow key={exp.id}>
                  <TableCell className="whitespace-nowrap">
                    <span className="text-xs font-medium text-[#0F172A] tabular-nums">
                      {formatIndianDate(exp.date)}
                    </span>
                    <p className="font-mono text-[11px] text-[#64748B]">{exp.billNumber}</p>
                  </TableCell>
                  <TableCell className="text-xs font-medium text-[#334155]">
                    {exp.category}
                  </TableCell>
                  <TableCell>
                    <p className="font-medium text-[#0F172A]">{exp.vendorName}</p>
                    <p className="text-xs text-[#64748B]">{exp.description}</p>
                  </TableCell>
                  <TableCell className="text-right font-mono font-medium tabular-nums">
                    {formatINR(exp.amount)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs tabular-nums">
                    <span className={pending > 0 ? 'font-semibold text-[#B45309]' : 'text-[#64748B]'}>
                      {formatINR(pending)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getPaymentStatusVariant(exp.paymentStatus)}>
                      {exp.paymentStatus}
                    </Badge>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

export function ProjectMaterialsTab({
  stock,
  deliveries,
}: {
  stock: MaterialStock[];
  deliveries: MaterialDelivery[];
}) {
  return (
    <div className="space-y-5">
      <Card>
        <CardHeader className="border-b border-[#F1F5F9]">
          <CardTitle>Site Material Stock</CardTitle>
          <CardDescription>Live on-site inventory and reorder thresholds</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {stock.length === 0 ? (
            <div className="px-5 py-8 text-center text-xs text-[#64748B]">
              No materials tracked on this site yet.
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
                </TableRow>
              </TableHeader>
              <TableBody>
                {stock.map((item) => {
                  const isLow = item.currentStock <= item.reorderLevel;
                  return (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium text-[#0F172A]">{item.name}</TableCell>
                      <TableCell className="text-xs text-[#64748B]">{item.category}</TableCell>
                      <TableCell className="text-right font-mono font-medium tabular-nums">
                        {item.currentStock} {item.unit}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs text-[#64748B] tabular-nums">
                        {item.reorderLevel} {item.unit}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs tabular-nums">
                        {formatINR(item.unitPrice)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={isLow ? 'warning' : 'success'}>
                          {isLow ? 'Low Stock' : 'Adequate'}
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

      <Card>
        <CardHeader className="border-b border-[#F1F5F9]">
          <CardTitle>Pending & Scheduled Deliveries</CardTitle>
          <CardDescription>Active supplier purchase orders in transit or scheduled</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {deliveries.length === 0 ? (
            <div className="px-5 py-8 text-center text-xs text-[#64748B]">
              No pending supplier deliveries for this project.
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
                {deliveries.map((del) => (
                  <TableRow key={del.id}>
                    <TableCell className="font-medium text-[#0F172A]">{del.materialName}</TableCell>
                    <TableCell className="text-xs text-[#475569]">{del.supplierName}</TableCell>
                    <TableCell className="text-right font-mono text-xs tabular-nums">
                      {del.quantity} {del.unit}
                    </TableCell>
                    <TableCell className="text-right font-mono font-medium tabular-nums">
                      {formatINR(del.totalAmount)}
                    </TableCell>
                    <TableCell className="text-xs text-[#475569] tabular-nums">
                      {formatIndianDate(del.expectedDate)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getPaymentStatusVariant(del.status)}>{del.status}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export function ProjectWorkersTab({ workers }: { workers: Worker[] }) {
  if (workers.length === 0) {
    return (
      <EmptyState
        title="No workers assigned"
        description="Site engineers, masons, bar benders, and helpers assigned to this site will appear here."
      />
    );
  }

  return (
    <Card>
      <CardHeader className="border-b border-[#F1F5F9]">
        <CardTitle>Assigned Site Crew ({workers.length})</CardTitle>
        <CardDescription>Daily wage rates, attendance, and current month payroll status</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Worker</TableHead>
              <TableHead>Role</TableHead>
              <TableHead className="text-right">Daily Wage</TableHead>
              <TableHead className="text-right">Days (This Month)</TableHead>
              <TableHead className="text-right">Pending Wages</TableHead>
              <TableHead>Today</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {workers.map((worker) => (
              <TableRow key={worker.id}>
                <TableCell>
                  <p className="font-medium text-[#0F172A]">{worker.name}</p>
                  <p className="text-xs text-[#64748B]">{worker.phone}</p>
                </TableCell>
                <TableCell className="text-xs text-[#334155]">{worker.role}</TableCell>
                <TableCell className="text-right font-mono text-xs tabular-nums">
                  {formatINR(worker.dailyWage)}/day
                </TableCell>
                <TableCell className="text-right font-mono text-xs tabular-nums">
                  {worker.daysWorkedThisMonth} days
                </TableCell>
                <TableCell className="text-right font-mono font-medium tabular-nums">
                  {formatINR(worker.pendingWages)}
                </TableCell>
                <TableCell>
                  <Badge variant={getPaymentStatusVariant(worker.attendanceToday)}>
                    {worker.attendanceToday}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

export function ProjectProgressTab({
  reports,
  milestones,
}: {
  reports: SiteProgressReport[];
  milestones: ProjectMilestone[];
}) {
  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
      <div className="lg:col-span-7">
        <Card>
          <CardHeader className="border-b border-[#F1F5F9]">
            <CardTitle>Site Progress Reports</CardTitle>
            <CardDescription>Field inspection logs submitted by the site engineer</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {reports.length === 0 ? (
              <div className="px-5 py-10 text-center text-xs text-[#64748B]">
                No site progress reports submitted yet.
              </div>
            ) : (
              <ul className="divide-y divide-[#F1F5F9]">
                {reports.map((rep) => (
                  <li key={rep.id} className="px-5 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-[#0F172A]">{rep.stage}</p>
                        <p className="mt-0.5 text-xs text-[#64748B]">
                          {formatIndianDate(rep.reportDate)} · Submitted by {rep.submittedBy} ·{' '}
                          {rep.workersOnSite} workers · {rep.weather}
                        </p>
                      </div>
                      <Badge variant="info">+{rep.completionDeltaPercent}% progress</Badge>
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-[#334155]">{rep.summary}</p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="lg:col-span-5">
        <Card>
          <CardHeader className="border-b border-[#F1F5F9]">
            <CardTitle>Stage Milestone Schedule</CardTitle>
            <CardDescription>Planned vs actual completion dates</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <ul className="divide-y divide-[#F1F5F9]">
              {milestones.map((ms) => (
                <li key={ms.id} className="flex items-start justify-between gap-3 px-5 py-3.5">
                  <div>
                    <p className="text-sm font-medium text-[#0F172A]">
                      {ms.stageOrder}. {ms.title}
                    </p>
                    <p className="mt-0.5 text-xs text-[#64748B] tabular-nums">
                      Planned {formatIndianDate(ms.plannedDate)}
                      {ms.actualDate ? ` · Actual ${formatIndianDate(ms.actualDate)}` : ''}
                    </p>
                  </div>
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
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export function ProjectDocumentsTab({ documents }: { documents: ProjectDocument[] }) {
  if (documents.length === 0) {
    return (
      <EmptyState
        title="No project documents uploaded"
        description="Architectural drawings, structural plans, municipal approvals, and signed agreements will appear here."
      />
    );
  }

  return (
    <Card>
      <CardHeader className="border-b border-[#F1F5F9]">
        <CardTitle>Drawings, Permits & Contracts ({documents.length})</CardTitle>
        <CardDescription>Controlled project documentation repository</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Document</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Version</TableHead>
              <TableHead>Uploaded By</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Size</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {documents.map((doc) => (
              <TableRow key={doc.id}>
                <TableCell>
                  <div className="flex items-center gap-2.5">
                    <FileText className="h-4 w-4 shrink-0 text-[#64748B]" />
                    <div>
                      <p className="font-medium text-[#0F172A]">{doc.title}</p>
                      <p className="font-mono text-[11px] text-[#64748B]">{doc.fileName}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-xs text-[#334155]">{doc.category}</TableCell>
                <TableCell className="font-mono text-xs text-[#475569]">{doc.version}</TableCell>
                <TableCell className="text-xs text-[#475569]">{doc.uploadedBy}</TableCell>
                <TableCell className="text-xs text-[#475569] tabular-nums">
                  {formatIndianDate(doc.uploadedDate)}
                </TableCell>
                <TableCell className="text-right font-mono text-xs text-[#64748B] tabular-nums">
                  {doc.fileSize}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
