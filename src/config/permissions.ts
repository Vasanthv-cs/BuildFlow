import type { LucideIcon } from 'lucide-react';
import {
  BarChart3,
  Building2,
  CalendarCheck2,
  Camera,
  ClipboardCheck,
  ClipboardList,
  CreditCard,
  FileSpreadsheet,
  FileText,
  HardHat,
  Home,
  IndianRupee,
  LayoutDashboard,
  MapPin,
  Package,
  Receipt,
  Settings,
  SlidersHorizontal,
  Truck,
  Users,
  Wallet,
} from 'lucide-react';
import type { AppRole, AuthUser } from '@/src/types';

/**
 * CENTRALIZED FRONTEND PERMISSION & NAVIGATION CONFIGURATION
 *
 * NOTE: Frontend role guards govern UI visibility and route navigation for
 * demo/prototype usability. Production security must enforce identical RBAC
 * checks on the backend Express API and PostgreSQL queries.
 */

export interface RoleNavItem {
  label: string;
  to: string;
  icon: LucideIcon;
  end?: boolean;
}

export interface RoleNavGroup {
  label: string;
  items: RoleNavItem[];
}

export const ROLE_LABELS: Record<AppRole, string> = {
  owner: 'Owner / Admin',
  supervisor: 'Supervisor',
  worker: 'Worker',
  client: 'Client',
};

export const ROLE_DESCRIPTIONS: Record<AppRole, string> = {
  owner:
    'Full access across projects, clients, workforce, wage configuration, payroll, expenses, materials, suppliers, and reports.',
  supervisor:
    'Access to assigned construction sites, daily attendance, weekly reports, site photos, bills, and work progress. Cannot edit wage rates, worker salaries, client credentials, or approved payroll.',
  worker:
    'Self-service access to own worker profile, daily attendance, salary rate, assigned work sites, payment history, and wage statements.',
  client:
    'Homeowner portal scoped strictly to their assigned residential project, milestones, weekly progress reports, site photos, payments, and documents.',
};

export const ROLE_DEFAULT_HOME: Record<AppRole, string> = {
  owner: '/',
  supervisor: '/supervisor',
  worker: '/worker',
  client: '/client',
};

export const ROLE_NAV_GROUPS: Record<AppRole, RoleNavGroup[]> = {
  owner: [
    {
      label: 'Core',
      items: [
        { label: 'Dashboard', to: '/', icon: LayoutDashboard, end: true },
        { label: 'Projects', to: '/projects', icon: Building2 },
        { label: 'Clients', to: '/clients', icon: Users },
      ],
    },
    {
      label: 'Workforce & Payroll',
      items: [
        { label: 'Workforce', to: '/workforce', icon: HardHat },
        { label: 'Wage Config', to: '/wage-config', icon: SlidersHorizontal },
        { label: 'Attendance', to: '/attendance', icon: CalendarCheck2 },
        { label: 'Weekly Wages', to: '/weekly-wages', icon: Wallet },
      ],
    },
    {
      label: 'Finance & Site Ops',
      items: [
        { label: 'Expenses', to: '/expenses', icon: Receipt },
        { label: 'Materials', to: '/materials', icon: Package },
        { label: 'Suppliers', to: '/suppliers', icon: Truck },
        { label: 'Quotations', to: '/quotations', icon: FileSpreadsheet },
        { label: 'Payments', to: '/payments', icon: CreditCard },
      ],
    },
    {
      label: 'Business',
      items: [
        { label: 'Reports', to: '/reports', icon: BarChart3 },
        { label: 'Document Centre', to: '/documents', icon: FileText },
        { label: 'Settings', to: '/settings', icon: Settings },
      ],
    },
  ],

  supervisor: [
    {
      label: 'Site Management',
      items: [
        { label: 'Supervisor Dashboard', to: '/supervisor', icon: LayoutDashboard, end: true },
        { label: 'Assigned Sites', to: '/supervisor/sites', icon: Building2 },
        { label: 'Daily Attendance', to: '/attendance', icon: CalendarCheck2 },
      ],
    },
    {
      label: 'Field Reporting',
      items: [
        { label: 'Weekly Reports', to: '/supervisor/weekly-reports', icon: ClipboardList },
        { label: 'Document Centre', to: '/documents', icon: FileText },
        { label: 'Site Photos', to: '/supervisor/photos', icon: Camera },
        { label: 'Bills and Receipts', to: '/supervisor/bills', icon: Receipt },
        { label: 'Work Progress', to: '/supervisor/progress', icon: ClipboardCheck },
      ],
    },
  ],

  worker: [
    {
      label: 'My Workspace',
      items: [
        { label: 'Worker Dashboard', to: '/worker', icon: LayoutDashboard, end: true },
        { label: 'My Attendance', to: '/worker/attendance', icon: CalendarCheck2 },
        { label: 'My Salary', to: '/worker/salary', icon: IndianRupee },
      ],
    },
    {
      label: 'Sites & Statements',
      items: [
        { label: 'My Work Sites', to: '/worker/sites', icon: MapPin },
        { label: 'My Payment History', to: '/worker/payments', icon: CreditCard },
        { label: 'My Wage Statements', to: '/worker/statements', icon: FileText },
      ],
    },
  ],

  client: [
    {
      label: 'Homeowner Portal',
      items: [
        { label: 'Client Dashboard', to: '/client', icon: LayoutDashboard, end: true },
        { label: 'My Project', to: '/client/project', icon: Home },
        { label: 'Work Progress', to: '/client/progress', icon: ClipboardCheck },
      ],
    },
    {
      label: 'Updates & Billing',
      items: [
        { label: 'Weekly Reports', to: '/client/weekly-reports', icon: ClipboardList },
        { label: 'Photos', to: '/client/photos', icon: Camera },
        { label: 'Payments and Dues', to: '/client/payments', icon: CreditCard },
        { label: 'Bills and Documents', to: '/client/documents', icon: FileText },
      ],
    },
  ],
};

