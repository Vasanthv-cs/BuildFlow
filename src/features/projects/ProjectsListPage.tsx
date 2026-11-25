import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowUpRight,
  Building2,
  Edit3,
  Eye,
  LayoutGrid,
  List,
  MapPin,
  MoreHorizontal,
  Plus,
  RotateCcw,
  Search,
} from 'lucide-react';
import { useBuildFlow } from '@/src/context/BuildFlowContext';
import { useAuth } from '@/src/context/AuthContext';
import { getProjectCoverImage } from '@/src/data/projectVisuals';
import {
  formatArea,
  formatIndianDate,
  formatINR,
} from '@/src/lib/utils';
import type { Project, ProjectStatus } from '@/src/types';
import { PageContainer } from '@/src/components/layout/PageContainer';
import {
  Badge,
  getProjectStatusVariant,
} from '@/src/components/ui/badge';
import { Button } from '@/src/components/ui/button';
import {
  Card,
  CardContent,
  CardFooter,
} from '@/src/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/src/components/ui/dropdown-menu';
import { EmptyState, ProgressBar } from '@/src/components/ui/feedback';
import { Input } from '@/src/components/ui/input';
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
import { ProjectFormDialog } from './components/ProjectFormDialog';

type ViewMode = 'table' | 'cards';
type StartDateFilter = 'all' | 'q2_2026' | 'q3_2026' | 'q4_2026_plus';

