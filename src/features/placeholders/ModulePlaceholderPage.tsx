import { Link } from 'react-router-dom';
import { ArrowRight, Layers } from 'lucide-react';
import { useBuildFlow } from '@/src/context/BuildFlowContext';
import { PageContainer } from '@/src/components/layout/PageContainer';
import { Button } from '@/src/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/src/components/ui/card';

interface ModulePlaceholderProps {
  moduleKey:
    | 'customers'
    | 'payments'
    | 'expenses'
    | 'materials'
    | 'suppliers'
    | 'workers'
    | 'site-progress'
    | 'reports'
    | 'settings';
  title: string;
  description: string;
  plannedCapabilities: string[];
}

export function ModulePlaceholderPage({
  moduleKey,
  title,
  description,
  plannedCapabilities,
}: ModulePlaceholderProps) {
  const {
    customers,
    payments,
    expenses,
    materials,
    suppliers,
    workers,
    progressReports,
    projects,
  } = useBuildFlow();

  const liveCountSummary: Record<ModulePlaceholderProps['moduleKey'], string> = {
    customers: `${customers.length} active residential clients linked across ${projects.length} projects`,
    payments: `${payments.length} stage invoices currently tracked inside Dashboard and Project Details`,
    expenses: `${expenses.length} recorded site and supplier vouchers available inside Project ledgers`,
    materials: `${materials.length} on-site material SKUs monitored with reorder thresholds`,
    suppliers: `${suppliers.length} verified building material vendors with GST records`,
    workers: `${workers.length} site engineers, masons, and trade workers on the muster roll`,
    'site-progress': `${progressReports.length} field progress updates logged across active sites`,
    reports: `Cross-project profitability, GST summary, and cashflow statements ready for export`,
    settings: `Company profile, invoice prefixes, GST configuration, and Express API settings`,
  };

  return (
    <PageContainer title={title} description={description}>
      <Card className="max-w-3xl">
        <CardHeader>
          <div className="flex h-10 w-10 items-center justify-center rounded-[5px] border border-[#D8D1C5] bg-[#FAF8F3] text-[#C66A3D] mb-2">
            <Layers className="h-5 w-5" />
          </div>
          <CardTitle>{title} Module</CardTitle>
          <CardDescription>{liveCountSummary[moduleKey]}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div>
            <p className="text-xs font-semibold text-slate-700 mb-2.5">
              Scheduled module scope
            </p>
            <ul className="space-y-2 text-sm text-slate-600">
              {plannedCapabilities.map((item) => (
                <li key={item} className="flex items-start gap-2.5">
                  <span className="mt-2 h-1.5 w-1.5 rounded-full bg-slate-400 shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 pt-4">
            <Button asChild size="sm">
              <Link to="/projects">
                <span>View Inside Projects</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link to="/">Return to Dashboard</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </PageContainer>
  );
}
