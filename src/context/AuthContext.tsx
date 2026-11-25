import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { DEMO_USERS, INITIAL_CLIENT_CREDENTIALS } from '@/src/data/workforceMockData';
import {
  getRolePermissions,
  type RolePermissions,
} from '@/src/config/permissions';
import type { AppRole, AuthUser, ClientCredentialAccount, Worker } from '@/src/types';

const STORAGE_KEY = 'buildflow_demo_auth_user_id';

function clientCredentialToAuthUser(cred: ClientCredentialAccount): AuthUser {
  const parts = cred.customerName.trim().split(/\s+/);
  const initials =
    parts.length >= 2
      ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
      : cred.customerName.slice(0, 2).toUpperCase();
  return {
    id: `usr-cli-${cred.id}`,
    username: cred.username,
    fullName: cred.customerName,
    email: cred.email,
    phone: cred.phone,
    role: 'client',
    title: `Homeowner · ${cred.assignedProjectIds.length} Assigned Project(s)`,
    initials,
    assignedProjectIds: cred.assignedProjectIds,
    linkedCustomerId: cred.customerId,
  };
}

function workerToAuthUser(worker: Worker): AuthUser {
  const parts = worker.name.trim().split(/\s+/);
  const initials =
    parts.length >= 2
      ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
      : worker.name.slice(0, 2).toUpperCase();
  const projectIds =
    worker.assignedProjectIds && worker.assignedProjectIds.length > 0
      ? worker.assignedProjectIds
      : [worker.assignedProjectId];
  return {
    id: `usr-wrk-${worker.id}`,
    username: worker.loginUsername || `${worker.name.toLowerCase().split(/\s+/)[0]}.wrk`,
    fullName: worker.name,
    email: `${(worker.loginUsername || worker.id).toLowerCase()}@workers.buildflow.in`,
    phone: worker.phone,
    role: 'worker',
    title: `${worker.role} · ${worker.workerCode ?? 'Workforce'}`,
    initials,
    assignedProjectIds: projectIds,
    linkedWorkerId: worker.id,
  };
}

