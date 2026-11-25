import { Printer } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/src/components/ui/dialog';
import { Button } from '@/src/components/ui/button';
import { formatINR, formatIndianDate } from '@/src/lib/utils';
import type { ComputedWorkerWageSummary } from '@/src/context/BuildFlowContext';
import type { WagePayment, WorkerAdvance } from '@/src/types';

interface WorkerStatementDialogProps {
  summary?: ComputedWorkerWageSummary;
  projectName: string;
  advances: WorkerAdvance[];
  payments: WagePayment[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function WorkerStatementDialog({
  summary,
  projectName,
  advances,
  payments,
  open,
  onOpenChange,
}: WorkerStatementDialogProps) {
  if (!summary) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Worker Payment Statement</DialogTitle>
          <DialogDescription>
            Attendance-derived payroll summary for {summary.worker.name}
          </DialogDescription>
        </DialogHeader>

        <div className="overflow-y-auto px-6 py-4">
          <div className="rounded-lg border border-[#CBD5E1] bg-white p-6 space-y-5 text-xs">
            <div className="flex items-start justify-between border-b border-[#E2E8F0] pb-4">
              <div>
                <h3 className="text-base font-bold text-[#252A27]">Kulkarni Homes Pvt. Ltd.</h3>
                <p className="text-[#64748B]">Site Labour Payroll & Wage Statement</p>
              </div>
              <div className="text-right">
                <p className="font-semibold text-[#0F172A]">{summary.worker.name}</p>
                <p className="text-[#64748B]">
                  {summary.worker.role} · {summary.worker.phone}
                </p>
                <p className="text-[#64748B]">Primary Site: {projectName}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 rounded-md bg-[#F8FAFC] p-4 sm:grid-cols-4">
              <div>
                <p className="text-[#64748B]">Daily Rate</p>
                <p className="mt-0.5 font-mono text-sm font-semibold text-[#0F172A] tabular-nums">
                  {formatINR(summary.worker.dailyWage)}
                </p>
              </div>
              <div>
                <p className="text-[#64748B]">Days Worked</p>
                <p className="mt-0.5 font-mono text-sm font-semibold text-[#0F172A] tabular-nums">
                  {summary.daysWorked} ({summary.presentDays}P / {summary.halfDays}H)
                </p>
              </div>
              <div>
                <p className="text-[#64748B]">Gross Wages</p>
                <p className="mt-0.5 font-mono text-sm font-semibold text-[#0F172A] tabular-nums">
                  {formatINR(summary.grossWages)}
                </p>
              </div>
              <div>
                <p className="text-[#64748B]">Net Payable</p>
                <p className="mt-0.5 font-mono text-sm font-bold text-[#A65229] tabular-nums">
                  {formatINR(summary.netPayable)}
                </p>
              </div>
            </div>

            <div className="space-y-2 border-t border-[#E2E8F0] pt-4">
              <div className="flex justify-between">
                <span className="text-[#475569]">
                  Gross Wages ({summary.daysWorked} days × {formatINR(summary.worker.dailyWage)})
                </span>
                <span className="font-mono font-medium text-[#0F172A] tabular-nums">
                  {formatINR(summary.grossWages)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#475569]">
                  Less: Approved Advances & Deductions ({advances.length})
                </span>
                <span className="font-mono font-medium text-[#B45309] tabular-nums">
                  -{formatINR(summary.approvedDeductions)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#475569]">
                  Less: Wage Disbursements Paid ({payments.length})
                </span>
                <span className="font-mono font-medium text-[#15803D] tabular-nums">
                  -{formatINR(summary.wagesPaid)}
                </span>
              </div>
              <div className="flex justify-between border-t border-[#CBD5E1] pt-2 text-sm font-bold text-[#0F172A]">
                <span>Net Balance Payable</span>
                <span className="font-mono tabular-nums">{formatINR(summary.netPayable)}</span>
              </div>
            </div>

            {advances.length > 0 && (
              <div className="border-t border-[#E2E8F0] pt-4">
                <p className="font-semibold text-[#0F172A] mb-2">Advances & Deductions</p>
                <ul className="divide-y divide-[#F1F5F9]">
                  {advances.map((adv) => (
                    <li key={adv.id} className="flex justify-between py-1.5">
                      <span className="text-[#475569]">
                        {formatIndianDate(adv.date)} — {adv.reason}
                      </span>
                      <span className="font-mono tabular-nums">{formatINR(adv.amount)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {payments.length > 0 && (
              <div className="border-t border-[#E2E8F0] pt-4">
                <p className="font-semibold text-[#0F172A] mb-2">Recorded Wage Payments</p>
                <ul className="divide-y divide-[#F1F5F9]">
                  {payments.map((pm) => (
                    <li key={pm.id} className="flex justify-between py-1.5">
                      <span className="text-[#475569]">
                        {formatIndianDate(pm.date)} · {pm.periodLabel} ({pm.mode})
                      </span>
                      <span className="font-mono text-[#15803D] tabular-nums">
                        {formatINR(pm.amount)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button onClick={() => window.print()}>
            <Printer className="h-4 w-4" />
            Print Statement
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
