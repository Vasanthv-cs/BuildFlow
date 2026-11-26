/**
 * BuildFlow Frontend API Client
 * Connects frontend UI modules to Express REST endpoints (/api/v1/*).
 * All requests include credentials (HTTP-only cookies) and handle JSON parsing and errors.
 */

const BASE_URL = ''; // Relative URL handled by Vite proxy in dev, or same host in prod

export class ApiError extends Error {
  constructor(public status: number, message: string, public issues?: any[]) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${BASE_URL}${endpoint}`;
  const isFormData = options.body instanceof FormData;

  const headers: Record<string, string> = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...((options.headers as Record<string, string>) || {}),
  };

  const response = await fetch(url, {
    credentials: 'include', // Include HTTP-only cookie
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorMsg = `Request failed: ${response.status} ${response.statusText}`;
    let issues: any[] | undefined;
    try {
      const errJson = await response.json();
      if (errJson.error) errorMsg = errJson.error;
      if (errJson.issues) issues = errJson.issues;
    } catch {
      // Non-JSON response
    }
    throw new ApiError(response.status, errorMsg, issues);
  }

  // 204 No Content
  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}

function buildQuery(params?: Record<string, string | number | boolean | undefined>): string {
  if (!params) return '';
  const searchParams = new URLSearchParams();
  for (const [key, val] of Object.entries(params)) {
    if (val !== undefined && val !== null && val !== '') {
      searchParams.set(key, String(val));
    }
  }
  const str = searchParams.toString();
  return str ? `?${str}` : '';
}

// ── Auth API ─────────────────────────────────────────────────────────────────
export const authApi = {
  login: (data: { email: string; password: string }) =>
    request<{ user: { id: string; email: string; name: string; role: string } }>('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  logout: () =>
    request<{ message: string }>('/api/v1/auth/logout', {
      method: 'POST',
    }),

  getMe: () =>
    request<{ user: { userId: string; role: string; email: string } }>('/api/v1/auth/me'),
};

// ── Projects API ─────────────────────────────────────────────────────────────
export const projectsApi = {
  list: (params?: { status?: string; search?: string; page?: number; limit?: number }) =>
    request<{ projects: any[]; total: number }>(`/api/v1/projects${buildQuery(params)}`),

  get: (id: string) =>
    request<{ project: any }>(`/api/v1/projects/${id}`),

  create: (data: any) =>
    request<{ project: any }>('/api/v1/projects', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: any) =>
    request<{ project: any }>(`/api/v1/projects/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    request<{ message: string }>(`/api/v1/projects/${id}`, {
      method: 'DELETE',
    }),
};