interface AuthContextValue {
  currentUser: AuthUser | null;
  isAuthenticated: boolean;
  demoUsers: AuthUser[];
  registeredUsers: AuthUser[];
  permissions: RolePermissions;
  loginAsDemoUser: (userId: string) => AuthUser | null;
  loginAsCustomUser: (user: AuthUser) => void;
  syncClientCredentialUser: (cred: ClientCredentialAccount) => void;
  syncWorkerAuthUser: (worker: Worker) => void;
  assignProjectToSupervisor: (projectId: string, supervisorName?: string) => void;
  loginWithCredentials: (
    username: string,
    password: string,
  ) => { ok: boolean; user?: AuthUser; error?: string };
  switchRole: (role: AppRole) => AuthUser | null;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const INITIAL_ALL_USERS: AuthUser[] = [
  ...DEMO_USERS,
  ...INITIAL_CLIENT_CREDENTIALS.filter((c) => c.username !== 'kulkarni.client').map(
    clientCredentialToAuthUser,
  ),
];

function loadInitialUser(): AuthUser | null {
  try {
    const savedId = window.localStorage.getItem(STORAGE_KEY);
    if (savedId === 'logged_out') return null;
    if (savedId) {
      const found = INITIAL_ALL_USERS.find((u) => u.id === savedId);
      if (found) return found;
    }
  } catch {
    // Ignore storage access restrictions
  }
  // Default to Owner demo account so existing views load immediately
  return DEMO_USERS[0];
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [registeredUsers, setRegisteredUsers] = useState<AuthUser[]>(INITIAL_ALL_USERS);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(loadInitialUser);

  const persistUser = useCallback((user: AuthUser | null) => {
    setCurrentUser(user);
    try {
      window.localStorage.setItem(STORAGE_KEY, user ? user.id : 'logged_out');
    } catch {
      // Ignore storage failures
    }
  }, []);

  const loginAsDemoUser = useCallback(
    (userId: string): AuthUser | null => {
      const found =
        registeredUsers.find((u) => u.id === userId) ??
        DEMO_USERS.find((u) => u.id === userId) ??
        null;
      persistUser(found);
      return found;
    },
    [registeredUsers, persistUser],
  );

  const loginAsCustomUser = useCallback(
    (user: AuthUser) => {
      setRegisteredUsers((prev) => {
        const exists = prev.some((u) => u.id === user.id || u.username === user.username);
        if (exists) {
          return prev.map((u) =>
            u.id === user.id || u.username === user.username ? user : u,
          );
        }
        return [...prev, user];
      });
      persistUser(user);
    },
    [persistUser],
  );

  const syncClientCredentialUser = useCallback(
    (cred: ClientCredentialAccount) => {
      const mapped = clientCredentialToAuthUser(cred);
      setRegisteredUsers((prev) => {
        const exists = prev.some(
          (u) =>
            u.username.toLowerCase() === cred.username.toLowerCase() ||
            u.linkedCustomerId === cred.customerId,
        );
        if (exists) {
          return prev.map((u) =>
            u.username.toLowerCase() === cred.username.toLowerCase() ||
            u.linkedCustomerId === cred.customerId
              ? { ...u, ...mapped, id: u.id }
              : u,
          );
        }
        return [...prev, mapped];
      });
      setCurrentUser((curr) => {
        if (!curr) return curr;
        if (
          curr.username.toLowerCase() === cred.username.toLowerCase() ||
          curr.linkedCustomerId === cred.customerId
        ) {
          return { ...curr, ...mapped, id: curr.id };
        }
        return curr;
      });
    },
    [],
  );

  const syncWorkerAuthUser = useCallback((worker: Worker) => {
    const mapped = workerToAuthUser(worker);
    setRegisteredUsers((prev) => {
      const exists = prev.some((u) => u.linkedWorkerId === worker.id);
      if (exists) {
        return prev.map((u) =>
          u.linkedWorkerId === worker.id ? { ...u, ...mapped, id: u.id } : u,
        );
      }
      return [...prev, mapped];
    });
    setCurrentUser((curr) => {
      if (!curr || curr.linkedWorkerId !== worker.id) return curr;
      return { ...curr, ...mapped, id: curr.id };
    });
  }, []);

  const assignProjectToSupervisor = useCallback(
    (projectId: string, supervisorName?: string) => {
      setRegisteredUsers((prev) =>
        prev.map((u) => {
          if (u.role !== 'supervisor') return u;
          if (
            supervisorName &&
            !u.fullName.toLowerCase().includes(supervisorName.trim().toLowerCase()) &&
            u.id !== 'usr-sup-1'
          ) {
            return u;
          }
          const nextProjects = Array.from(new Set([...u.assignedProjectIds, projectId]));
          return { ...u, assignedProjectIds: nextProjects };
        }),
      );
      setCurrentUser((curr) => {
        if (!curr || curr.role !== 'supervisor') return curr;
        const nextProjects = Array.from(new Set([...curr.assignedProjectIds, projectId]));
        return { ...curr, assignedProjectIds: nextProjects };
      });
    },
    [],
  );

  const loginWithCredentials = useCallback(
    (
      username: string,
      password: string,
    ): { ok: boolean; user?: AuthUser; error?: string } => {
      const normalized = username.trim().toLowerCase();
      if (!normalized || !password.trim()) {
        return { ok: false, error: 'Enter both username and demo password.' };
      }
      const matched = registeredUsers.find(
        (u) =>
          u.username.toLowerCase() === normalized ||
          u.email.toLowerCase() === normalized,
      );
      if (!matched) {
        return {
          ok: false,
          error:
            'Demo account not found. Use one of the demo usernames or click a quick-sign-in role card below.',
        };
      }
      persistUser(matched);
      return { ok: true, user: matched };
    },
    [registeredUsers, persistUser],
  );

  const switchRole = useCallback(
    (role: AppRole): AuthUser | null => {
      const target =
        registeredUsers.find((u) => u.role === role) ??
        DEMO_USERS.find((u) => u.role === role) ??
        null;
      persistUser(target);
      return target;
    },
    [registeredUsers, persistUser],
  );

  const logout = useCallback(() => {
    persistUser(null);
  }, [persistUser]);

  const permissions = useMemo<RolePermissions>(
    () => getRolePermissions(currentUser?.role ?? 'client'),
    [currentUser?.role],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      currentUser,
      isAuthenticated: Boolean(currentUser),
      demoUsers: DEMO_USERS,
      registeredUsers,
      permissions,
      loginAsDemoUser,
      loginAsCustomUser,
      syncClientCredentialUser,
      syncWorkerAuthUser,
      assignProjectToSupervisor,
      loginWithCredentials,
      switchRole,
      logout,
    }),
    [
      currentUser,
      registeredUsers,
      permissions,
      loginAsDemoUser,
      loginAsCustomUser,
      syncClientCredentialUser,
      syncWorkerAuthUser,
      assignProjectToSupervisor,
      loginWithCredentials,
      switchRole,
      logout,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return ctx;
}
