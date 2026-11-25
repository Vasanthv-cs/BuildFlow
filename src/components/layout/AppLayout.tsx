import { useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '@/src/context/AuthContext';
import { useBuildFlow } from '@/src/context/BuildFlowContext';
import { ProjectFormDialog } from '@/src/features/projects/components/ProjectFormDialog';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';

export function AppLayout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [newProjectOpen, setNewProjectOpen] = useState(false);
  const { createProject } = useBuildFlow();
  const { permissions } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#F4F0E8] text-[#252A27]">
      <Sidebar
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      <div className="flex min-h-screen flex-col lg:pl-[248px]">
        <TopBar
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
          onOpenNewProject={() => setNewProjectOpen(true)}
        />
        <main className="flex-1">
          <Outlet />
        </main>
      </div>

      {permissions.canCreateProject && (
        <ProjectFormDialog
          open={newProjectOpen}
          onOpenChange={setNewProjectOpen}
          onSubmit={(values) => {
            const created = createProject(values);
            navigate(`/projects/${created.id}`);
          }}
        />
      )}
    </div>
  );
}
