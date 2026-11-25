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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/src/components/ui/card';
import { formatINR } from '@/src/lib/utils';

export interface MonthlyCashflowPoint {
  month: string;
  income: number;
  expenses: number;
}

export interface ProjectBudgetPoint {
  project: string;
  fullName: string;
  budget: number;
  actualExpenses: number;
  received: number;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    color: string;
    payload?: { fullName?: string };
  }>;
  label?: string;
}

function CurrencyTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const heading = payload[0]?.payload?.fullName ?? label;

  return (
    <div className="rounded-md border border-[#E2E8F0] bg-white px-3.5 py-2.5 shadow-md text-xs">
      <p className="mb-1.5 font-semibold text-[#0F172A]">{heading}</p>
      <div className="space-y-1">
        {payload.map((entry) => (
          <div key={entry.name} className="flex items-center justify-between gap-5">
            <span className="flex items-center gap-1.5 text-[#475569]">
              <span
                className="inline-block h-2 w-2 rounded-xs"
                style={{ backgroundColor: entry.color }}
              />
              {entry.name}
            </span>
            <span className="font-mono font-medium text-[#0F172A] tabular-nums">
              {formatINR(entry.value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function DashboardCharts({
  monthlyData,
  projectBudgetData,
}: {
  monthlyData: MonthlyCashflowPoint[];
  projectBudgetData: ProjectBudgetPoint[];
}) {
  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle>Monthly Income vs Expenses</CardTitle>
          <CardDescription>
            Customer receipts against recorded project expenditure (INR)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[290px] w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={monthlyData}
                margin={{ top: 8, right: 8, left: 0, bottom: 4 }}
                barGap={4}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E6E0D5" />
                <XAxis
                  dataKey="month"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#77766F', fontSize: 12 }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#77766F', fontSize: 11 }}
                  tickFormatter={(v) => formatINR(v, { compact: true })}
                  width={68}
                />
                <Tooltip content={<CurrencyTooltip />} cursor={{ fill: '#FAF8F3' }} />
                <Legend
                  iconType="square"
                  iconSize={8}
                  wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }}
                />
                <Bar
                  dataKey="income"
                  name="Customer Income"
                  fill="#6E7A5F"
                  radius={[2, 2, 0, 0]}
                  maxBarSize={28}
                />
                <Bar
                  dataKey="expenses"
                  name="Recorded Expenses"
                  fill="#C66A3D"
                  radius={[2, 2, 0, 0]}
                  maxBarSize={28}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle>Project-wise Budget vs Actual Expenses</CardTitle>
          <CardDescription>
            Estimated direct cost budget (82% of contract) against actual spend to date
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[290px] w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={projectBudgetData}
                margin={{ top: 8, right: 8, left: 0, bottom: 4 }}
                barGap={6}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E6E0D5" />
                <XAxis
                  dataKey="project"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#77766F', fontSize: 12 }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#77766F', fontSize: 11 }}
                  tickFormatter={(v) => formatINR(v, { compact: true })}
                  width={68}
                />
                <Tooltip content={<CurrencyTooltip />} cursor={{ fill: '#FAF8F3' }} />
                <Legend
                  iconType="square"
                  iconSize={8}
                  wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }}
                />
                <Bar
                  dataKey="budget"
                  name="Target Cost Budget"
                  fill="#CFC7B8"
                  radius={[2, 2, 0, 0]}
                  maxBarSize={34}
                />
                <Bar
                  dataKey="actualExpenses"
                  name="Actual Expenses"
                  fill="#252A27"
                  radius={[2, 2, 0, 0]}
                  maxBarSize={34}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
