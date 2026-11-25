import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/src/context/AuthContext';
import { BuildFlowProvider } from '@/src/context/BuildFlowContext';
import { ROLE_DEFAULT_HOME } from '@/src/config/permissions';
import { AppLayout } from '@/src/components/layout/AppLayout';
import { DemoLoginPage } from '@/src/features/auth/DemoLoginPage';
import { RoleRouteGuard } from '@/src/features/auth/RoleRouteGuard';
import { DashboardPage } from '@/src/features/dashboard/DashboardPage';
import { ProjectsListPage } from '@/src/features/projects/ProjectsListPage';
import { ProjectDetailPage } from '@/src/features/projects/ProjectDetailPage';
import { FinanceDashboardPage } from '@/src/features/finance/FinanceDashboardPage';
import { PaymentsPage } from '@/src/features/finance/PaymentsPage';
import { ExpensesPage } from '@/src/features/finance/ExpensesPage';
import { MaterialsPage } from '@/src/features/materials/MaterialsPage';
import { SuppliersPage } from '@/src/features/suppliers/SuppliersPage';
import { SiteProgressPage } from '@/src/features/progress/SiteProgressPage';
import { QuotationsPage } from '@/src/features/quotations/QuotationsPage';
import { WorkersPage } from '@/src/features/workers/WorkersPage';
import { WorkforcePage } from '@/src/features/workforce/WorkforcePage';
import { WageConfigPage } from '@/src/features/workforce/WageConfigPage';
import { DailyAttendancePage } from '@/src/features/workforce/DailyAttendancePage';
import {
  SupervisorAssignedSitesPage,
  SupervisorBillsPage,
  SupervisorDashboardPage,
  SupervisorSitePhotosPage,
  SupervisorWeeklyReportsPage,
  SupervisorWorkProgressPage,
} from '@/src/features/portals/SupervisorPages';
import {
  WorkerAttendancePage,
  WorkerDashboardPage,
  WorkerPaymentHistoryPage,
  WorkerSalaryPage,
  WorkerSitesPage,
  WorkerStatementsPage,
} from '@/src/features/portals/WorkerPages';
import {
  ClientDashboardPage,
  ClientDocumentsPage,
  ClientPaymentsPage,
  ClientPhotosPage,
  ClientProjectPage,
  ClientWeeklyReportsPage,
  ClientWorkProgressPage,
} from '@/src/features/portals/ClientPages';
import { ClientsManagementPage } from '@/src/features/clients/ClientsManagementPage';
import { ReportsPage } from '@/src/features/reports/ReportsPage';
import { ModulePlaceholderPage } from '@/src/features/placeholders/ModulePlaceholderPage';

