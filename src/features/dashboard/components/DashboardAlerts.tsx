import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  CalendarClock,
  IndianRupee,
  PackageMinus,
  ReceiptText,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/src/components/ui/card';
import { Badge } from '@/src/components/ui/badge';
import { formatINR, formatIndianDate } from '@/src/lib/utils';
import type {
  CustomerPayment,
  Expense,
  MaterialStock,
  Project,
  ProjectMilestone,
} from '@/src/types';

type AlertFilter = 'all' | 'stock' | 'overdue' | 'supplier' | 'milestones';

interface DashboardAlertsProps {
  projects: Project[];
  lowStockMaterials: MaterialStock[];
  overduePayments: CustomerPayment[];
  pendingSupplierBills: Expense[];
  delayedMilestones: ProjectMilestone[];
}

export function DashboardAlerts({
  projects,
  lowStockMaterials,
  overduePayments,
  pendingSupplierBills,
  delayedMilestones,
}: DashboardAlertsProps) {
  const [filter, setFilter] = useState<AlertFilter>('all');

  const getProjectName = (projectId: string) =>
    projects.find((p) => p.id === projectId)?.name ?? 'Project';

  const totalAlerts =
    lowStockMaterials.length +
    overduePayments.length +
    pendingSupplierBills.length +
    delayedMilestones.length;

  const filterTabs: Array<{ id: AlertFilter; label: string; count: number }> = [
    { id: 'all', label: 'All', count: totalAlerts },
    { id: 'overdue', label: 'Overdue Payments', count: overduePayments.length },
    { id: 'supplier', label: 'Supplier Bills', count: pendingSupplierBills.length },
    { id: 'stock', label: 'Low Stock', count: lowStockMaterials.length },
    { id: 'milestones', label: 'Delayed Milestones', count: delayedMilestones.length },
  ];

  const showOverdue = filter === 'all' || filter === 'overdue';
  const showSupplier = filter === 'all' || filter === 'supplier';
  const showStock = filter === 'all' || filter === 'stock';
  const showMilestones = filter === 'all' || filter === 'milestones';

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-3 border-b border-[#F1F5F9]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle>Operational Alerts</CardTitle>
            <CardDescription>
              Items requiring follow-up across cashflow, materials, and site schedules
            </CardDescription>
          </div>
          <Badge variant={totalAlerts > 0 ? 'warning' : 'success'}>
            {totalAlerts} Open
          </Badge>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-1 rounded-md bg-[#F1F5F9] p-1">
          {filterTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilter(tab.id)}
              className={`rounded px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                filter === tab.id
                  ? 'bg-white text-[#0F172A] shadow-xs'
                  : 'text-[#64748B] hover:text-[#0F172A]'
              }`}
            >
              {tab.label}{' '}
              <span className="ml-0.5 font-mono text-[11px] opacity-75 tabular-nums">
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </CardHeader>

      <CardContent className="p-0 flex-1">
        {totalAlerts === 0 ? (
          <div className="px-5 py-10 text-center text-xs text-[#64748B]">
            No active alerts for the selected project filter.
          </div>
        ) : (
          <ul className="divide-y divide-[#F1F5F9] max-h-[420px] overflow-y-auto">
            {showOverdue &&
              overduePayments.map((pay) => (
                <li
                  key={pay.id}
                  className="flex items-start justify-between gap-3 px-5 py-3.5 hover:bg-[#F8FAFC] transition-colors"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded bg-[#FEF2F2] text-[#B91C1C]">
                      <IndianRupee className="h-3.5 w-3.5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[#0F172A] truncate">
                        Overdue Payment — {pay.customerName}
                      </p>
                      <p className="mt-0.5 text-xs text-[#64748B]">
                        <Link
                          to={`/projects/${pay.projectId}`}
                          className="font-medium text-[#A65229] hover:underline"
                        >
                          {getProjectName(pay.projectId)}
                        </Link>
                        {' · '}
                        {pay.stage}
                        {' · '}
                        Due {formatIndianDate(pay.dueDate)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-mono text-sm font-semibold text-[#B91C1C] tabular-nums">
                      {formatINR(pay.amount)}
                    </p>
                    <p className="text-[11px] text-[#64748B]">{pay.invoiceNumber}</p>
                  </div>
                </li>
              ))}

            {showSupplier &&
              pendingSupplierBills.map((bill) => {
                const unpaid = Math.max(0, bill.amount - bill.paidAmount);
                return (
                  <li
                    key={bill.id}
                    className="flex items-start justify-between gap-3 px-5 py-3.5 hover:bg-[#F8FAFC] transition-colors"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded bg-[#FFFBEB] text-[#B45309]">
                        <ReceiptText className="h-3.5 w-3.5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-[#0F172A] truncate">
                          Pending Supplier Bill — {bill.vendorName}
                        </p>
                        <p className="mt-0.5 text-xs text-[#64748B]">
                          <Link
                            to={`/projects/${bill.projectId}`}
                            className="font-medium text-[#A65229] hover:underline"
                          >
                            {getProjectName(bill.projectId)}
                          </Link>
                          {' · '}
                          Bill {bill.billNumber}
                          {' · '}
                          {formatIndianDate(bill.date)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-mono text-sm font-semibold text-[#B45309] tabular-nums">
                        {formatINR(unpaid)}
                      </p>
                      <p className="text-[11px] text-[#64748B]">{bill.paymentStatus}</p>
                    </div>
                  </li>
                );
              })}

            {showStock &&
              lowStockMaterials.map((item) => (
                <li
                  key={item.id}
                  className="flex items-start justify-between gap-3 px-5 py-3.5 hover:bg-[#F8FAFC] transition-colors"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded bg-[#FFFBEB] text-[#B45309]">
                      <PackageMinus className="h-3.5 w-3.5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[#0F172A] truncate">
                        Low Stock — {item.name}
                      </p>
                      <p className="mt-0.5 text-xs text-[#64748B]">
                        <Link
                          to={`/projects/${item.projectId}`}
                          className="font-medium text-[#A65229] hover:underline"
                        >
                          {getProjectName(item.projectId)}
                        </Link>
                        {' · '}
                        Reorder level: {item.reorderLevel} {item.unit}
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-mono text-sm font-semibold text-[#B45309] tabular-nums">
                      {item.currentStock} {item.unit}
                    </p>
                    <p className="text-[11px] text-[#64748B]">Reorder needed</p>
                  </div>
                </li>
              ))}

            {showMilestones &&
              delayedMilestones.map((ms) => (
                <li
                  key={ms.id}
                  className="flex items-start justify-between gap-3 px-5 py-3.5 hover:bg-[#F8FAFC] transition-colors"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded bg-[#FEF2F2] text-[#B91C1C]">
                      <CalendarClock className="h-3.5 w-3.5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[#0F172A] truncate">
                        Delayed Milestone — {ms.title}
                      </p>
                      <p className="mt-0.5 text-xs text-[#64748B]">
                        <Link
                          to={`/projects/${ms.projectId}`}
                          className="font-medium text-[#A65229] hover:underline"
                        >
                          {getProjectName(ms.projectId)}
                        </Link>
                        {' · '}
                        Planned {formatIndianDate(ms.plannedDate)}
                        {ms.notes ? ` · ${ms.notes}` : ''}
                      </p>
                    </div>
                  </div>
                  <Badge variant="danger" className="shrink-0">
                    <AlertTriangle className="mr-1 h-3 w-3" />
                    Delayed
                  </Badge>
                </li>
              ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
