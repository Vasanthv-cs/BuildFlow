import { NavLink } from 'react-router-dom';
import { X } from 'lucide-react';
import { useAuth } from '@/src/context/AuthContext';
import {
  ROLE_DEFAULT_HOME,
  ROLE_LABELS,
  ROLE_NAV_GROUPS,
} from '@/src/config/permissions';
import { BuildFlowLogo } from '@/src/components/brand/BuildFlowLogo';
import { cn } from '@/src/lib/utils';

interface SidebarProps {
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export function Sidebar({ mobileOpen, onCloseMobile }: SidebarProps) {
  const { currentUser } = useAuth();
  const role = currentUser?.role ?? 'owner';
  const navGroups = ROLE_NAV_GROUPS[role];
  const homePath = ROLE_DEFAULT_HOME[role];

  const sidebarBody = (
    <div className="flex h-full flex-col bg-[#252A27] text-[#E6E1D7] select-none">
      {/* Brand mark */}
      <div className="flex h-16 items-center justify-between border-b border-[#363C38] px-5 shrink-0">
        <NavLink
          to={homePath}
          onClick={onCloseMobile}
          className="focus-visible:outline-none"
        >
          <BuildFlowLogo theme="dark" showTagline />
        </NavLink>

        <button
          type="button"
          onClick={onCloseMobile}
          aria-label="Close navigation menu"
          className="rounded-[4px] p-1.5 text-[#A7A49B] hover:bg-[#313733] hover:text-[#F4F0E8] lg:hidden cursor-pointer"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Role-aware Navigation groups */}
      <nav
        aria-label="Primary navigation"
        className="flex-1 overflow-y-auto px-3 py-5 space-y-6"
      >
        {navGroups.map((group) => (
          <div key={group.label}>
            <p className="px-3 pb-2 font-mono text-[10px] font-medium uppercase tracking-[0.12em] text-[#8E8C83]">
              {group.label}
            </p>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
                      end={item.end}
                      onClick={onCloseMobile}
                      className={({ isActive }) =>
                        cn(
                          'flex items-center gap-2.5 rounded-[4px] px-3 py-2 text-[13.5px] font-medium whitespace-nowrap transition-colors duration-150',
                          isActive
                            ? 'bg-[#313733] text-[#F4F0E8] shadow-[inset_2.5px_0_0_0_#C66A3D]'
                            : 'text-[#C6C2B8] hover:bg-[#2C322E] hover:text-[#F4F0E8]',
                        )
                      }
                    >
                      {({ isActive }) => (
                        <>
                          <Icon
                            className={cn(
                              'h-4 w-4 shrink-0',
                              isActive ? 'text-[#C66A3D]' : 'text-[#9A978E]',
                            )}
                          />
                          <span className="truncate">{item.label}</span>
                        </>
                      )}
                    </NavLink>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Current User Role Footer */}
      {currentUser && (
        <div className="border-t border-[#363C38] bg-[#1F2421] px-4 py-3.5 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-[4px] border border-[#3E4540] bg-[#2A302C] font-mono text-xs font-semibold text-[#E8C5B2] shrink-0">
              {currentUser.initials}
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold text-[#F4F0E8]">
                {currentUser.fullName}
              </p>
              <p className="truncate font-mono text-[10px] uppercase tracking-[0.06em] text-[#9A978E]">
                {ROLE_LABELS[currentUser.role]}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <>
      <aside className="no-print hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-30 lg:flex lg:w-[248px] lg:flex-col border-r border-[#363C38]">
        {sidebarBody}
      </aside>

      {mobileOpen && (
        <div className="no-print fixed inset-0 z-50 flex lg:hidden">
          <div
            className="fixed inset-0 bg-[#1B1F1D]/60 backdrop-blur-[1px]"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <aside className="relative z-10 flex w-[264px] max-w-[82vw] flex-col shadow-2xl">
            {sidebarBody}
          </aside>
        </div>
      )}
    </>
  );
}