function FallbackHomeRedirect() {
  const { currentUser } = useAuth();
  if (!currentUser) return <Navigate to="/login" replace />;
  return <Navigate to={ROLE_DEFAULT_HOME[currentUser.role]} replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <BuildFlowProvider>
        <BrowserRouter>
          <Routes>
            {/* Public Demo Login / Role Switcher Route */}
            <Route path="/login" element={<DemoLoginPage />} />

            {/* Authenticated Role-Aware Application Shell */}
            <Route element={<AppLayout />}>
              {/* Owner / Admin Core & Stage 7 Routes (Preserved!) */}
              <Route
                path="/"
                element={
                  <RoleRouteGuard allowedRoles={['owner']}>
                    <DashboardPage />
                  </RoleRouteGuard>
                }
              />
              <Route
                path="/projects"
                element={
                  <RoleRouteGuard allowedRoles={['owner']}>
                    <ProjectsListPage />
                  </RoleRouteGuard>
                }
              />
              <Route
                path="/projects/:projectId"
                element={
                  <RoleRouteGuard
                    allowedRoles={['owner', 'supervisor']}
                    enforceProjectParam
                  >
                    <ProjectDetailPage />
                  </RoleRouteGuard>
                }
              />

              {/* Stage 9 Workforce Master, Wage Config, Daily Attendance & Weekly Wages */}
              <Route
                path="/workforce"
                element={
                  <RoleRouteGuard allowedRoles={['owner']}>
                    <WorkforcePage />
                  </RoleRouteGuard>
                }
              />
              <Route
                path="/workers"
                element={
                  <RoleRouteGuard allowedRoles={['owner']}>
                    <WorkforcePage />
                  </RoleRouteGuard>
                }
              />
              <Route
                path="/wage-config"
                element={
                  <RoleRouteGuard allowedRoles={['owner']}>
                    <WageConfigPage />
                  </RoleRouteGuard>
                }
              />
              <Route
                path="/attendance"
                element={
                  <RoleRouteGuard allowedRoles={['owner', 'supervisor']}>
                    <DailyAttendancePage />
                  </RoleRouteGuard>
                }
              />
              <Route
                path="/weekly-wages"
                element={
                  <RoleRouteGuard allowedRoles={['owner']}>
                    <WorkersPage />
                  </RoleRouteGuard>
                }
              />

              {/* Existing Stage 7 Operational & Financial Modules */}
              <Route
                path="/finance"
                element={
                  <RoleRouteGuard allowedRoles={['owner']}>
                    <FinanceDashboardPage />
                  </RoleRouteGuard>
                }
              />
              <Route
                path="/payments"
                element={
                  <RoleRouteGuard allowedRoles={['owner']}>
                    <PaymentsPage />
                  </RoleRouteGuard>
                }
              />
              <Route
                path="/expenses"
                element={
                  <RoleRouteGuard allowedRoles={['owner']}>
                    <ExpensesPage />
                  </RoleRouteGuard>
                }
              />
              <Route
                path="/materials"
                element={
                  <RoleRouteGuard allowedRoles={['owner']}>
                    <MaterialsPage />
                  </RoleRouteGuard>
                }
              />
              <Route
                path="/suppliers"
                element={
                  <RoleRouteGuard allowedRoles={['owner']}>
                    <SuppliersPage />
                  </RoleRouteGuard>
                }
              />
              <Route
                path="/quotations"
                element={
                  <RoleRouteGuard allowedRoles={['owner']}>
                    <QuotationsPage />
                  </RoleRouteGuard>
                }
              />
              <Route
                path="/site-progress"
                element={
                  <RoleRouteGuard allowedRoles={['owner']}>
                    <SiteProgressPage />
                  </RoleRouteGuard>
                }
              />

              {/* Owner Clients, Reports & Settings */}
              <Route
                path="/clients"
                element={
                  <RoleRouteGuard allowedRoles={['owner']}>
                    <ClientsManagementPage />
                  </RoleRouteGuard>
                }
              />
              <Route
                path="/customers"
                element={
                  <RoleRouteGuard allowedRoles={['owner']}>
                    <ClientsManagementPage />
                  </RoleRouteGuard>
                }
              />
              <Route
                path="/reports"
                element={
                  <RoleRouteGuard allowedRoles={['owner']}>
                    <ReportsPage />
                  </RoleRouteGuard>
                }
              />
              <Route
                path="/settings"
                element={
                  <RoleRouteGuard allowedRoles={['owner']}>
                    <ModulePlaceholderPage
                      moduleKey="settings"
                      title="Business Settings"
                      description="Configure company profile, team roles, numbering prefixes, and backend API endpoints."
                      plannedCapabilities={[
                        'Construction firm branding, GSTIN, and bank transfer details',
                        'Role-based access controls for Owner, Supervisor, Worker, and Client accounts',
                        'Node.js Express & PostgreSQL backend connection configuration',
                      ]}
                    />
                  </RoleRouteGuard>
                }
              />

              {/* Supervisor Portal Routes */}
              <Route
                path="/supervisor"
                element={
                  <RoleRouteGuard allowedRoles={['supervisor', 'owner']}>
                    <SupervisorDashboardPage />
                  </RoleRouteGuard>
                }
              />
              <Route
                path="/supervisor/sites"
                element={
                  <RoleRouteGuard allowedRoles={['supervisor', 'owner']}>
                    <SupervisorAssignedSitesPage />
                  </RoleRouteGuard>
                }
              />
              <Route
                path="/supervisor/weekly-reports"
                element={
                  <RoleRouteGuard allowedRoles={['supervisor', 'owner']}>
                    <SupervisorWeeklyReportsPage />
                  </RoleRouteGuard>
                }
              />
              <Route
                path="/supervisor/photos"
                element={
                  <RoleRouteGuard allowedRoles={['supervisor', 'owner']}>
                    <SupervisorSitePhotosPage />
                  </RoleRouteGuard>
                }
              />
              <Route
                path="/supervisor/bills"
                element={
                  <RoleRouteGuard allowedRoles={['supervisor', 'owner']}>
                    <SupervisorBillsPage />
                  </RoleRouteGuard>
                }
              />
              <Route
                path="/supervisor/progress"
                element={
                  <RoleRouteGuard allowedRoles={['supervisor', 'owner']}>
                    <SupervisorWorkProgressPage />
                  </RoleRouteGuard>
                }
              />

              {/* Worker Portal Routes */}
              <Route
                path="/worker"
                element={
                  <RoleRouteGuard allowedRoles={['worker']}>
                    <WorkerDashboardPage />
                  </RoleRouteGuard>
                }
              />
              <Route
                path="/worker/attendance"
                element={
                  <RoleRouteGuard allowedRoles={['worker']}>
                    <WorkerAttendancePage />
                  </RoleRouteGuard>
                }
              />
              <Route
                path="/worker/salary"
                element={
                  <RoleRouteGuard allowedRoles={['worker']}>
                    <WorkerSalaryPage />
                  </RoleRouteGuard>
                }
              />
              <Route
                path="/worker/sites"
                element={
                  <RoleRouteGuard allowedRoles={['worker']}>
                    <WorkerSitesPage />
                  </RoleRouteGuard>
                }
              />
              <Route
                path="/worker/payments"
                element={
                  <RoleRouteGuard allowedRoles={['worker']}>
                    <WorkerPaymentHistoryPage />
                  </RoleRouteGuard>
                }
              />
              <Route
                path="/worker/statements"
                element={
                  <RoleRouteGuard allowedRoles={['worker']}>
                    <WorkerStatementsPage />
                  </RoleRouteGuard>
                }
              />

              {/* Client Portal Routes */}
              <Route
                path="/client"
                element={
                  <RoleRouteGuard allowedRoles={['client']}>
                    <ClientDashboardPage />
                  </RoleRouteGuard>
                }
              />
              <Route
                path="/client/project"
                element={
                  <RoleRouteGuard allowedRoles={['client']}>
                    <ClientProjectPage />
                  </RoleRouteGuard>
                }
              />
              <Route
                path="/client/progress"
                element={
                  <RoleRouteGuard allowedRoles={['client']}>
                    <ClientWorkProgressPage />
                  </RoleRouteGuard>
                }
              />
              <Route
                path="/client/weekly-reports"
                element={
                  <RoleRouteGuard allowedRoles={['client']}>
                    <ClientWeeklyReportsPage />
                  </RoleRouteGuard>
                }
              />
              <Route
                path="/client/photos"
                element={
                  <RoleRouteGuard allowedRoles={['client']}>
                    <ClientPhotosPage />
                  </RoleRouteGuard>
                }
              />
              <Route
                path="/client/payments"
                element={
                  <RoleRouteGuard allowedRoles={['client']}>
                    <ClientPaymentsPage />
                  </RoleRouteGuard>
                }
              />
              <Route
                path="/client/documents"
                element={
                  <RoleRouteGuard allowedRoles={['client']}>
                    <ClientDocumentsPage />
                  </RoleRouteGuard>
                }
              />

              <Route path="*" element={<FallbackHomeRedirect />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </BuildFlowProvider>
    </AuthProvider>
  );
}
