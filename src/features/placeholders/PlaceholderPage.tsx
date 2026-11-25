import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { PageContainer, PageHeader } from '@/src/components/layout/PageContainer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';
import { useBuildFlow } from '@/src/context/BuildFlowContext';
import { formatINR } from '@/src/lib/utils';

export interface PlaceholderModuleConfig {
  id: string;
  title: string;
  description: string;
  plannedCapabilities: string[];
}

export function PlaceholderPage({ config }: { config: PlaceholderModuleConfig }) {
  const {
    projects,
    customers,
    payments,
    expenses,
    materialStock,
    suppliers,
    workers,
    progressReports,
  } = useBuildFlow();

  const snapshotMetric = (() => {
    switch (config.id) {
      case 'customers':
        return {
          label: 'Active Homeowner Accounts',
          value: `${customers.length} customers across ${projects.length} projects`,
        };
      case 'payments': {
        const received = payments
          .filter((p) => p.status === 'Received')
          .reduce((s, p) => s + p.amount, 0);
        return {
          label: 'Total Customer Receipts Recorded',
          value: `${formatINR(received)} across ${payments.length} milestone invoices`,
        };
      }
      case 'expenses': {
        const total = expenses.reduce((s, e) => s + e.amount, 0);
        return {
          label: 'Total Site Expenses Logged',
          value: `${formatINR(total)} across ${expenses.length} vouchers`,
        };
      }
      case 'materials': {
        const lowCount = materialStock.filter((m) => m.currentStock <= m.reorderLevel).length;
        return {
          label: 'Tracked Material Items',
          value: `${materialStock.length} active SKUs (${lowCount} below reorder level)`,
        };
      }
      case 'suppliers': {
        const due = suppliers.reduce((s, sup) => s + sup.outstandingBalance, 0);
        return {
          label: 'Registered Material Suppliers',
          value: `${suppliers.length} vendors · ${formatINR(due)} pending payables`,
        };
      }
      case 'workers':
        return {
          label: 'Active Workforce Roster',
          value: `${workers.length} site engineers, masons, and tradespeople`,
        };
      case 'site-progress':
        return {
          label: 'Field Progress Logs',
          value: `${progressReports.length} inspection reports logged across active sites`,
        };
      default:
        return {
          label: 'Connected Portfolio Scope',
          value: `${projects.length} residential projects configured in BuildFlow`,
        };
    }
  })();

  return (
    <PageContainer>
      <PageHeader title={config.title} description={config.description} />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        <Card className="lg:col-span-8">
          <CardHeader className="border-b border-[#F1F5F9]">
            <CardTitle>Module Workspace Overview</CardTitle>
            <CardDescription>
              Dedicated module screen scheduled in the next build milestone. Core project-level
              records for this module are already live inside each project workspace.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-5">
            <p className="text-xs font-medium text-[#64748B]">Planned Module Workflows</p>
            <ul className="mt-3 space-y-2.5 text-sm text-[#334155]">
              {config.plannedCapabilities.map((item) => (
                <li key={item} className="flex items-start gap-2.5">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-[2px] bg-[#C66A3D]" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>

            <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-[#F1F5F9] pt-5">
              <Button asChild>
                <Link to="/projects">
                  Open Projects Workspace
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/">Return to Dashboard</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-4">
          <CardHeader className="border-b border-[#F1F5F9]">
            <CardTitle>Current Workspace Data</CardTitle>
            <CardDescription>Live summary from local project records</CardDescription>
          </CardHeader>
          <CardContent className="pt-5">
            <p className="text-xs font-medium text-[#64748B]">{snapshotMetric.label}</p>
            <p className="mt-1.5 font-mono text-base font-semibold text-[#0F172A] tabular-nums">
              {snapshotMetric.value}
            </p>
            <p className="mt-4 text-xs leading-relaxed text-[#64748B]">
              You can inspect project-specific entries right now by opening any residential project
              and switching to its corresponding tab.
            </p>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