export interface RolePermissions {
  canCreateProject: boolean;
  canEditProject: boolean;
  canManageWorkforce: boolean;
  canEditWageRates: boolean;
  canEditShiftRules: boolean;
  canViewAllWorkerSalaries: boolean;
  canApprovePayroll: boolean;
  canSubmitAttendance: boolean;
  canVerifyAttendance: boolean;
  canEditClientCredentials: boolean;
  canApproveExpenses: boolean;
}

export const PERMISSIONS_BY_ROLE: Record<AppRole, RolePermissions> = {
  owner: {
    canCreateProject: true,
    canEditProject: true,
    canManageWorkforce: true,
    canEditWageRates: true,
    canEditShiftRules: true,
    canViewAllWorkerSalaries: true,
    canApprovePayroll: true,
    canSubmitAttendance: true,
    canVerifyAttendance: true,
    canEditClientCredentials: true,
    canApproveExpenses: true,
  },
  supervisor: {
    canCreateProject: false,
    canEditProject: false,
    canManageWorkforce: false,
    canEditWageRates: false,
    canEditShiftRules: false,
    canViewAllWorkerSalaries: false,
    canApprovePayroll: false,
    canSubmitAttendance: true,
    canVerifyAttendance: false,
    canEditClientCredentials: false,
    canApproveExpenses: false,
  },
  worker: {
    canCreateProject: false,
    canEditProject: false,
    canManageWorkforce: false,
    canEditWageRates: false,
    canEditShiftRules: false,
    canViewAllWorkerSalaries: false,
    canApprovePayroll: false,
    canSubmitAttendance: false,
    canVerifyAttendance: false,
    canEditClientCredentials: false,
    canApproveExpenses: false,
  },
  client: {
    canCreateProject: false,
    canEditProject: false,
    canManageWorkforce: false,
    canEditWageRates: false,
    canEditShiftRules: false,
    canViewAllWorkerSalaries: false,
    canApprovePayroll: false,
    canSubmitAttendance: false,
    canVerifyAttendance: false,
    canEditClientCredentials: false,
    canApproveExpenses: false,
  },
};

export function getRolePermissions(role: AppRole): RolePermissions {
  return PERMISSIONS_BY_ROLE[role];
}

export interface RoutePolicy {
  pattern: RegExp;
  allowedRoles: AppRole[];
  title: string;
}

/**
 * Centralized route access table. First matching policy determines access.
 */
