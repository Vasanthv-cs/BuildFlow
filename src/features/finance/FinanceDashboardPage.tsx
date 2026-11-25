import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
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
import { ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { PageContainer, PageHeader } from '@/src/components/layout/PageContainer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';
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
import { formatINR, formatIndianDate } from '@/src/lib/utils';

const MONTHS = [
  { key: '2026-06', label: 'Jun 26' },
  { key: '2026-07', label: 'Jul 26' },
  { key: '2026-08', label: 'Aug 26' },
  { key: '2026-09', label: 'Sep 26' },
  { key: '2026-10', label: 'Oct 26' },
  { key: '2026-11', label: 'Nov 26' },
];

export function FinanceDashboardPage() {
  const { projects, payments, expenses } = useBuildFlow();
  const [selectedProjectId, setSelectedProjectId] = useState('all');

  const scopedProjects = useMemo(
    () => (selectedProjectId === 'all' ? projects : projects.filter((p) => p.id === selectedProjectId)),
    [projects, selectedProjectId],
  );
  const projectIds = useMemo(() => new Set(scopedProjects.map((p) => p.id)), [scopedProjects]);

  const scopedPayments = useMemo(
    () => payments.filter((p) => projectIds.has(p.projectId)),
    [payments, projectIds],
  );
  const scopedExpenses = useMemo(
    () => expenses.filter((e) => projectIds.has(e.projectId) && e.approvalStatus !== 'Rejected'),
    [expenses, projectIds],
  );

  const summary = useMemo(() => {
    const totalContract = scopedProjects.reduce((s, p) => s + p.contractValue, 0);
    const received = scopedPayments
      .filter((p) => p.status === 'Received')
      .reduce((s, p) => s + p.amount, 0);
    const outstanding = Math.max(0, totalContract - received);
    const recordedExpenses = scopedExpenses.reduce((s, e) => s + e.amount, 0);
    const netCashflow = received - recordedExpenses;
    return { totalContract, received, outstanding, recordedExpenses, netCashflow };
  }, [scopedProjects, scopedPayments, scopedExpenses]);

  const projectWiseData = useMemo(() => {
    return scopedProjects.map((prj) => {
      const income = payments
        .filter((p) => p.projectId === prj.id && p.status === 'Received')
        .reduce((s, p) => s + p.amount, 0);
      const expense = expenses
        .filter((e) => e.projectId === prj.id && e.approvalStatus !== 'Rejected')
        .reduce((s, e) => s + e.amount, 0);
      return {
        id: prj.id,
        name: prj.name,
        shortName: prj.name.split(' ')[0],
        contractValue: prj.contractValue,
        income,
        expense,
        net: income - expense,
      };
    });
  }, [scopedProjects, payments, expenses]);

  const monthlyCashflow = useMemo(() => {
    return MONTHS.map(({ key, label }) => {
      const inflow = scopedPayments
        .filter((p) => p.status === 'Received' && (p.paidDate ?? '').startsWith(key))
        .reduce((s, p) => s + p.amount, 0);
      const outflow = scopedExpenses
        .filter((e) => e.date.startsWith(key))
        .reduce((s, e) => s + e.amount, 0);
      return { month: label, inflow, outflow, net: inflow - outflow };
    });
  }, [scopedPayments, scopedExpenses]);

  const categoryBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    for (const exp of scopedExpenses) {
      map.set(exp.category, (map.get(exp.category) ?? 0) + exp.amount);
    }
    const total = Array.from(map.values()).reduce((s, v) => s + v, 0);
    return Array.from(map.entries())
      .map(([category, amount]) => ({
        category,
        amount,
        share: total > 0 ? Math.round((amount / total) * 100) : 0,
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [scopedExpenses]);

  const recentTransactions = useMemo(() => {
    const inflows = scopedPayments
      .filter((p) => p.status === 'Received' && p.paidDate)
      .map((p) => ({
        id: `in-${p.id}`,
        date: p.paidDate!,
        direction: 'in' as const,
        party: p.customerName,
        description: p.stage,
        projectId: p.projectId,
        reference: p.receiptNumber ?? p.invoiceNumber,
        amount: p.amount,
      }));

    const outflows = scopedExpenses.map((e) => ({
      id: `out-${e.id}`,
      date: e.date,
      direction: 'out' as const,
      party: e.vendorName,
      description: `${e.category} — ${e.description}`,
      projectId: e.projectId,
      reference: e.billNumber,
      amount: e.amount,
    }));

    return [...inflows, ...outflows]
      .sort((a, b) => (a.date < b.date ? 1 : -1))
      .slice(0, 10);
  }, [scopedPayments, scopedExpenses]);

  return (
    <PageContainer>
      <PageHeader
        title="Finance Overview"
        description="Consolidated receivables, project cash flow, expense category analysis, and recent ledger entries."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
              <SelectTrigger className="w-[210px] bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Projects ({projects.length})</SelectItem>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" asChild>
              <Link to="/payments">Customer Payments</Link>
            </Button>
            <Button size="sm" asChild>
              <Link to="/expenses">Expenses Ledger</Link>
            </Button>
          </div>
        }
      />

      {/* Top Financial KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="p-5">
          <p className="text-xs font-medium text-[#64748B]">Customer Payments Received</p>
          <p className="mt-2 font-mono text-2xl font-semibold text-[#15803D] tabular-nums">
            {formatINR(summary.received)}
          </p>
          <p className="mt-1 text-xs text-[#64748B] tabular-nums">
            {summary.totalContract > 0
              ? `${Math.round((summary.received / summary.totalContract) * 100)}% of ${formatINR(summary.totalContract, { compact: true })}`
              : '—'}
          </p>
        </Card>

        <Card className="p-5">
          <p className="text-xs font-medium text-[#64748B]">Customer Outstanding Balance</p>
          <p className="mt-2 font-mono text-2xl font-semibold text-[#0F172A] tabular-nums">
            {formatINR(summary.outstanding)}
          </p>
          <p className="mt-1 text-xs text-[#64748B]">Contract balance receivable</p>
        </Card>

        <Card className="p-5">
          <p className="text-xs font-medium text-[#64748B]">Recorded Expenses</p>
          <p className="mt-2 font-mono text-2xl font-semibold text-[#0F172A] tabular-nums">
            {formatINR(summary.recordedExpenses)}
          </p>
          <p className="mt-1 text-xs text-[#64748B] tabular-nums">
            {scopedExpenses.length} recorded vouchers
          </p>
        </Card>

        <Card className="p-5">
          <p className="text-xs font-medium text-[#64748B]">Net Operating Cash Flow</p>
          <p
            className={`mt-2 font-mono text-2xl font-semibold tabular-nums ${
              summary.netCashflow >= 0 ? 'text-[#4A543E]' : 'text-[#B91C1C]'
            }`}
          >
            {formatINR(summary.netCashflow)}
          </p>
          <p className="mt-1 text-xs text-[#64748B]">Receipts minus recorded expenses</p>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="mt-6 grid grid-cols-1 gap-5 xl:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Monthly Cash Flow</CardTitle>
            <CardDescription>Customer inflows vs construction outflows by month</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[280px] w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyCashflow} margin={{ top: 8, right: 8, left: 0, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E6E0D5" />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#77766F', fontSize: 12 }} />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#77766F', fontSize: 11 }}
                    tickFormatter={(v) => formatINR(v, { compact: true })}
                    width={68}
                  />
                  <Tooltip
                    formatter={(val: unknown) => formatINR(Number(val ?? 0))}
                    contentStyle={{
                      borderRadius: '4px',
                      border: '1px solid #D8D1C5',
                      fontSize: '12px',
                    }}
                  />
                  <Legend iconType="square" iconSize={8} wrapperStyle={{ fontSize: '12px' }} />
                  <Bar dataKey="inflow" name="Receipts" fill="#6E7A5F" radius={[2, 2, 0, 0]} maxBarSize={26} />
                  <Bar dataKey="outflow" name="Expenses" fill="#252A27" radius={[2, 2, 0, 0]} maxBarSize={26} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Project-wise Income & Expenses</CardTitle>
            <CardDescription>Receipts collected vs actual site expenditure per project</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[280px] w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={projectWiseData} margin={{ top: 8, right: 8, left: 0, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E6E0D5" />
                  <XAxis dataKey="shortName" axisLine={false} tickLine={false} tick={{ fill: '#77766F', fontSize: 12 }} />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#77766F', fontSize: 11 }}
                    tickFormatter={(v) => formatINR(v, { compact: true })}
                    width={68}
                  />
                  <Tooltip
                    formatter={(val: unknown) => formatINR(Number(val ?? 0))}
                    contentStyle={{
                      borderRadius: '4px',
                      border: '1px solid #D8D1C5',
                      fontSize: '12px',
                    }}
                  />
                  <Legend iconType="square" iconSize={8} wrapperStyle={{ fontSize: '12px' }} />
                  <Bar dataKey="income" name="Income Received" fill="#6E7A5F" radius={[2, 2, 0, 0]} maxBarSize={32} />
                  <Bar dataKey="expense" name="Expenses" fill="#C66A3D" radius={[2, 2, 0, 0]} maxBarSize={32} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Category Breakdown & Project Table */}
      <div className="mt-6 grid grid-cols-1 gap-5 xl:grid-cols-12">
        <Card className="xl:col-span-5">
          <CardHeader className="border-b border-[#F1F5F9]">
            <CardTitle>Expense Category Breakdown</CardTitle>
            <CardDescription>Distribution of recorded construction costs</CardDescription>
          </CardHeader>
          <CardContent className="pt-4 space-y-3.5">
            {categoryBreakdown.map((item) => (
              <div key={item.category}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-medium text-[#1E293B]">{item.category}</span>
                  <span className="font-mono text-[#0F172A] tabular-nums">
                    {formatINR(item.amount)} ({item.share}%)
                  </span>
                </div>
                <div className="h-2 w-full rounded-[2px] bg-[#E8E2D7] overflow-hidden">
                  <div
                    className="h-full rounded-[2px] bg-[#C66A3D]"
                    style={{ width: `${item.share}%` }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="xl:col-span-7">
          <CardHeader className="border-b border-[#F1F5F9]">
            <CardTitle>Recent Financial Transactions</CardTitle>
            <CardDescription>Latest customer receipts and vendor/labour disbursements</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Party & Description</TableHead>
                  <TableHead>Ref</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentTransactions.map((tx) => (
                  <TableRow key={tx.id}>
                    <TableCell className="text-xs text-[#475569] tabular-nums whitespace-nowrap">
                      {formatIndianDate(tx.date)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {tx.direction === 'in' ? (
                          <ArrowDownLeft className="h-3.5 w-3.5 shrink-0 text-[#15803D]" />
                        ) : (
                          <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-[#64748B]" />
                        )}
                        <div className="min-w-0">
                          <p className="font-medium text-[#0F172A] truncate">{tx.party}</p>
                          <p className="text-xs text-[#64748B] truncate max-w-[260px]">
                            {tx.description}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-[#64748B]">
                      {tx.reference}
                    </TableCell>
                    <TableCell
                      className={`text-right font-mono font-semibold tabular-nums whitespace-nowrap ${
                        tx.direction === 'in' ? 'text-[#15803D]' : 'text-[#0F172A]'
                      }`}
                    >
                      {tx.direction === 'in' ? '+' : '-'}
                      {formatINR(tx.amount)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
