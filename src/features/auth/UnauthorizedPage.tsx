import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, LogIn, ShieldAlert } from 'lucide-react';
import { useAuth } from '@/src/context/AuthContext';
import { ROLE_DEFAULT_HOME, ROLE_LABELS } from '@/src/config/permissions';
import { PageContainer } from '@/src/components/layout/PageContainer';
import { Button } from '@/src/components/ui/button';
import { Card, CardContent } from '@/src/components/ui/card';
import { Badge } from '@/src/components/ui/badge';

export function UnauthorizedPage({ reason }: { reason?: string }) {
  const { currentUser } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const homePath = currentUser ? ROLE_DEFAULT_HOME[currentUser.role] : '/login';

  return (
    <PageContainer
      title="Access Restricted"
      description="Your current role does not have permission to open this workspace screen."
    >
      <Card className="max-w-xl">
        <CardContent className="p-6 space-y-5">
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-red-200 bg-red-50 text-red-700">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base font-semibold text-slate-900">
                  Unauthorized Page Access
                </h2>
                {currentUser && (
                  <Badge variant="neutral">
                    Signed in as {ROLE_LABELS[currentUser.role]}
                  </Badge>
                )}
              </div>
              <p className="text-sm text-slate-600 leading-relaxed">
                {reason ??
                  `The route "${location.pathname}" is restricted for the ${
                    currentUser ? ROLE_LABELS[currentUser.role] : 'current'
                  } role.`}
              </p>
              <p className="text-xs text-slate-500">
                Use the profile menu in the top bar or open the Demo Login selector to test this route with an authorized role.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 border-t border-slate-100 pt-4">
            <Button size="sm" onClick={() => navigate(homePath)}>
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Go to My Dashboard</span>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link to="/login">
                <LogIn className="h-3.5 w-3.5" />
                <span>Switch Demo Account</span>
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </PageContainer>
  );
}
