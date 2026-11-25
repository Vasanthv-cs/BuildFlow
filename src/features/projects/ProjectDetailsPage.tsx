import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Pencil } from 'lucide-react';
import { PageContainer } from '@/src/components/layout/PageContainer';
import { Button } from '@/src/components/ui/button';
import { Card } from '@/src/components/ui/card';
import { Badge, getProjectStatusVariant } from '@/src/components/ui/badge';
import { ProgressBar } from '@/src/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/src/components/ui/tabs';
import { EmptyState } from '@/src/components/ui/feedback';
import { useBuildFlow } from '@/src/context/BuildFlowContext';
import { formatArea, formatINR, formatIndianDate } from '@/src/lib/utils';
import { ProjectFormDialog } from './components/ProjectFormDialog';
import {
  ProjectDocumentsTab,
  ProjectExpensesTab,
  ProjectMaterialsTab,
  ProjectOverviewTab,
  ProjectPaymentsTab,
  ProjectProgressTab,
  ProjectQuotationsTab,
  ProjectWorkersTab,
} from './components/ProjectDetailsTabs';

export function ProjectDetailsPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const {
    getProjectById,
    getProjectFinancials,
    updateProject,
    markPaymentReceived,
    payments,
    expenses,
    materialStock,
    deliveries,
    workers,
    milestones,
    quotations,
    progressReports,
    documents,
    activities,
  } = useBuildFlow();

  const [editOpen, setEditOpen] = useState(false);

  const project = projectId ? getProjectById(projectId) : undefined;

  if (!project) {
    return (
      <PageContainer>
        <EmptyState
          title="Project not found"
          description="The requested construction project could not be located in your workspace."
          actionLabel="Back to Projects"
          onAction={() => window.history.back()}
        />
      </PageContainer>
    );
  }

  const fin = getProjectFinancials(project.id);
  const projectPayments = payments.filter((p) => p.projectId === project.id);
  const projectExpenses = expenses.filter((e) => e.projectId === project.id);
  const projectStock = materialStock.filter((m) => m.projectId === project.id);
  const projectDeliveries = deliveries.filter((d) => d.projectId === project.id);
  const projectWorkers = workers.filter((w) => w.assignedProjectId === project.id);
  const projectMilestones = milestones
    .filter((m) => m.projectId === project.id)
    .sort((a, b) => a.stageOrder - b.stageOrder);
  const projectQuotations = quotations.filter((q) => q.projectId === project.id);
  const projectReports = progressReports
    .filter((r) => r.projectId === project.id)
    .sort((a, b) => (a.reportDate < b.reportDate ? 1 : -1));
  const projectDocuments = documents.filter((d) => d.projectId === project.id);
  const projectActivities = activities
    .filter((a) => a.projectId === project.id)
    .sort((a, b) => (a.date < b.date ? 1 : -1));

  return (
    <PageContainer>
      {/* Top Return & Header */}
      <div className="mb-5">
        <Link
          to="/projects"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-[#64748B] hover:text-[#0F172A] transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Projects
        </Link>

        <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-xl font-semibold tracking-tight text-[#0F172A] sm:text-2xl">
                {project.name}
              </h1>
              <Badge variant={getProjectStatusVariant(project.status)}>
                {project.status}
              </Badge>
            </div>
            <p className="mt-1 text-sm text-[#64748B]">
              {project.code} · {project.customerName} · {project.projectType} ·{' '}
              {formatArea(project.builtUpAreaSqFt)} ({project.floors} Floors) · Manager:{' '}
              {project.siteManager}
            </p>
            <p className="mt-0.5 text-xs text-[#64748B] tabular-nums">
              {project.siteAddress} · {formatIndianDate(project.startDate)} →{' '}
              {formatIndianDate(project.estimatedCompletionDate)}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
              <Pencil className="h-3.5 w-3.5" />
              Edit Project
            </Button>
          </div>
        </div>
      </div>

      {/* Six Project KPI Cards */}
      <section
        aria-label="Project financial and progress summary"
        className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6"
      >
        <Card className="p-4">
          <p className="text-xs font-medium text-[#64748B]">Contract Value</p>
          <p className="mt-1.5 font-mono text-lg font-semibold text-[#0F172A] tabular-nums">
            {formatINR(fin.contractValue)}
          </p>
          <p className="mt-1 text-[11px] text-[#64748B]">{project.pricingMethod}</p>
        </Card>

        <Card className="p-4">
          <p className="text-xs font-medium text-[#64748B]">Amount Received</p>
          <p className="mt-1.5 font-mono text-lg font-semibold text-[#15803D] tabular-nums">
            {formatINR(fin.amountReceived)}
          </p>
          <p className="mt-1 text-[11px] text-[#64748B] tabular-nums">
            {fin.contractValue > 0
              ? `${Math.round((fin.amountReceived / fin.contractValue) * 100)}% collected`
              : '0% collected'}
          </p>
        </Card>

        <Card className="p-4">
          <p className="text-xs font-medium text-[#64748B]">Outstanding Balance</p>
          <p className="mt-1.5 font-mono text-lg font-semibold text-[#0F172A] tabular-nums">
            {formatINR(fin.outstandingCustomerBalance)}
          </p>
          <p className="mt-1 text-[11px] text-[#B91C1C] tabular-nums">
            {fin.overdueAmount > 0 ? `${formatINR(fin.overdueAmount)} overdue` : 'No overdue invoices'}
          </p>
        </Card>

        <Card className="p-4">
          <p className="text-xs font-medium text-[#64748B]">Recorded Expenses</p>
          <p className="mt-1.5 font-mono text-lg font-semibold text-[#0F172A] tabular-nums">
            {formatINR(fin.recordedExpenses)}
          </p>
          <p className="mt-1 text-[11px] text-[#B45309] tabular-nums">
            {fin.pendingSupplierBills > 0
              ? `${formatINR(fin.pendingSupplierBills)} supplier due`
              : 'All bills settled'}
          </p>
        </Card>

        <Card className="p-4">
          <p className="text-xs font-medium text-[#64748B]">Est. Remaining Cost</p>
          <p className="mt-1.5 font-mono text-lg font-semibold text-[#0F172A] tabular-nums">
            {formatINR(fin.estimatedRemainingCost)}
          </p>
          <p className="mt-1 text-[11px] text-[#64748B] tabular-nums">
            Est. margin {formatINR(fin.projectedMargin, { compact: true })}
          </p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-[#64748B]">Project Progress</p>
            <span className="font-mono text-sm font-semibold text-[#A65229] tabular-nums">
              {project.progressPercent}%
            </span>
          </div>
          <div className="mt-3">
            <ProgressBar value={project.progressPercent} />
          </div>
          <p className="mt-2 text-[11px] text-[#64748B] tabular-nums">
            {projectMilestones.filter((m) => m.status === 'Completed').length} of{' '}
            {projectMilestones.length} stages done
          </p>
        </Card>
      </section>

      {/* 8-Tab Workspace */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="quotations">
            Quotations ({projectQuotations.length})
          </TabsTrigger>
          <TabsTrigger value="payments">
            Payments ({projectPayments.length})
          </TabsTrigger>
          <TabsTrigger value="expenses">
            Expenses ({projectExpenses.length})
          </TabsTrigger>
          <TabsTrigger value="materials">
            Materials ({projectStock.length})
          </TabsTrigger>
          <TabsTrigger value="workers">
            Workers ({projectWorkers.length})
          </TabsTrigger>
          <TabsTrigger value="progress">
            Progress ({projectReports.length})
          </TabsTrigger>
          <TabsTrigger value="documents">
            Documents ({projectDocuments.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <ProjectOverviewTab
            project={project}
            milestones={projectMilestones}
            activities={projectActivities}
          />
        </TabsContent>

        <TabsContent value="quotations">
          <ProjectQuotationsTab quotations={projectQuotations} />
        </TabsContent>

        <TabsContent value="payments">
          <ProjectPaymentsTab
            payments={projectPayments}
            onMarkReceived={markPaymentReceived}
          />
        </TabsContent>

        <TabsContent value="expenses">
          <ProjectExpensesTab expenses={projectExpenses} />
        </TabsContent>

        <TabsContent value="materials">
          <ProjectMaterialsTab stock={projectStock} deliveries={projectDeliveries} />
        </TabsContent>

        <TabsContent value="workers">
          <ProjectWorkersTab workers={projectWorkers} />
        </TabsContent>

        <TabsContent value="progress">
          <ProjectProgressTab reports={projectReports} milestones={projectMilestones} />
        </TabsContent>

        <TabsContent value="documents">
          <ProjectDocumentsTab documents={projectDocuments} />
        </TabsContent>
      </Tabs>

      <ProjectFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        mode="edit"
        initialProject={project}
        onSubmit={(values) => updateProject(project.id, values)}
      />
    </PageContainer>
  );
}