export const ROUTE_POLICIES: RoutePolicy[] = [
  // Owner-only workspace & finance/admin routes
  { pattern: /^\/$/, allowedRoles: ['owner'], title: 'Dashboard' },
  { pattern: /^\/projects$/, allowedRoles: ['owner'], title: 'Projects' },
  { pattern: /^\/projects\/[^/]+$/, allowedRoles: ['owner', 'supervisor'], title: 'Project Details' },
  { pattern: /^\/(clients|customers)$/, allowedRoles: ['owner'], title: 'Clients' },
  { pattern: /^\/(workforce|workers)$/, allowedRoles: ['owner'], title: 'Workforce' },
  { pattern: /^\/wage-config$/, allowedRoles: ['owner'], title: 'Wage Configuration' },
  { pattern: /^\/weekly-wages$/, allowedRoles: ['owner'], title: 'Weekly Wages' },
  { pattern: /^\/finance$/, allowedRoles: ['owner'], title: 'Finance Overview' },
  { pattern: /^\/payments$/, allowedRoles: ['owner'], title: 'Customer Payments' },
  { pattern: /^\/expenses$/, allowedRoles: ['owner'], title: 'Expenses' },
  { pattern: /^\/materials$/, allowedRoles: ['owner'], title: 'Materials' },
  { pattern: /^\/suppliers$/, allowedRoles: ['owner'], title: 'Suppliers' },
  { pattern: /^\/quotations$/, allowedRoles: ['owner'], title: 'Quotations' },
  { pattern: /^\/site-progress$/, allowedRoles: ['owner'], title: 'Site Progress' },
  { pattern: /^\/reports$/, allowedRoles: ['owner'], title: 'Reports' },
  { pattern: /^\/documents$/, allowedRoles: ['owner', 'supervisor'], title: 'Document Centre' },
  { pattern: /^\/settings$/, allowedRoles: ['owner'], title: 'Settings' },

  // Shared Owner + Supervisor operational attendance route
  { pattern: /^\/attendance$/, allowedRoles: ['owner', 'supervisor'], title: 'Daily Attendance' },

  // Supervisor portal routes
  { pattern: /^\/supervisor$/, allowedRoles: ['supervisor', 'owner'], title: 'Supervisor Dashboard' },
  { pattern: /^\/supervisor\/sites$/, allowedRoles: ['supervisor', 'owner'], title: 'Assigned Sites' },
  { pattern: /^\/supervisor\/weekly-reports$/, allowedRoles: ['supervisor', 'owner'], title: 'Weekly Reports' },
  { pattern: /^\/supervisor\/photos$/, allowedRoles: ['supervisor', 'owner'], title: 'Site Photos' },
  { pattern: /^\/supervisor\/bills$/, allowedRoles: ['supervisor', 'owner'], title: 'Bills and Receipts' },
  { pattern: /^\/supervisor\/progress$/, allowedRoles: ['supervisor', 'owner'], title: 'Work Progress' },

  // Worker portal routes
  { pattern: /^\/worker$/, allowedRoles: ['worker'], title: 'Worker Dashboard' },
  { pattern: /^\/worker\/attendance$/, allowedRoles: ['worker'], title: 'My Attendance' },
  { pattern: /^\/worker\/salary$/, allowedRoles: ['worker'], title: 'My Salary' },
  { pattern: /^\/worker\/sites$/, allowedRoles: ['worker'], title: 'My Work Sites' },
  { pattern: /^\/worker\/payments$/, allowedRoles: ['worker'], title: 'My Payment History' },
  { pattern: /^\/worker\/statements$/, allowedRoles: ['worker'], title: 'My Wage Statements' },

  // Client portal routes
  { pattern: /^\/client$/, allowedRoles: ['client'], title: 'Client Dashboard' },
  { pattern: /^\/client\/project$/, allowedRoles: ['client'], title: 'My Project' },
  { pattern: /^\/client\/progress$/, allowedRoles: ['client'], title: 'Work Progress' },
  { pattern: /^\/client\/weekly-reports$/, allowedRoles: ['client'], title: 'Weekly Reports' },
  { pattern: /^\/client\/photos$/, allowedRoles: ['client'], title: 'Photos' },
  { pattern: /^\/client\/payments$/, allowedRoles: ['client'], title: 'Payments and Dues' },
  { pattern: /^\/client\/documents$/, allowedRoles: ['client'], title: 'Bills and Documents' },
];

export function canUserAccessPath(user: AuthUser | null, pathname: string): boolean {
  if (!user) return false;
  const matched = ROUTE_POLICIES.find((p) => p.pattern.test(pathname));
  if (!matched) return user.role === 'owner';
  return matched.allowedRoles.includes(user.role);
}

export function canUserAccessProject(user: AuthUser | null, projectId: string): boolean {
  if (!user) return false;
  if (user.role === 'owner') return true;
  return user.assignedProjectIds.includes(projectId);
}

export function getRouteTitle(pathname: string): string {
  const matched = ROUTE_POLICIES.find((p) => p.pattern.test(pathname));
  return matched?.title ?? 'Workspace';
}
