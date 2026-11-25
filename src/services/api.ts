import type {
  ActivityEvent,
  CustomerPayment,
  Expense,
  MaterialDelivery,
  MaterialStock,
  Project,
  ProjectDocument,
  ProjectFormValues,
  ProjectMilestone,
  ProjectQuotation,
  SiteProgressReport,
  Supplier,
  Worker,
} from '@/src/types';

/**
 * Service interfaces designed for seamless migration to a
 * Node.js Express + PostgreSQL REST API (/api/v1/*).
 */
export interface IProjectsApi {
  list(): Promise<Project[]>;
  getById(id: string): Promise<Project | undefined>;
  create(payload: ProjectFormValues): Promise<Project>;
  update(id: string, payload: Partial<ProjectFormValues> & { progressPercent?: number }): Promise<Project>;
}

export interface IFinanceApi {
  listPayments(projectId?: string): Promise<CustomerPayment[]>;
  listExpenses(projectId?: string): Promise<Expense[]>;
  listQuotations(projectId?: string): Promise<ProjectQuotation[]>;
}

export interface IOperationsApi {
  listMaterials(projectId?: string): Promise<MaterialStock[]>;
  listDeliveries(projectId?: string): Promise<MaterialDelivery[]>;
  listSuppliers(): Promise<Supplier[]>;
  listWorkers(projectId?: string): Promise<Worker[]>;
  listMilestones(projectId?: string): Promise<ProjectMilestone[]>;
  listProgressReports(projectId?: string): Promise<SiteProgressReport[]>;
  listDocuments(projectId?: string): Promise<ProjectDocument[]>;
  listActivities(projectId?: string): Promise<ActivityEvent[]>;
}

export interface IBuildFlowApiClient {
  projects: IProjectsApi;
  finance: IFinanceApi;
  operations: IOperationsApi;
}

/**
 * REST endpoint registry for future Express + PostgreSQL backend wiring.
 */
export const API_ENDPOINTS = {
  projects: '/api/v1/projects',
  customers: '/api/v1/customers',
  payments: '/api/v1/payments',
  expenses: '/api/v1/expenses',
  materials: '/api/v1/materials',
  deliveries: '/api/v1/deliveries',
  suppliers: '/api/v1/suppliers',
  workers: '/api/v1/workers',
  milestones: '/api/v1/milestones',
  quotations: '/api/v1/quotations',
  progressReports: '/api/v1/progress-reports',
  documents: '/api/v1/documents',
  activities: '/api/v1/activities',
} as const;

export interface ApiResult<T> {
  data: T | null;
  error: string | null;
  status: number;
}

/**
 * Lightweight fetch wrapper ready for switching from local state to Express API.
 */
export async function httpRequest<T>(
  url: string,
  options?: RequestInit
): Promise<ApiResult<T>> {
  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...(options?.headers ?? {}),
      },
      ...options,
    });
    if (!response.ok) {
      return {
        data: null,
        error: `Request failed with status ${response.status}`,
        status: response.status,
      };
    }
    const data = (await response.json()) as T;
    return { data, error: null, status: response.status };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Unexpected network error',
      status: 0,
    };
  }
}
