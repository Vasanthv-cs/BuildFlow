import { useMemo } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatINR } from '@/src/lib/utils';
import type { CustomerPayment, Expense, Project } from '@/src/types';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/src/components/ui/card';

interface FinancialChartsProps {
  projects: Project[];
  payments: CustomerPayment[];
  expenses: Expense[];
}

const MONTHS_ORDER = [
  { key: '2026-06', label: 'Jun' },
  { key: '2026-07', label: 'Jul' },
  { key: '2026-08', label: 'Aug' },
  { key: '2026-09', label: 'Sep' },
  { key: '2026-10', label: 'Oct' },
  { key: '2026-11', label: 'Nov' },
];

function formatAxisLakhs(val: number): string {
  if (val === 0) return '₹0';
  return `₹${(val / 100000).toFixed(0)}L`;
}

export function FinancialCharts({
  projects,
  payments,
  expenses,
}: FinancialChartsProps) {
  const monthlyCashflow = useMemo(() => {
    return MONTHS_ORDER.map(({ key, label }) => {
      const income = payments
        .filter(
          (p) => p.status === 'Received' && (p.paidDate ?? p.dueDate).startsWith(key)
        )
        .reduce((sum, p) => sum + p.amount, 0);

      const expense = expenses
        .filter((e) => e.date.startsWith(key))
        .reduce((sum, e) => sum + e.amount, 0);

      return {
        month: label,
        income,
        expense,
      };
    });
  }, [payments, expenses]);

  const projectBudgetData = useMemo(() => {
    return projects.map((project) => {
      const actualExpenses = expenses
        .filter((e) => e.projectId === project.id)
        .reduce((sum, e) => sum + e.amount, 0);

      const received = payments
        .filter((p) => p.projectId === project.id && p.status === 'Received')
        .reduce((sum, p) => sum + p.amount, 0);

      const shortName = project.name.split(' ').slice(0, 2).join(' ');

      return {
        name: shortName,
        fullName: project.name,
        contractValue: project.contractValue,
        actualExpenses,
        received,
      };
    });
  }, [projects, expenses, payments]);

  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
      {/* Monthly Cash Inflow vs Expenses */}
      <Card className="xl:col-span-7">
        <CardHeader className="flex flex-row items-start justify-between gap-4 pb-2">
          <div>
            <p className="arch-label mb-1">Cash Flow Ledger</p>
            <CardTitle>Monthly Cash Inflow vs. Expenses</CardTitle>
            <CardDescription>
              Customer receipts against recorded site &amp; material expenditure (Jun – Nov 2026)
            </CardDescription>
          </div>
          <span className="font-mono text-[11px] text-[#77766F] tabular-nums shrink-0">
            INR (Lakhs)
          </span>
        </CardHeader>
        <CardContent className="pt-2">
          <div className="h-[285px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={monthlyCashflow}
                margin={{ top: 10, right: 12, left: 0, bottom: 4 }}
                barGap={6}
              >
                <CartesianGrid
                  strokeDasharray="2 3"
                  vertical={false}
                  stroke="#E6E0D5"
                />
                <XAxis
                  dataKey="month"
                  axisLine={{ stroke: '#D8D1C5' }}
                  tickLine={false}
                  tick={{ fill: '#77766F', fontSize: 12 }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={formatAxisLakhs}
                  tick={{ fill: '#77766F', fontSize: 11, fontFamily: 'JetBrains Mono' }}
                  width={50}
                />
                <Tooltip
                  cursor={{ fill: '#F4F0E8' }}
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null;
                    return (
                      <div className="rounded-[4px] border border-[#D8D1C5] bg-[#FFFFFF] px-3.5 py-2.5 shadow-sm text-xs">
                        <p className="font-mono text-[11px] uppercase tracking-[0.06em] text-[#77766F] mb-1.5">
                          {label} 2026
                        </p>
                        <div className="space-y-1">
                          {payload.map((entry) => (
                            <div
                              key={entry.name}
                              className="flex items-center justify-between gap-5"
                            >
                              <span className="flex items-center gap-1.5 text-[#57564F]">
                                <span
                                  className="h-2 w-2 rounded-[1px] shrink-0"
                                  style={{ backgroundColor: entry.color }}
                                />
                                {entry.name}
                              </span>
                              <span className="font-mono font-medium text-[#252A27] tabular-nums">
                                {formatINR(Number(entry.value ?? 0))}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  }}
                />
                <Legend
                  verticalAlign="top"
                  align="right"
                  iconType="square"
                  iconSize={8}
                  wrapperStyle={{ fontSize: '12px', paddingBottom: '12px', color: '#57564F' }}
                />
                <Bar
                  dataKey="income"
                  name="Payments Received"
                  fill="#6E7A5F"
                  radius={[2, 2, 0, 0]}
                  maxBarSize={30}
                />
                <Bar
                  dataKey="expense"
                  name="Recorded Expenses"
                  fill="#C66A3D"
                  radius={[2, 2, 0, 0]}
                  maxBarSize={30}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Project-wise Budget vs Actual Expenses */}
      <Card className="xl:col-span-5">
        <CardHeader className="flex flex-row items-start justify-between gap-4 pb-2">
          <div>
            <p className="arch-label mb-1">Cost Comparison</p>
            <CardTitle>Contract Value vs. Actual Spend</CardTitle>
            <CardDescription>
              Registered contract value alongside cumulative site expenses
            </CardDescription>
          </div>
          <span className="font-mono text-[11px] text-[#77766F] tabular-nums shrink-0">
            INR (Lakhs)
          </span>
        </CardHeader>
        <CardContent className="pt-2">
          <div className="h-[285px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={projectBudgetData}
                margin={{ top: 10, right: 12, left: 0, bottom: 4 }}
                barGap={6}
              >
                <CartesianGrid
                  strokeDasharray="2 3"
                  vertical={false}
                  stroke="#E6E0D5"
                />
                <XAxis
                  dataKey="name"
                  axisLine={{ stroke: '#D8D1C5' }}
                  tickLine={false}
                  tick={{ fill: '#77766F', fontSize: 11.5 }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={formatAxisLakhs}
                  tick={{ fill: '#77766F', fontSize: 11, fontFamily: 'JetBrains Mono' }}
                  width={50}
                />
                <Tooltip
                  cursor={{ fill: '#F4F0E8' }}
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const row = payload[0]?.payload as {
                      fullName: string;
                      contractValue: number;
                      actualExpenses: number;
                      received: number;
                    };
                    const spendPct =
                      row.contractValue > 0
                        ? Math.round((row.actualExpenses / row.contractValue) * 100)
                        : 0;
                    return (
                      <div className="rounded-[4px] border border-[#D8D1C5] bg-[#FFFFFF] px-3.5 py-2.5 shadow-sm text-xs">
                        <p className="font-semibold text-[#252A27] mb-1.5">
                          {row.fullName}
                        </p>
                        <div className="space-y-1">
                          <div className="flex items-center justify-between gap-5">
                            <span className="text-[#77766F]">Contract Value</span>
                            <span className="font-mono font-medium text-[#252A27] tabular-nums">
                              {formatINR(row.contractValue)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-5">
                            <span className="text-[#77766F]">Actual Expenses</span>
                            <span className="font-mono font-medium text-[#A65229] tabular-nums">
                              {formatINR(row.actualExpenses)} ({spendPct}%)
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-5">
                            <span className="text-[#77766F]">Customer Received</span>
                            <span className="font-mono font-medium text-[#4A543E] tabular-nums">
                              {formatINR(row.received)}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  }}
                />
                <Legend
                  verticalAlign="top"
                  align="right"
                  iconType="square"
                  iconSize={8}
                  wrapperStyle={{ fontSize: '12px', paddingBottom: '12px', color: '#57564F' }}
                />
                <Bar
                  dataKey="contractValue"
                  name="Contract Budget"
                  fill="#252A27"
                  radius={[2, 2, 0, 0]}
                  maxBarSize={28}
                />
                <Bar
                  dataKey="actualExpenses"
                  name="Actual Expenses"
                  fill="#C66A3D"
                  radius={[2, 2, 0, 0]}
                  maxBarSize={28}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
