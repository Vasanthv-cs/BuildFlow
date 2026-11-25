import React from 'react';
import { Navigate, useLocation, useParams } from 'react-router-dom';
import { useAuth } from '@/src/context/AuthContext';
import {
  canUserAccessPath,
  canUserAccessProject,
  ROLE_LABELS,
} from '@/src/config/permissions';
import type { AppRole } from '@/src/types';
import { UnauthorizedPage } from './UnauthorizedPage';

interface RoleRouteGuardProps {
  children: React.ReactNode;
  allowedRoles?: AppRole[];
  enforceProjectParam?: boolean;
}

export function RoleRouteGuard({
  children,
  allowedRoles,
  enforceProjectParam = false,
}: RoleRouteGuardProps) {
  const { currentUser } = useAuth();
  const location = useLocation();
  const params = useParams<{ projectId?: string }>();

  if (!currentUser) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location.pathname }}
      />
    );
  }

  const allowedByExplicitList = allowedRoles
    ? allowedRoles.includes(currentUser.role)
    : canUserAccessPath(currentUser, location.pathname);

  if (!allowedByExplicitList) {
    return <UnauthorizedPage />;
  }

  if (
    enforceProjectParam &&
    params.projectId &&
    !canUserAccessProject(currentUser, params.projectId)
  ) {
    return (
      <UnauthorizedPage
        reason={`As ${ROLE_LABELS[currentUser.role]}, you can only view projects explicitly assigned to your account.`}
      />
    );
  }

  return <>{children}</>;
}