export function ProjectsListPage() {
  const { projects, payments, expenses, activities, createProject, updateProject } =
    useBuildFlow();
  const { assignProjectToSupervisor } = useAuth();
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | ProjectStatus>('all');
  const [customerFilter, setCustomerFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<StartDateFilter>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('cards');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);

  const uniqueCustomers = useMemo(() => {
    const set = new Set(projects.map((p) => p.customerName));
    return Array.from(set).sort();
  }, [projects]);

  const filteredProjects = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return projects.filter((project) => {
      if (statusFilter !== 'all' && project.status !== statusFilter) {
        return false;
      }
      if (
        customerFilter !== 'all' &&
        project.customerName !== customerFilter
      ) {
        return false;
      }
      if (dateFilter !== 'all') {
        const start = project.startDate;
        if (dateFilter === 'q2_2026' && !(start >= '2026-04-01' && start <= '2026-06-30')) {
          return false;
        }
        if (dateFilter === 'q3_2026' && !(start >= '2026-07-01' && start <= '2026-09-30')) {
          return false;
        }
        if (dateFilter === 'q4_2026_plus' && !(start >= '2026-10-01')) {
          return false;
        }
      }
      if (q) {
        const haystack = [
          project.name,
          project.code,
          project.customerName,
          project.siteAddress,
          project.city,
          project.siteManager,
          project.projectType,
        ]
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [projects, searchQuery, statusFilter, customerFilter, dateFilter]);

  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    statusFilter !== 'all' ||
    customerFilter !== 'all' ||
    dateFilter !== 'all';

  const resetFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setCustomerFilter('all');
    setDateFilter('all');
  };

  const getProjectFinancials = (project: Project) => {
    const received = payments
      .filter((p) => p.projectId === project.id && p.status === 'Received')
      .reduce((sum, p) => sum + p.amount, 0);
    const spent = expenses
      .filter((e) => e.projectId === project.id)
      .reduce((sum, e) => sum + e.amount, 0);
    const latestActivity = activities
      .filter((a) => a.projectId === project.id)
      .sort((a, b) => b.date.localeCompare(a.date))[0];
    return {
      received,
      balance: Math.max(0, project.contractValue - received),
      spent,
      latestActivity,
    };
  };

  const openCreateDialog = () => {
    setEditingProject(null);
    setDialogOpen(true);
  };

  const openEditDialog = (project: Project) => {
    setEditingProject(project);
    setDialogOpen(true);
  };

  const summary = useMemo(() => {
    const totalContract = filteredProjects.reduce(
      (sum, p) => sum + p.contractValue,
      0
    );
    const totalArea = filteredProjects.reduce(
      (sum, p) => sum + p.builtUpAreaSqFt,
      0
    );
    const avgProgress =
      filteredProjects.length > 0
        ? Math.round(
            filteredProjects.reduce((sum, p) => sum + p.progressPercent, 0) /
              filteredProjects.length
          )
        : 0;
    return { totalContract, totalArea, avgProgress };
  }, [filteredProjects]);

  return (
    <PageContainer
      kicker="Project Portfolio Register"
      title="Projects"
      description="Architectural construction records, site progress documentation, built-up specifications, and contract receivables."
      actions={
        <Button onClick={openCreateDialog}>
          <Plus className="h-4 w-4" />
          <span>Create Project</span>
        </Button>
      }
    >
      {/* Structured Architectural Summary Strip */}
      <div className="mb-6 grid grid-cols-2 divide-y divide-[#E6E0D5] rounded-[6px] border border-[#D8D1C5] bg-[#FFFFFF] sm:divide-y-0 lg:grid-cols-4 lg:divide-x">
        <div className="px-5 py-4">
          <p className="arch-label">Active Dossiers</p>
          <p className="mt-1.5 font-mono text-2xl font-semibold text-[#252A27] tabular-nums">
            {filteredProjects.length}{' '}
            <span className="text-xs font-normal text-[#77766F]">
              / {projects.length} registered
            </span>
          </p>
        </div>
        <div className="px-5 py-4 border-l border-[#E6E0D5] lg:border-l-0">
          <p className="arch-label">Portfolio Value</p>
          <p className="mt-1.5 font-mono text-2xl font-semibold text-[#252A27] tabular-nums">
            {formatINR(summary.totalContract, { compact: true })}
          </p>
        </div>
        <div className="px-5 py-4">
          <p className="arch-label">Total Built-Up Area</p>
          <p className="mt-1.5 font-mono text-2xl font-semibold text-[#252A27] tabular-nums">
            {formatArea(summary.totalArea)}
          </p>
        </div>
        <div className="px-5 py-4 border-l border-[#E6E0D5] lg:border-l-0">
          <p className="arch-label">Mean Completion</p>
          <p className="mt-1.5 font-mono text-2xl font-semibold text-[#A65229] tabular-nums">
            {summary.avgProgress}%
          </p>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <Card className="mb-6 p-4 bg-[#FAF8F3]">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#77766F]" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search project, code, address..."
                className="pl-9"
                aria-label="Search projects"
              />
            </div>

            <Select
              value={statusFilter}
              onValueChange={(v) => setStatusFilter(v as 'all' | ProjectStatus)}
            >
              <SelectTrigger aria-label="Filter by project status">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="Planning">Planning</SelectItem>
                <SelectItem value="In Progress">In Progress</SelectItem>
                <SelectItem value="On Hold">On Hold</SelectItem>
                <SelectItem value="Completed">Completed</SelectItem>
              </SelectContent>
            </Select>

            <Select value={customerFilter} onValueChange={setCustomerFilter}>
              <SelectTrigger aria-label="Filter by customer">
                <SelectValue placeholder="All Customers" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Customers</SelectItem>
                {uniqueCustomers.map((customer) => (
                  <SelectItem key={customer} value={customer}>
                    {customer}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={dateFilter}
              onValueChange={(v) => setDateFilter(v as StartDateFilter)}
            >
              <SelectTrigger aria-label="Filter by start date">
                <SelectValue placeholder="All Start Dates" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Start Dates</SelectItem>
                <SelectItem value="q2_2026">Started Apr – Jun 2026</SelectItem>
                <SelectItem value="q3_2026">Started Jul – Sep 2026</SelectItem>
                <SelectItem value="q4_2026_plus">Started Oct 2026 onwards</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between gap-2.5 lg:justify-end shrink-0">
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={resetFilters}>
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Reset</span>
              </Button>
            )}

            <div
              role="group"
              aria-label="Project list layout"
              className="inline-flex items-center rounded-[4px] border border-[#D8D1C5] bg-[#EAE4D9] p-0.5"
            >
              <button
                type="button"
                onClick={() => setViewMode('cards')}
                aria-pressed={viewMode === 'cards'}
                className={`inline-flex items-center gap-1.5 rounded-[3px] px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer ${
                  viewMode === 'cards'
                    ? 'bg-[#FFFFFF] text-[#252A27] shadow-2xs'
                    : 'text-[#57564F] hover:text-[#252A27]'
                }`}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                <span>Records</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                aria-pressed={viewMode === 'table'}
                className={`inline-flex items-center gap-1.5 rounded-[3px] px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer ${
                  viewMode === 'table'
                    ? 'bg-[#FFFFFF] text-[#252A27] shadow-2xs'
                    : 'text-[#57564F] hover:text-[#252A27]'
                }`}
              >
                <List className="h-3.5 w-3.5" />
                <span>Ledger</span>
              </button>
            </div>
          </div>
        </div>
      </Card>

      {/* Main Content */}
      {filteredProjects.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="No matching projects found"
          description="Try clearing one of the active filters or create a new residential construction project."
          actionLabel={hasActiveFilters ? 'Reset Filters' : 'Create Project'}
          onAction={hasActiveFilters ? resetFilters : openCreateDialog}
        />
      ) : viewMode === 'table' ? (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Project &amp; Site</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Specs</TableHead>
                <TableHead className="text-right">Contract Value</TableHead>
                <TableHead className="text-right">Received</TableHead>
                <TableHead className="w-[155px]">Progress</TableHead>
                <TableHead>Schedule</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProjects.map((project) => {
                const fin = getProjectFinancials(project);
                return (
                  <TableRow key={project.id}>
                    <TableCell>
                      <Link
                        to={`/projects/${project.id}`}
                        className="font-semibold text-[#252A27] hover:text-[#A65229] transition-colors"
                      >
                        {project.name}
                      </Link>
                      <div className="mt-0.5 text-xs text-[#77766F]">
                        <span className="font-mono">{project.code}</span> · {project.city} · {project.siteManager}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-[#252A27]">
                        {project.customerName}
                      </div>
                      <div className="font-mono text-xs text-[#77766F] tabular-nums">
                        {project.customerPhone}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-[#252A27]">{project.projectType}</div>
                      <div className="font-mono text-xs text-[#77766F] tabular-nums">
                        {formatArea(project.builtUpAreaSqFt)} · {project.floors}F
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-mono font-medium text-[#252A27] tabular-nums">
                      {formatINR(project.contractValue)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="font-mono font-medium text-[#4A543E] tabular-nums">
                        {formatINR(fin.received)}
                      </div>
                      <div className="font-mono text-[11px] text-[#77766F] tabular-nums">
                        Rem: {formatINR(fin.balance, { compact: true })}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <ProgressBar
                          value={project.progressPercent}
                          className="flex-1"
                        />
                        <span className="w-8 text-right font-mono text-xs text-[#252A27] tabular-nums">
                          {project.progressPercent}%
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-[#57564F] tabular-nums whitespace-nowrap">
                      <div>Start: {formatIndianDate(project.startDate)}</div>
                      <div className="text-[#77766F]">
                        Est: {formatIndianDate(project.estimatedCompletionDate)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getProjectStatusVariant(project.status)}>
                        {project.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`Actions for ${project.name}`}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onSelect={() => navigate(`/projects/${project.id}`)}
                          >
                            <Eye className="h-3.5 w-3.5 text-[#77766F]" />
                            <span>Open Project Record</span>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onSelect={() => openEditDialog(project)}
                          >
                            <Edit3 className="h-3.5 w-3.5 text-[#77766F]" />
                            <span>Edit Project</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {filteredProjects.map((project, idx) => {
            const fin = getProjectFinancials(project);
            const cover = getProjectCoverImage(project.id, idx);
            return (
              <Card
                key={project.id}
                className="group flex flex-col overflow-hidden transition-colors hover:border-[#B6AEA0]"
              >
                {/* Architectural Progress Photograph */}
                <Link
                  to={`/projects/${project.id}`}
                  className="relative block aspect-[16/10] w-full overflow-hidden border-b border-[#D8D1C5] bg-[#EAE4D9]"
                >
                  <img
                    src={cover.src}
                    alt={cover.alt}
                    referrerPolicy="no-referrer"
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                  />
                </Link>

                {/* Architectural Technical Header */}
                <div className="px-5 pt-4 pb-3 border-b border-[#E6E0D5]">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-[#77766F]">
                      {project.code} · {project.projectType}
                    </span>
                    <Badge variant={getProjectStatusVariant(project.status)}>
                      {project.status}
                    </Badge>
                  </div>

                  <Link
                    to={`/projects/${project.id}`}
                    className="mt-1.5 flex items-center justify-between gap-2 text-[17px] font-semibold tracking-[-0.02em] text-[#252A27] hover:text-[#A65229] transition-colors"
                  >
                    <span className="truncate">{project.name}</span>
                    <ArrowUpRight className="h-4 w-4 shrink-0 text-[#77766F] group-hover:text-[#A65229]" />
                  </Link>

                  <p className="mt-1 flex items-center gap-1.5 text-xs text-[#77766F]">
                    <MapPin className="h-3.5 w-3.5 shrink-0 text-[#9A978E]" />
                    <span className="truncate">{project.siteAddress}</span>
                  </p>
                </div>

                {/* Spec & Progress Body */}
                <CardContent className="flex-1 pt-4 space-y-4">
                  {/* Horizontal Completion Gauge */}
                  <div>
                    <div className="mb-1.5 flex items-baseline justify-between">
                      <span className="arch-label">Completion</span>
                      <span className="font-mono text-sm font-semibold text-[#252A27] tabular-nums">
                        {project.progressPercent}%
                      </span>
                    </div>
                    <ProgressBar
                      value={project.progressPercent}
                      className="h-2"
                      barClassName={
                        project.progressPercent >= 90 ? 'bg-[#6E7A5F]' : 'bg-[#C66A3D]'
                      }
                    />
                    <div className="mt-1.5 flex items-center justify-between font-mono text-[11px] text-[#77766F] tabular-nums">
                      <span>{formatArea(project.builtUpAreaSqFt)} · {project.floors} Floors</span>
                      <span>Mgr: {project.siteManager}</span>
                    </div>
                  </div>

                  {/* 3-column Financial Ledger */}
                  <div className="grid grid-cols-3 divide-x divide-[#E6E0D5] rounded-[4px] border border-[#E6E0D5] bg-[#FAF8F3] py-2.5 text-xs">
                    <div className="px-2.5">
                      <p className="font-mono text-[10px] uppercase tracking-[0.06em] text-[#77766F]">
                        Contract
                      </p>
                      <p className="mt-0.5 font-mono font-semibold text-[#252A27] tabular-nums">
                        {formatINR(project.contractValue, { compact: true })}
                      </p>
                    </div>
                    <div className="px-2.5">
                      <p className="font-mono text-[10px] uppercase tracking-[0.06em] text-[#77766F]">
                        Received
                      </p>
                      <p className="mt-0.5 font-mono font-semibold text-[#4A543E] tabular-nums">
                        {formatINR(fin.received, { compact: true })}
                      </p>
                    </div>
                    <div className="px-2.5">
                      <p className="font-mono text-[10px] uppercase tracking-[0.06em] text-[#77766F]">
                        Remaining
                      </p>
                      <p className="mt-0.5 font-mono font-semibold text-[#A65229] tabular-nums">
                        {formatINR(fin.balance, { compact: true })}
                      </p>
                    </div>
                  </div>

                  {/* Latest Activity Strip */}
                  <div className="text-xs text-[#57564F]">
                    <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-[#77766F]">
                      Latest Activity
                    </p>
                    <p className="mt-0.5 truncate font-medium text-[#252A27]">
                      {fin.latestActivity
                        ? fin.latestActivity.title
                        : `Target handover ${formatIndianDate(project.estimatedCompletionDate)}`}
                    </p>
                    <p className="mt-0.5 font-mono text-[11px] text-[#77766F] tabular-nums">
                      {fin.latestActivity
                        ? `${formatIndianDate(fin.latestActivity.date)} · ${fin.latestActivity.actor}`
                        : `Client: ${project.customerName}`}
                    </p>
                  </div>
                </CardContent>

                <CardFooter className="justify-between gap-2">
                  <span className="font-mono text-[11px] text-[#77766F] tabular-nums">
                    Target {formatIndianDate(project.estimatedCompletionDate)}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditDialog(project)}
                    >
                      Edit
                    </Button>
                    <Button size="sm" variant="navy" asChild>
                      <Link to={`/projects/${project.id}`}>Open Record</Link>
                    </Button>
                  </div>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}

      <ProjectFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        initialProject={editingProject}
        onSubmit={(values) => {
          if (editingProject) {
            updateProject(editingProject.id, values);
            assignProjectToSupervisor(editingProject.id, values.siteManager);
          } else {
            const created = createProject(values);
            assignProjectToSupervisor(created.id, values.siteManager);
            navigate(`/projects/${created.id}`);
          }
        }}
      />
    </PageContainer>
  );
}
