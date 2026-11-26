import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  HardHat,
  Home,
  Info,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';
import { useAuth } from '@/src/context/AuthContext';
import {
  ROLE_DEFAULT_HOME,
  ROLE_DESCRIPTIONS,
  ROLE_LABELS,
} from '@/src/config/permissions';
import { BuildFlowLogo } from '@/src/components/brand/BuildFlowLogo';
import { LOGIN_STUDIO_IMAGE } from '@/src/data/projectVisuals';
import { Button } from '@/src/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/src/components/ui/card';
import { Input, Label } from '@/src/components/ui/input';
import { Badge } from '@/src/components/ui/badge';
import type { AppRole } from '@/src/types';

const ROLE_ICONS: Record<AppRole, React.ComponentType<{ className?: string }>> = {
  owner: ShieldCheck,
  supervisor: UserCheck,
  worker: HardHat,
  client: Home,
};

export function DemoLoginPage() {
  const { demoUsers, loginAsDemoUser, loginWithCredentials } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const fromPath = (location.state as { from?: string } | null)?.from;

  const [username, setUsername] = useState('vikram.owner');
  const [password, setPassword] = useState('demo1234');
  const [error, setError] = useState('');

  const handleSelectDemoUser = (userId: string) => {
    const user = loginAsDemoUser(userId);
    if (!user) return;
    navigate(ROLE_DEFAULT_HOME[user.role], { replace: true });
  };

  const handleCredentialSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const result = await loginWithCredentials(username, password);
    if (!result.ok || !result.user) {
      setError(result.error ?? 'Unable to sign in.');
      return;
    }
    const target =
      fromPath && fromPath !== '/login'
        ? fromPath
        : ROLE_DEFAULT_HOME[result.user.role];
    navigate(target, { replace: true });
  };

  return (
    <div className="min-h-screen bg-[#F4F0E8] text-[#252A27] flex flex-col lg:flex-row">
      {/* Left: Architectural Fieldwork Brand Showcase Panel */}
      <aside className="relative hidden lg:flex lg:w-[44%] xl:w-[42%] flex-col justify-between bg-[#252A27] bg-blueprint-grid-dark text-[#F4F0E8] p-10 xl:p-12 border-r border-[#363C38]">
        <div>
          <BuildFlowLogo theme="dark" showTagline />
          <div className="mt-10 max-w-md">
            <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#C66A3D]">
              Fieldwork Edition · Menon Civil &amp; Homes
            </p>
            <h1 className="mt-3 text-[32px] xl:text-[36px] font-semibold tracking-[-0.03em] leading-[1.12] text-[#F4F0E8]">
              Precision site operations from foundation to handover.
            </h1>
            <p className="mt-4 text-sm text-[#C6C2B8] leading-relaxed">
              One structured workspace connecting residential project budgets, daily muster rolls, weekly wage settlements, material stock, and transparent homeowner progress reports.
            </p>
          </div>
        </div>

        {/* Framed Architectural Drafting Studio Photograph */}
        <div className="my-8 overflow-hidden rounded-[6px] border border-[#3E4540] bg-[#1D211F]">
          <div className="aspect-[16/10] w-full overflow-hidden">
            <img
              src={LOGIN_STUDIO_IMAGE.src}
              alt={LOGIN_STUDIO_IMAGE.alt}
              referrerPolicy="no-referrer"
              className="h-full w-full object-cover"
            />
          </div>
          <div className="flex items-center justify-between border-t border-[#363C38] px-4 py-2.5 font-mono text-[10.5px] uppercase tracking-[0.1em] text-[#A7A49B]">
            <span>Bengaluru · Pune · Hyderabad</span>
            <span className="text-[#E8C5B2]">Residential Turnkey OS</span>
          </div>
        </div>

        {/* Architectural Spec Footer */}
        <div className="grid grid-cols-3 gap-4 border-t border-[#363C38] pt-5">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-[#8E8C83]">
              Role Isolation
            </p>
            <p className="mt-1 text-xs font-medium text-[#F4F0E8]">
              4 Scoped Portals
            </p>
          </div>
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-[#8E8C83]">
              Payroll Engine
            </p>
            <p className="mt-1 text-xs font-medium text-[#F4F0E8]">
              Shift-Weighted INR
            </p>
          </div>
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-[#8E8C83]">
              Client Dossiers
            </p>
            <p className="mt-1 text-xs font-medium text-[#F4F0E8]">
              Approved Only
            </p>
          </div>
        </div>
      </aside>

      {/* Right: Credential Sign-In + Role Quick Selector */}
      <main className="flex-1 bg-blueprint-grid px-5 py-8 sm:px-8 lg:px-12 xl:px-16 flex items-center justify-center">
        <div className="w-full max-w-2xl space-y-6">
          {/* Mobile Brand Header */}
          <div className="flex items-center justify-between border-b border-[#D8D1C5] pb-4 lg:hidden">
            <BuildFlowLogo theme="light" showTagline />
            <span className="font-mono text-[10.5px] uppercase tracking-[0.08em] text-[#77766F]">
              Fieldwork Edition
            </span>
          </div>

          {/* Credential Sign-in Card */}
          <Card className="border-[#D8D1C5]">
            <CardHeader className="pb-4 border-b border-[#E6E0D5]">
              <p className="arch-label">Workspace Sign In</p>
              <CardTitle className="text-xl mt-0.5">
                Access your BuildFlow workspace
              </CardTitle>
              <CardDescription>
                Sign in with your account credentials or launch any of the four role portals below.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-5">
              <form
                onSubmit={handleCredentialSubmit}
                className="grid grid-cols-1 gap-4 sm:grid-cols-12 sm:items-end"
              >
                <div className="sm:col-span-5 space-y-1.5">
                  <Label htmlFor="login-username">Username or Email</Label>
                  <Input
                    id="login-username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="e.g. prakash.sup"
                    autoComplete="username"
                  />
                </div>
                <div className="sm:col-span-4 space-y-1.5">
                  <Label htmlFor="login-password">Password</Label>
                  <Input
                    id="login-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    autoComplete="current-password"
                  />
                </div>
                <div className="sm:col-span-3">
                  <Button type="submit" className="w-full">
                    <span>Sign In</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </form>

              {error && (
                <p className="mt-3 text-xs font-medium text-[#9A3026]">{error}</p>
              )}
            </CardContent>
          </Card>

          {/* 4-Role Quick Demo Selector */}
          <section aria-label="Role demo selector" className="space-y-3">
            <div className="flex items-baseline justify-between gap-2">
              <div>
                <p className="arch-label">Role Workspaces</p>
                <h2 className="mt-0.5 text-base font-semibold text-[#252A27]">
                  Quick Demo Account Selector
                </h2>
              </div>
              <span className="font-mono text-[11px] text-[#77766F]">
                4 roles configured
              </span>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {demoUsers.map((user) => {
                const Icon = ROLE_ICONS[user.role];
                return (
                  <Card
                    key={user.id}
                    className="flex flex-col justify-between p-4 transition-colors hover:border-[#C66A3D]"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex h-9 w-9 items-center justify-center rounded-[4px] border border-[#D8D1C5] bg-[#FAF8F3] text-[#252A27]">
                          <Icon className="h-4 w-4" />
                        </div>
                        <Badge
                          variant={
                            user.role === 'owner'
                              ? 'blue'
                              : user.role === 'supervisor'
                              ? 'amber'
                              : user.role === 'worker'
                              ? 'green'
                              : 'neutral'
                          }
                        >
                          {ROLE_LABELS[user.role]}
                        </Badge>
                      </div>

                      <p className="mt-3 text-sm font-semibold text-[#252A27]">
                        {user.fullName}
                      </p>
                      <p className="text-xs text-[#77766F]">{user.title}</p>
                      <p className="mt-2 text-xs text-[#57564F] leading-relaxed">
                        {ROLE_DESCRIPTIONS[user.role]}
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-[#E6E0D5] flex items-center justify-between gap-2">
                      <span className="font-mono text-[11px] text-[#77766F]">
                        @{user.username}
                      </span>
                      <Button
                        size="sm"
                        variant={user.role === 'owner' ? 'default' : 'outline'}
                        onClick={() => handleSelectDemoUser(user.id)}
                      >
                        <span>Enter</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          </section>

          {/* Frontend Prototype Notice */}
          <div className="rounded-[4px] border border-[#D8D1C5] bg-[#FAF8F3] px-4 py-3 text-xs text-[#57564F] flex items-start gap-2.5">
            <Info className="h-4 w-4 text-[#77766F] shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <strong className="text-[#252A27]">Frontend Prototype Mode:</strong>{' '}
              Role switching and workspace scoping run locally in browser state for end-to-end verification before connecting the Node.js &amp; PostgreSQL backend.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
