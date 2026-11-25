import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Check,
  ChevronDown,
  ChevronRight,
  LogOut,
  Menu,
  Plus,
  Repeat,
} from 'lucide-react';
import { useAuth } from '@/src/context/AuthContext';
import { useBuildFlow } from '@/src/context/BuildFlowContext';
import {
  getRouteTitle,
  ROLE_DEFAULT_HOME,
  ROLE_LABELS,
} from '@/src/config/permissions';
import { BuildFlowLogo } from '@/src/components/brand/BuildFlowLogo';
import { Button } from '@/src/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/src/components/ui/dropdown-menu';

interface TopBarProps {
  onOpenMobileMenu: () => void;
  onOpenNewProject: () => void;
}

export function TopBar({ onOpenMobileMenu, onOpenNewProject }: TopBarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { projects } = useBuildFlow();
  const { currentUser, demoUsers, permissions, loginAsDemoUser, logout } = useAuth();

  const segments = location.pathname.split('/').filter(Boolean);
  const isProjectDetail = segments[0] === 'projects' && segments.length === 2;
  const activeProject = isProjectDetail
    ? projects.find((p) => p.id === segments[1])
    : undefined;

  const currentLabel = isProjectDetail
    ? activeProject?.name ?? 'Project Details'
    : getRouteTitle(location.pathname);

  const homePath = currentUser ? ROLE_DEFAULT_HOME[currentUser.role] : '/';

  const handleSwitchDemo = (userId: string) => {
    const nextUser = loginAsDemoUser(userId);
    if (nextUser) {
      navigate(ROLE_DEFAULT_HOME[nextUser.role]);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="no-print sticky top-0 z-20 flex h-16 items-center justify-between gap-4 border-b border-[#D8D1C5] bg-[#FAF8F3]/95 px-4 backdrop-blur-xs sm:px-6 lg:px-8">
      {/* Left: Mobile menu button + compact brand mark + Contextual Breadcrumbs */}
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          aria-label="Open navigation menu"
          className="inline-flex h-9 w-9 items-center justify-center rounded-[4px] border border-[#D8D1C5] bg-[#FFFFFF] text-[#252A27] hover:bg-[#EFEAE0] lg:hidden cursor-pointer shrink-0"
        >
          <Menu className="h-4 w-4" />
        </button>

        <Link to={homePath} className="lg:hidden shrink-0" aria-label="BuildFlow home">
          <BuildFlowLogo theme="light" compact />
        </Link>

        <nav
          aria-label="Breadcrumb"
          className="flex min-w-0 items-center gap-1.5 text-sm"
        >
          <Link
            to={homePath}
            className="hidden sm:inline font-mono text-[11px] uppercase tracking-[0.08em] text-[#77766F] hover:text-[#252A27] transition-colors whitespace-nowrap shrink-0"
          >
            BuildFlow
          </Link>

          {isProjectDetail ? (
            <>
              <ChevronRight className="hidden sm:inline h-3.5 w-3.5 text-[#A7A094] shrink-0" />
              <Link
                to={currentUser?.role === 'supervisor' ? '/supervisor/sites' : '/projects'}
                className="text-xs font-medium text-[#77766F] hover:text-[#252A27] transition-colors whitespace-nowrap shrink-0"
              >
                {currentUser?.role === 'supervisor' ? 'Assigned Sites' : 'Projects'}
              </Link>
              <ChevronRight className="h-3.5 w-3.5 text-[#A7A094] shrink-0" />
              <span className="truncate font-semibold text-[#252A27]">
                {currentLabel}
              </span>
              {activeProject && (
                <span className="hidden md:inline-block ml-1.5 font-mono text-[11px] text-[#77766F]">
                  {activeProject.code}
                </span>
              )}
            </>
          ) : (
            <>
              <ChevronRight className="hidden sm:inline h-3.5 w-3.5 text-[#A7A094] shrink-0" />
              <span className="truncate font-semibold text-[#252A27]">
                {currentLabel}
              </span>
            </>
          )}
        </nav>
      </div>

      {/* Right: Primary action (Owner only) + Profile / Role Switcher Menu */}
      <div className="flex items-center gap-2.5 shrink-0">
        {permissions.canCreateProject && (
          <Button size="sm" onClick={onOpenNewProject} className="hidden sm:inline-flex">
            <Plus className="h-4 w-4" />
            <span>New Project</span>
          </Button>
        )}

        {currentUser && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label="Open user profile and role menu"
                className="inline-flex h-9 items-center gap-2 rounded-[4px] border border-[#D8D1C5] bg-[#FFFFFF] px-2.5 text-left transition-colors hover:bg-[#EFEAE0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C66A3D]/35 cursor-pointer shrink-0"
              >
                <span className="flex h-6 w-6 items-center justify-center rounded-[3px] bg-[#252A27] font-mono text-[10.5px] font-semibold text-[#F4F0E8] shrink-0">
                  {currentUser.initials}
                </span>
                <span className="hidden md:flex flex-col leading-tight">
                  <span className="text-xs font-semibold text-[#252A27] whitespace-nowrap">
                    {currentUser.fullName}
                  </span>
                  <span className="font-mono text-[10px] uppercase tracking-[0.05em] text-[#77766F] whitespace-nowrap">
                    {ROLE_LABELS[currentUser.role]}
                  </span>
                </span>
                <ChevronDown className="h-3.5 w-3.5 text-[#77766F] shrink-0" />
              </button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuLabel className="font-normal">
                <p className="text-xs font-semibold text-[#252A27]">
                  {currentUser.fullName}
                </p>
                <p className="font-mono text-[10.5px] text-[#77766F]">
                  {ROLE_LABELS[currentUser.role]} · @{currentUser.username}
                </p>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="font-mono text-[10px] uppercase tracking-[0.08em] text-[#77766F]">
                Switch Workspace Role
              </DropdownMenuLabel>
              {demoUsers.map((demo) => {
                const active = demo.id === currentUser.id;
                return (
                  <DropdownMenuItem
                    key={demo.id}
                    onSelect={() => handleSwitchDemo(demo.id)}
                    className="flex items-center justify-between"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-[#252A27] truncate">
                        {ROLE_LABELS[demo.role]}
                      </p>
                      <p className="text-[11px] text-[#77766F] truncate">
                        {demo.fullName}
                      </p>
                    </div>
                    {active && <Check className="h-3.5 w-3.5 text-[#C66A3D] shrink-0" />}
                  </DropdownMenuItem>
                );
              })}
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => navigate('/login')}>
                <Repeat className="h-3.5 w-3.5 text-[#77766F]" />
                <span>Open Sign-In Screen</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={handleLogout}
                className="text-[#9E352B] focus:text-[#9E352B]"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>Sign Out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </header>
  );
}