// ── Clients API ──────────────────────────────────────────────────────────────
export const clientsApi = {
  list: (params?: { search?: string; page?: number; limit?: number }) =>
    request<{ clients: any[]; total: number }>(`/api/v1/clients${buildQuery(params)}`),

  get: (id: string) =>
    request<{ client: any }>(`/api/v1/clients/${id}`),

  create: (data: any) =>
    request<{ client: any }>('/api/v1/clients', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: any) =>
    request<{ client: any }>(`/api/v1/clients/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    request<{ message: string }>(`/api/v1/clients/${id}`, {
      method: 'DELETE',
    }),
};

// ── Workers API ──────────────────────────────────────────────────────────────
export const workersApi = {
  list: (params?: { search?: string; page?: number; limit?: number }) =>
    request<{ workers: any[]; total: number }>(`/api/v1/workers${buildQuery(params)}`),

  get: (id: string) =>
    request<{ worker: any }>(`/api/v1/workers/${id}`),

  create: (data: any) =>
    request<{ worker: any }>('/api/v1/workers', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: any) =>
    request<{ worker: any }>(`/api/v1/workers/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    request<{ message: string }>(`/api/v1/workers/${id}`, {
      method: 'DELETE',
    }),
};

// ── Attendance API ───────────────────────────────────────────────────────────
export const attendanceApi = {
  list: (params?: {
    projectId?: string;
    workerId?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }) => request<{ attendance: any[]; total: number }>(`/api/v1/attendance${buildQuery(params)}`),

  record: (data: {
    workerId: string;
    projectId: string;
    date: string;
    status: 'present' | 'absent' | 'half_day' | 'overtime';
    checkIn?: string;
    checkOut?: string;
    notes?: string;
  }) =>
    request<{ record: any }>('/api/v1/attendance', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  recordBulk: (data: {
    projectId: string;
    date: string;
    records: Array<{
      workerId: string;
      status: 'present' | 'absent' | 'half_day' | 'overtime';
      checkIn?: string;
      checkOut?: string;
      notes?: string;
    }>;
  }) =>
    request<{ saved: number }>('/api/v1/attendance/bulk', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

// ── Wages & Payroll API ──────────────────────────────────────────────────────
export const wagesApi = {
  list: (params?: {
    workerId?: string;
    projectId?: string;
    weekStart?: string;
    weekEnd?: string;
    page?: number;
    limit?: number;
  }) => request<{ wages: any[]; total: number }>(`/api/v1/wages${buildQuery(params)}`),

  calculate: (data: {
    workerId: string;
    projectId?: string;
    weekStart: string;
    weekEnd: string;
  }) =>
    request<any>('/api/v1/wages/calculate', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  approve: (data: {
    workerId: string;
    projectId?: string;
    weekStart: string;
    weekEnd: string;
    grossWage: string;
    totalAdvances: string;
    netWage: string;
    notes?: string;
  }) =>
    request<{ wage: any }>('/api/v1/wages/approve', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  recordAdvance: (data: {
    workerId: string;
    amount: string;
    date: string;
    notes?: string;
  }) =>
    request<{ advance: any }>('/api/v1/wages/advances', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getSettings: (workerId: string) =>
    request<{ settings: any }>(`/api/v1/wages/settings/${workerId}`),

  updateSettings: (workerId: string, data: { dailyWage?: string; overtimeMultiplier?: string }) =>
    request<{ settings: any }>(`/api/v1/wages/settings/${workerId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
};

// ── Expenses API ─────────────────────────────────────────────────────────────
export const expensesApi = {
  list: (params?: {
    projectId?: string;
    category?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }) => request<{ expenses: any[]; total: number }>(`/api/v1/expenses${buildQuery(params)}`),

  create: (data: any) =>
    request<{ expense: any }>('/api/v1/expenses', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: any) =>
    request<{ expense: any }>(`/api/v1/expenses/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    request<{ message: string }>(`/api/v1/expenses/${id}`, {
      method: 'DELETE',
    }),
};

// ── Materials API ────────────────────────────────────────────────────────────
export const materialsApi = {
  list: (params?: { search?: string; category?: string; page?: number; limit?: number }) =>
    request<{ materials: any[]; total: number }>(`/api/v1/materials${buildQuery(params)}`),

  listTransactions: (materialId: string, params?: { page?: number; limit?: number }) =>
    request<{ transactions: any[] }>(`/api/v1/materials/${materialId}/transactions${buildQuery(params)}`),

  create: (data: any) =>
    request<{ material: any }>('/api/v1/materials', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  recordTransaction: (data: any) =>
    request<{ transaction: any }>('/api/v1/materials/transactions', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: any) =>
    request<{ material: any }>(`/api/v1/materials/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
};

// ── Suppliers API ────────────────────────────────────────────────────────────
export const suppliersApi = {
  list: (params?: { search?: string; category?: string; page?: number; limit?: number }) =>
    request<{ suppliers: any[]; total: number }>(`/api/v1/suppliers${buildQuery(params)}`),

  create: (data: any) =>
    request<{ supplier: any }>('/api/v1/suppliers', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: any) =>
    request<{ supplier: any }>(`/api/v1/suppliers/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  recordPayment: (data: any) =>
    request<{ payment: any }>('/api/v1/suppliers/payments', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

// ── Customer Payments API ────────────────────────────────────────────────────
export const paymentsApi = {
  list: (params?: { projectId?: string; clientId?: string; status?: string; page?: number; limit?: number }) =>
    request<{ payments: any[]; total: number }>(`/api/v1/payments${buildQuery(params)}`),

  create: (data: any) =>
    request<{ payment: any }>('/api/v1/payments', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: any) =>
    request<{ payment: any }>(`/api/v1/payments/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
};

// ── Reports API ──────────────────────────────────────────────────────────────
export const reportsApi = {
  listProgress: (params?: { projectId?: string; supervisorId?: string; page?: number; limit?: number }) =>
    request<{ reports: any[]; total: number }>(`/api/v1/reports/progress${buildQuery(params)}`),

  createProgress: (data: any) =>
    request<{ report: any }>('/api/v1/reports/progress', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  approveProgress: (id: string) =>
    request<{ report: any }>(`/api/v1/reports/progress/${id}/approve`, {
      method: 'PATCH',
    }),

  financialSummary: (params?: { projectId?: string; startDate?: string; endDate?: string }) =>
    request<{
      totalExpenses: number;
      totalIncome: number;
      totalWages: number;
      netProfit: number;
      expenseCount: number;
      paymentCount: number;
    }>(`/api/v1/reports/financial-summary${buildQuery(params)}`),
};

// ── Documents API ────────────────────────────────────────────────────────────
export const documentsApi = {
  list: (params?: {
    projectId?: string;
    category?: string;
    search?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }) => request<{ documents: any[]; total: number }>(`/api/v1/documents${buildQuery(params)}`),

  upload: (formData: FormData) =>
    request<{ document: any }>('/api/v1/documents', {
      method: 'POST',
      body: formData,
    }),

  delete: (id: string) =>
    request<{ message: string }>(`/api/v1/documents/${id}`, {
      method: 'DELETE',
    }),
};
