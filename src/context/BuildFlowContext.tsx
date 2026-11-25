import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import {
  INITIAL_ACTIVITIES,
  INITIAL_CUSTOMERS,
  INITIAL_DELIVERIES,
  INITIAL_DOCUMENTS,
  INITIAL_EXPENSES,
  INITIAL_MATERIALS,
  INITIAL_MILESTONES,
  INITIAL_PAYMENTS,
  INITIAL_PROGRESS_REPORTS,
  INITIAL_PROJECTS,
  INITIAL_QUOTATIONS,
  INITIAL_SUPPLIERS,
} from '@/src/data/mockData';
import {
  EXTENDED_QUOTATIONS,
  INITIAL_CATALOGUE_MATERIALS,
  INITIAL_PURCHASE_ORDERS,
  INITIAL_STOCK_MOVEMENTS,
  INITIAL_SUPPLIER_PAYMENTS,
  INITIAL_SUPPLIER_RATES,
} from '@/src/data/extendedMockData';
import {
  INITIAL_CLIENT_CREDENTIALS,
  INITIAL_CLIENT_VARIATIONS,
  INITIAL_DETAILED_ATTENDANCE,
  INITIAL_ROLE_WAGE_CONFIGS,
  INITIAL_SHIFT_RULES,
  INITIAL_SITE_ISSUES,
  INITIAL_SITE_PHOTOS,
  INITIAL_SITE_UPLOADS,
  INITIAL_WORKFORCE_ADVANCES,
  INITIAL_WORKFORCE_WAGE_PAYMENTS,
  WORKFORCE_MASTER_WORKERS,
} from '@/src/data/workforceMockData';
import {
  computeWorkerPayrollSummary,
  resolveEffectiveDailySalary,
  type WorkerPayrollSummary,
} from '@/src/lib/wageCalculations';
import type {
  ActivityEvent,
  AttendanceRecord,
  AttendanceStatus,
  ClientCredentialAccount,
  ClientVariationItem,
  Customer,
  CustomerPayment,
  DefaultWorkerRole,
  Expense,
  ExpenseApprovalStatus,
  MaterialCatalogueItem,
  MaterialDelivery,
  MaterialStock,
  MilestoneStatus,
  PaymentMode,
  Project,
  ProjectDocument,
  ProjectFormValues,
  ProjectMilestone,
  ProjectQuotation,
  PurchaseOrder,
  ReviewStatus,
  RoleWageConfig,
  ShiftRule,
  SiteIssueRecord,
  SitePhotoEntry,
  SiteProgressReport,
  SiteUploadRecord,
  StockMovement,
  Supplier,
  SupplierMaterialRate,
  SupplierPayment,
  WagePayment,
  Worker,
  WorkerAccountStatus,
  WorkerAdvance,
  WorkerRole,
} from '@/src/types';

export type ComputedWorkerWageSummary = WorkerPayrollSummary;

export interface ComputedCatalogueStockItem {
  material: MaterialCatalogueItem;
  currentStock: number;
  averagePurchaseCost: number;
  isLowStock: boolean;
  isBelowMinimum: boolean;
}

function normalizeProjectId(pid?: string): string {
  if (!pid) return '';
  if (pid === 'prj-1') return 'proj-1';
  if (pid === 'prj-2') return 'proj-2';
  if (pid === 'prj-3') return 'proj-3';
  return pid;
}

const NORMALIZED_STOCK_MOVEMENTS: StockMovement[] = INITIAL_STOCK_MOVEMENTS.map((m) => ({
  ...m,
  projectId: m.projectId ? normalizeProjectId(m.projectId) : undefined,
  targetProjectId: m.targetProjectId ? normalizeProjectId(m.targetProjectId) : undefined,
}));

const NORMALIZED_PURCHASE_ORDERS: PurchaseOrder[] = INITIAL_PURCHASE_ORDERS.map((po) => ({
  ...po,
  projectId: normalizeProjectId(po.projectId),
}));

const NORMALIZED_SUPPLIER_PAYMENTS: SupplierPayment[] = INITIAL_SUPPLIER_PAYMENTS.map((sp) => ({
  ...sp,
  projectId: sp.projectId ? normalizeProjectId(sp.projectId) : undefined,
}));

const COMBINED_QUOTATIONS: ProjectQuotation[] = [
  ...INITIAL_QUOTATIONS,
  ...EXTENDED_QUOTATIONS.filter((q) => q.id !== 'quo-1').map((q) => ({
    ...q,
    projectId: normalizeProjectId(q.projectId),
    convertedProjectId: q.convertedProjectId
      ? normalizeProjectId(q.convertedProjectId)
      : undefined,
  })),
];

export interface WorkerCreatePayload {
  name: string;
  phone: string;
  role: WorkerRole;
  dailyWage?: number;
  individualDailySalary?: number | null;
  joinedDate: string;
  assignedProjectId: string;
  assignedProjectIds?: string[];
  active?: boolean;
  loginUsername?: string;
  accountStatus?: WorkerAccountStatus;
  notes?: string;
}

export interface BuildFlowContextValue {
  projects: Project[];
  customers: Customer[];
  payments: CustomerPayment[];
  expenses: Expense[];
  materials: MaterialStock[];
  materialStock: MaterialStock[];
  deliveries: MaterialDelivery[];
  suppliers: Supplier[];
  workers: Worker[];
  milestones: ProjectMilestone[];
  quotations: ProjectQuotation[];
  progressReports: SiteProgressReport[];
  documents: ProjectDocument[];
  activities: ActivityEvent[];

  // Stage 7 Inventory / Suppliers / Workforce Payroll
  catalogueMaterials: MaterialCatalogueItem[];
  computedCatalogueStock: ComputedCatalogueStockItem[];
  stockMovements: StockMovement[];
  purchaseOrders: PurchaseOrder[];
  supplierPayments: SupplierPayment[];
  supplierRates: SupplierMaterialRate[];
  attendanceRecords: AttendanceRecord[];
  workerAdvances: WorkerAdvance[];
  wagePayments: WagePayment[];

  // Stage 8 & 9 Workforce, Role Wages, Shift Rules & Site Photos
  roleWageConfigs: RoleWageConfig[];
  shiftRules: ShiftRule[];
  sitePhotos: SitePhotoEntry[];
  siteUploads: SiteUploadRecord[];
  siteIssues: SiteIssueRecord[];
  clientVariations: ClientVariationItem[];
  clientCredentials: ClientCredentialAccount[];

  // Project actions
  getProjectById: (id: string) => Project | undefined;
  getProjectFinancials: (projectId: string) => {
    contractValue: number;
    amountReceived: number;
    outstandingCustomerBalance: number;
    overdueAmount: number;
    recordedExpenses: number;
    pendingSupplierBills: number;
    estimatedRemainingCost: number;
    projectedMargin: number;
  };
  createProject: (values: ProjectFormValues) => Project;
  updateProject: (
    id: string,
    values: ProjectFormValues & { progressPercent?: number },
  ) => Project | undefined;
  assignProjectRoles: (
    projectId: string,
    supervisorName: string,
    clientCredentialId?: string,
  ) => ClientCredentialAccount | undefined;
  markPaymentReceived: (paymentId: string) => void;
  toggleMilestoneStatus: (milestoneId: string) => void;
  addProgressReport: (report: Omit<SiteProgressReport, 'id'>) => void;
  submitProgressReport: (report: Omit<SiteProgressReport, 'id'>) => void;
  updateProgressReport: (id: string, patch: Partial<SiteProgressReport>) => void;
  reviewProgressReport: (
    id: string,
    reviewStatus: ReviewStatus,
    ownerReviewNotes?: string,
    reviewedBy?: string,
  ) => void;
  updateMilestoneProgress: (
    milestoneId: string,
    actualProgressPercent: number,
    status: MilestoneStatus,
    notes?: string,
  ) => void;
  updateMilestoneDetails: (
    milestoneId: string,
    patch: Partial<ProjectMilestone>,
  ) => void;

  // Finance & Quotation actions
  recordCustomerPayment: (payload: {
    projectId: string;
    existingPaymentId?: string;
    stage: string;
    amount: number;
    date: string;
    mode: PaymentMode;
    referenceNo: string;
    notes?: string;
  }) => CustomerPayment;
  recordExpense: (payload: {
    projectId: string;
    date: string;
    category: Expense['category'];
    description: string;
    vendorName: string;
    supplierId?: string;
    amount: number;
    paidAmount: number;
    paymentMode: PaymentMode;
    paymentStatus?: Expense['paymentStatus'];
    billNumber: string;
    approvalStatus?: ExpenseApprovalStatus;
    receiptAttachmentName?: string;
  }) => Expense;
  updateExpenseApproval: (expenseId: string, status: ExpenseApprovalStatus) => void;
  createQuotation: (payload: Omit<ProjectQuotation, 'id' | 'quotationNumber'>) => ProjectQuotation;
  updateQuotation: (
    id: string,
    patch: Partial<ProjectQuotation>,
    revisionSummary?: string,
  ) => void;
  convertQuotationToProject: (quotationId: string) => Project | undefined;

  // Materials & Suppliers actions
  addCatalogueMaterial: (payload: Omit<MaterialCatalogueItem, 'id' | 'code'>) => void;
  recordStockMovement: (payload: Omit<StockMovement, 'id'>) => void;
  createPurchaseOrder: (payload: {
    supplierId: string;
    projectId: string;
    expectedDeliveryDate: string;
    items: Array<{
      materialId: string;
      materialName: string;
      unit: string;
      orderedQuantity: number;
      unitPrice: number;
    }>;
    supplierBillAttachment?: string;
    notes?: string;
  }) => void;
  recordPurchaseOrderDelivery: (
    poId: string,
    receivedByItemId: Record<string, number>,
    deliveryDate: string,
    notes?: string,
  ) => void;
  recordSupplierPayment: (payload: Omit<SupplierPayment, 'id'>) => void;

  // Workforce, Wage Config, Shift Rules & Daily Attendance actions
  createWorker: (payload: WorkerCreatePayload) => Worker;
  updateWorker: (id: string, patch: Partial<WorkerCreatePayload>) => void;
  toggleWorkerActive: (id: string) => void;
  updateRoleWageConfig: (role: DefaultWorkerRole, newDefaultDailySalary: number, updatedBy: string) => void;
  addShiftRule: (rule: Omit<ShiftRule, 'id'>) => ShiftRule;
  updateShiftRule: (id: string, patch: Partial<Omit<ShiftRule, 'id'>>) => void;
  toggleShiftRuleActive: (id: string) => void;
  upsertAttendanceEntries: (entries: Array<Omit<AttendanceRecord, 'id'> & { id?: string }>) => void;
  verifyAttendanceRecords: (recordIds: string[]) => void;
  recordBulkAttendance: (
    projectId: string,
    date: string,
    statusInput:
      | Record<string, AttendanceStatus>
      | Array<{ workerId: string; status: AttendanceStatus }>,
  ) => { created: number; updated: number };
  recordWorkerAdvance: (payload: Omit<WorkerAdvance, 'id'>) => void;
  recordWagePayment: (payload: Omit<WagePayment, 'id'>) => void;
  getWorkerWageSummary: (workerId: string) => ComputedWorkerWageSummary;
  addSitePhoto: (photo: Omit<SitePhotoEntry, 'id'>) => void;
  addSiteUpload: (upload: Omit<SiteUploadRecord, 'id'>) => SiteUploadRecord;
  updateSiteUpload: (id: string, patch: Partial<SiteUploadRecord>) => void;
  reviewSiteUpload: (
    id: string,
    reviewStatus: ReviewStatus,
    reviewNotes?: string,
    reviewedBy?: string,
  ) => void;
  addSiteIssue: (issue: Omit<SiteIssueRecord, 'id'>) => SiteIssueRecord;
  updateSiteIssueStatus: (id: string, status: SiteIssueRecord['status']) => void;
  createClientCredential: (
    payload: Omit<ClientCredentialAccount, 'id' | 'createdAt'>,
  ) => ClientCredentialAccount;
  updateClientCredential: (
    id: string,
    patch: Partial<ClientCredentialAccount>,
  ) => void;
}

const BuildFlowContext = createContext<BuildFlowContextValue | null>(null);

export function BuildFlowProvider({ children }: { children: React.ReactNode }) {
  const [projects, setProjects] = useState<Project[]>(INITIAL_PROJECTS);
  const [customers, setCustomers] = useState<Customer[]>(INITIAL_CUSTOMERS);
  const [payments, setPayments] = useState<CustomerPayment[]>(INITIAL_PAYMENTS);
  const [expenses, setExpenses] = useState<Expense[]>(INITIAL_EXPENSES);
  const [materials] = useState<MaterialStock[]>(INITIAL_MATERIALS);
  const [deliveries] = useState<MaterialDelivery[]>(INITIAL_DELIVERIES);
  const [suppliers, setSuppliers] = useState<Supplier[]>(INITIAL_SUPPLIERS);
  const [milestones, setMilestones] = useState<ProjectMilestone[]>(INITIAL_MILESTONES);
  const [quotations, setQuotations] = useState<ProjectQuotation[]>(COMBINED_QUOTATIONS);
  const [progressReports, setProgressReports] = useState<SiteProgressReport[]>(
    INITIAL_PROGRESS_REPORTS,
  );
  const [documents, setDocuments] = useState<ProjectDocument[]>(INITIAL_DOCUMENTS);
  const [activities, setActivities] = useState<ActivityEvent[]>(INITIAL_ACTIVITIES);

  // Stage 7 states
  const [catalogueMaterials, setCatalogueMaterials] = useState<MaterialCatalogueItem[]>(
    INITIAL_CATALOGUE_MATERIALS,
  );
  const [stockMovements, setStockMovements] = useState<StockMovement[]>(
    NORMALIZED_STOCK_MOVEMENTS,
  );
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>(
    NORMALIZED_PURCHASE_ORDERS,
  );
  const [supplierPayments, setSupplierPayments] = useState<SupplierPayment[]>(
    NORMALIZED_SUPPLIER_PAYMENTS,
  );
  const [supplierRates] = useState<SupplierMaterialRate[]>(INITIAL_SUPPLIER_RATES);

  // Stage 8 & 9 Workforce, Wages, Shift Rules, Attendance & Photos states
  const [roleWageConfigs, setRoleWageConfigs] = useState<RoleWageConfig[]>(
    INITIAL_ROLE_WAGE_CONFIGS,
  );
  const [shiftRules, setShiftRules] = useState<ShiftRule[]>(INITIAL_SHIFT_RULES);
  const [rawWorkers, setRawWorkers] = useState<Worker[]>(WORKFORCE_MASTER_WORKERS);
  const [rawAttendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>(
    INITIAL_DETAILED_ATTENDANCE,
  );
  const [workerAdvances, setWorkerAdvances] = useState<WorkerAdvance[]>(
    INITIAL_WORKFORCE_ADVANCES,
  );
  const [wagePayments, setWagePayments] = useState<WagePayment[]>(
    INITIAL_WORKFORCE_WAGE_PAYMENTS,
  );
  const [sitePhotos, setSitePhotos] = useState<SitePhotoEntry[]>(INITIAL_SITE_PHOTOS);
  const [siteUploads, setSiteUploads] = useState<SiteUploadRecord[]>(INITIAL_SITE_UPLOADS);
  const [siteIssues, setSiteIssues] = useState<SiteIssueRecord[]>(INITIAL_SITE_ISSUES);
  const [clientVariations] = useState<ClientVariationItem[]>(INITIAL_CLIENT_VARIATIONS);
  const [clientCredentials, setClientCredentials] = useState<ClientCredentialAccount[]>(
    INITIAL_CLIENT_CREDENTIALS,
  );

  // Dynamically derive effectiveDailyRate & calculatedWage on every attendance record whenever role defaults or worker overrides change
  const attendanceRecords = useMemo<AttendanceRecord[]>(() => {
    return rawAttendanceRecords.map((rec) => {
      const worker = rawWorkers.find((w) => w.id === rec.workerId);
      if (!worker) return rec;
      const resolved = resolveEffectiveDailySalary(worker, roleWageConfigs);
      const isWorked =
        rec.status === 'Present' ||
        rec.status === 'Half Day' ||
        rec.status === 'Pending verification';
      const regularMult = isWorked ? (rec.wageMultiplier ?? rec.attendanceUnits ?? 1) : 0;
      const addUnits = isWorked ? Math.max(0, Number(rec.additionalWageUnits) || 0) : 0;
      return {
        ...rec,
        effectiveDailyRate: resolved.dailySalary,
        calculatedWage: Math.round(resolved.dailySalary * (regularMult + addUnits)),
      };
    });
  }, [rawAttendanceRecords, rawWorkers, roleWageConfigs]);

  // Derive effective dailyWage & payroll figures for every worker dynamically whenever role rates change
  const workers = useMemo<Worker[]>(() => {
    return rawWorkers.map((w) => {
      const resolved = resolveEffectiveDailySalary(w, roleWageConfigs);
      const payroll = computeWorkerPayrollSummary(
        { ...w, dailyWage: resolved.dailySalary },
        roleWageConfigs,
        attendanceRecords,
        workerAdvances,
        wagePayments,
      );
      return {
        ...w,
        dailyWage: resolved.dailySalary,
        daysWorkedThisMonth: payroll.totalUnits,
        pendingWages: payroll.netPayable,
      };
    });
  }, [rawWorkers, roleWageConfigs, attendanceRecords, workerAdvances, wagePayments]);

  const computedCatalogueStock = useMemo<ComputedCatalogueStockItem[]>(() => {
    return catalogueMaterials.map((material) => {
      const related = stockMovements.filter((m) => m.materialId === material.id);
      let currentStock = 0;
      let totalCost = 0;
      let totalPurchasedQty = 0;

      for (const mv of related) {
        if (mv.movementType === 'Purchase Receipt' || mv.movementType === 'Material Return') {
          currentStock += mv.quantity;
          if (mv.movementType === 'Purchase Receipt' && mv.unitCost) {
            totalCost += mv.quantity * mv.unitCost;
            totalPurchasedQty += mv.quantity;
          }
        } else if (
          mv.movementType === 'Material Issue to Project' ||
          mv.movementType === 'Damaged or Wasted'
        ) {
          currentStock -= mv.quantity;
        } else if (mv.movementType === 'Stock Adjustment') {
          currentStock += mv.quantity;
        }
      }

      const roundedStock = Math.max(0, Math.round(currentStock * 100) / 100);
      const averagePurchaseCost =
        totalPurchasedQty > 0
          ? Math.round(totalCost / totalPurchasedQty)
          : material.standardUnitCost;

      return {
        material,
        currentStock: roundedStock,
        averagePurchaseCost,
        isLowStock: roundedStock <= material.reorderPoint,
        isBelowMinimum: roundedStock < material.minimumStock,
      };
    });
  }, [catalogueMaterials, stockMovements]);

  const getProjectById = useCallback(
    (id: string): Project | undefined => projects.find((p) => p.id === id),
    [projects],
  );

  const getProjectFinancials = useCallback(
    (projectId: string) => {
      const proj = projects.find((p) => p.id === projectId);
      const contractValue = proj?.contractValue ?? 0;
      const projPayments = payments.filter((p) => p.projectId === projectId);
      const amountReceived = projPayments
        .filter((p) => p.status === 'Received')
        .reduce((s, p) => s + p.amount, 0);
      const overdueAmount = projPayments
        .filter((p) => p.status === 'Overdue')
        .reduce((s, p) => s + p.amount, 0);
      const outstandingCustomerBalance = Math.max(0, contractValue - amountReceived);

      const projExpenses = expenses.filter((e) => e.projectId === projectId);
      const recordedExpenses = projExpenses.reduce((s, e) => s + e.amount, 0);
      const pendingSupplierBills = projExpenses.reduce(
        (s, e) => s + Math.max(0, e.amount - e.paidAmount),
        0,
      );

      const progressRatio = Math.max(0.05, (proj?.progressPercent ?? 0) / 100);
      const estTotalCost =
        recordedExpenses > 0
          ? Math.round(recordedExpenses / progressRatio)
          : Math.round(contractValue * 0.82);
      const estimatedRemainingCost = Math.max(0, estTotalCost - recordedExpenses);
      const projectedMargin = contractValue - (recordedExpenses + estimatedRemainingCost);

      return {
        contractValue,
        amountReceived,
        outstandingCustomerBalance,
        overdueAmount,
        recordedExpenses,
        pendingSupplierBills,
        estimatedRemainingCost,
        projectedMargin,
      };
    },
    [projects, payments, expenses],
  );

  const createProject = useCallback(
    (values: ProjectFormValues): Project => {
      const today = '2026-11-25';
      const nextNum = projects.length + 1;
      const newProjectId = `proj-${Date.now()}`;
      const existingCustomer = customers.find(
        (c) => c.name.toLowerCase() === values.customerName.trim().toLowerCase(),
      );
      const customerId = existingCustomer?.id ?? `cust-${Date.now()}`;

      if (!existingCustomer) {
        setCustomers((prev) => [
          ...prev,
          {
            id: customerId,
            name: values.customerName.trim(),
            phone: values.customerPhone.trim(),
            email: '',
            address: values.siteAddress.trim(),
          },
        ]);
      }

      const newProject: Project = {
        ...values,
        id: newProjectId,
        code: `BF-2026-${String(nextNum).padStart(2, '0')}`,
        customerId,
        progressPercent:
          values.status === 'Completed' ? 100 : values.status === 'Planning' ? 5 : 15,
        createdAt: today,
        updatedAt: today,
      };

      setProjects((prev) => [newProject, ...prev]);

      setMilestones((prev) => [
        ...prev,
        {
          id: `ms-${Date.now()}-1`,
          projectId: newProjectId,
          title: 'Site Clearing, Layout & Excavation',
          stageOrder: 1,
          plannedDate: values.startDate,
          weightPercent: 15,
          status: values.status === 'Planning' ? 'Upcoming' : 'In Progress',
        },
        {
          id: `ms-${Date.now()}-2`,
          projectId: newProjectId,
          title: 'Footing, Columns & Plinth Beam',
          stageOrder: 2,
          plannedDate: values.estimatedCompletionDate,
          weightPercent: 25,
          status: 'Upcoming',
        },
      ]);

      setPayments((prev) => [
        ...prev,
        {
          id: `pay-${Date.now()}-1`,
          projectId: newProjectId,
          customerName: values.customerName.trim(),
          invoiceNumber: `INV-2026-${155 + prev.length}`,
          stage: 'Booking & Mobilisation Advance (15%)',
          amount: Math.round(values.contractValue * 0.15),
          dueDate: values.startDate,
          status: 'Pending',
        },
      ]);

      setActivities((prev) => [
        {
          id: `act-${Date.now()}`,
          projectId: newProjectId,
          type: 'project_updated',
          title: `New project created — ${newProject.name}`,
          description: `${newProject.projectType} (${newProject.builtUpAreaSqFt.toLocaleString('en-IN')} sq.ft) assigned to ${newProject.siteManager}.`,
          date: today,
          amount: newProject.contractValue,
          actor: 'Vikram Menon',
        },
        ...prev,
      ]);

      return newProject;
    },
    [customers, projects.length],
  );

  const updateProject = useCallback(
    (
      id: string,
      values: ProjectFormValues & { progressPercent?: number },
    ): Project | undefined => {
      const today = '2026-11-25';
      let updatedProject: Project | undefined;

      setProjects((prev) =>
        prev.map((project) => {
          if (project.id !== id) return project;
          updatedProject = {
            ...project,
            ...values,
            progressPercent:
              values.progressPercent !== undefined
                ? values.progressPercent
                : values.status === 'Completed'
                ? 100
                : project.progressPercent,
            updatedAt: today,
          };
          return updatedProject;
        }),
      );

      if (updatedProject) {
        setActivities((prev) => [
          {
            id: `act-${Date.now()}`,
            projectId: id,
            type: 'project_updated',
            title: `Project updated — ${values.name}`,
            description: `Contract terms and site details updated (Status: ${values.status}).`,
            date: today,
            actor: 'Vikram Menon',
          },
          ...prev,
        ]);
      }

      return updatedProject;
    },
    [],
  );

  const assignProjectRoles = useCallback(
    (
      projectId: string,
      supervisorName: string,
      clientCredentialId?: string,
    ): ClientCredentialAccount | undefined => {
      const today = '2026-11-25';
      if (supervisorName.trim()) {
        setProjects((prev) =>
          prev.map((p) =>
            p.id === projectId
              ? { ...p, siteManager: supervisorName.trim(), updatedAt: today }
              : p,
          ),
        );
      }

      let updatedCred: ClientCredentialAccount | undefined;
      if (clientCredentialId) {
        setClientCredentials((prev) =>
          prev.map((cred) => {
            if (cred.id !== clientCredentialId) return cred;
            const nextProjects = Array.from(
              new Set([...cred.assignedProjectIds, projectId]),
            );
            updatedCred = { ...cred, assignedProjectIds: nextProjects };
            return updatedCred;
          }),
        );
      }
      return updatedCred;
    },
    [],
  );

  const markPaymentReceived = useCallback((paymentId: string) => {
    const today = '2026-11-25';
    setPayments((prev) =>
      prev.map((p) => {
        if (p.id !== paymentId) return p;
        const next: CustomerPayment = {
          ...p,
          status: 'Received',
          paidDate: today,
          mode: p.mode ?? 'NEFT / RTGS',
          referenceNo:
            p.referenceNo ?? `NEFT20261125${Math.floor(1000 + Math.random() * 9000)}`,
        };
        setActivities((acts) => [
          {
            id: `act-${Date.now()}`,
            projectId: p.projectId,
            type: 'payment_received',
            title: `Customer payment received — ${p.invoiceNumber}`,
            description: `${p.stage} marked as received from ${p.customerName}.`,
            date: today,
            amount: p.amount,
            actor: 'Accounts Desk',
          },
          ...acts,
        ]);
        return next;
      }),
    );
  }, []);

  const recordCustomerPayment = useCallback(
    (payload: {
      projectId: string;
      existingPaymentId?: string;
      stage: string;
      amount: number;
      date: string;
      mode: PaymentMode;
      referenceNo: string;
      notes?: string;
    }): CustomerPayment => {
      const proj = projects.find((p) => p.id === payload.projectId);
      const receiptNo = `RCPT-2026-${Math.floor(100 + Math.random() * 899)}`;

      if (payload.existingPaymentId) {
        let updated: CustomerPayment | undefined;
        setPayments((prev) =>
          prev.map((p) => {
            if (p.id !== payload.existingPaymentId) return p;
            updated = {
              ...p,
              status: 'Received',
              paidDate: payload.date,
              mode: payload.mode,
              referenceNo: payload.referenceNo,
              receiptNumber: receiptNo,
              notes: payload.notes,
              amount: payload.amount,
            };
            return updated;
          }),
        );
        return (
          updated ?? {
            id: payload.existingPaymentId,
            projectId: payload.projectId,
            customerName: proj?.customerName ?? 'Customer',
            invoiceNumber: `INV-2026-${Math.floor(200 + Math.random() * 700)}`,
            receiptNumber: receiptNo,
            stage: payload.stage,
            amount: payload.amount,
            dueDate: payload.date,
            paidDate: payload.date,
            mode: payload.mode,
            referenceNo: payload.referenceNo,
            notes: payload.notes,
            status: 'Received',
          }
        );
      }

      const created: CustomerPayment = {
        id: `pay-${Date.now()}`,
        projectId: payload.projectId,
        customerName: proj?.customerName ?? 'Customer',
        invoiceNumber: `INV-2026-${160 + payments.length}`,
        receiptNumber: receiptNo,
        stage: payload.stage,
        amount: payload.amount,
        dueDate: payload.date,
        paidDate: payload.date,
        mode: payload.mode,
        referenceNo: payload.referenceNo,
        notes: payload.notes,
        status: 'Received',
      };
      setPayments((prev) => [created, ...prev]);
      setActivities((prev) => [
        {
          id: `act-${Date.now()}`,
          projectId: payload.projectId,
          type: 'payment_received',
          title: `Payment recorded — ${created.invoiceNumber}`,
          description: `${payload.stage} received via ${payload.mode}.`,
          date: payload.date,
          amount: payload.amount,
          actor: 'Accounts Desk',
        },
        ...prev,
      ]);
      return created;
    },
    [projects, payments.length],
  );

  const recordExpense = useCallback(
    (payload: {
      projectId: string;
      date: string;
      category: Expense['category'];
      description: string;
      vendorName: string;
      supplierId?: string;
      amount: number;
      paidAmount: number;
      paymentMode: PaymentMode;
      paymentStatus?: Expense['paymentStatus'];
      billNumber: string;
      approvalStatus?: ExpenseApprovalStatus;
      receiptAttachmentName?: string;
    }): Expense => {
      const paymentStatus: Expense['paymentStatus'] =
        payload.paymentStatus ??
        (payload.paidAmount >= payload.amount
          ? 'Paid'
          : payload.paidAmount > 0
          ? 'Partial'
          : 'Pending');

      const created: Expense = {
        id: `exp-${Date.now()}`,
        ...payload,
        paymentStatus,
        approvalStatus: payload.approvalStatus ?? 'Pending Approval',
      };
      setExpenses((prev) => [created, ...prev]);
      setActivities((prev) => [
        {
          id: `act-${Date.now()}`,
          projectId: payload.projectId,
          type: 'expense_recorded',
          title: `Expense recorded — ${payload.vendorName}`,
          description: payload.description,
          date: payload.date,
          amount: payload.amount,
          actor: 'Site Operations',
        },
        ...prev,
      ]);
      return created;
    },
    [],
  );

  const updateExpenseApproval = useCallback(
    (expenseId: string, status: ExpenseApprovalStatus) => {
      setExpenses((prev) =>
        prev.map((e) => (e.id === expenseId ? { ...e, approvalStatus: status } : e)),
      );
    },
    [],
  );

  const toggleMilestoneStatus = useCallback((milestoneId: string) => {
    const today = '2026-11-25';
    setMilestones((prev) =>
      prev.map((m) => {
        if (m.id !== milestoneId) return m;
        if (m.status === 'Completed') {
          return {
            ...m,
            status: 'In Progress',
            actualDate: undefined,
            actualProgressPercent: 60,
          };
        }
        return {
          ...m,
          status: 'Completed',
          actualDate: today,
          actualProgressPercent: 100,
        };
      }),
    );
  }, []);

  const updateMilestoneProgress = useCallback(
    (
      milestoneId: string,
      actualProgressPercent: number,
      status: MilestoneStatus,
      notes?: string,
    ) => {
      const today = '2026-11-25';
      setMilestones((prev) =>
        prev.map((m) =>
          m.id === milestoneId
            ? {
                ...m,
                actualProgressPercent,
                status,
                actualDate: status === 'Completed' ? today : m.actualDate,
                notes: notes ?? m.notes,
              }
            : m,
        ),
      );
    },
    [],
  );

  const addProgressReport = useCallback(
    (report: Omit<SiteProgressReport, 'id'>) => {
      const id = `prg-${Date.now()}`;
      setProgressReports((prev) => [{ ...report, id }, ...prev]);

      setProjects((prev) =>
        prev.map((proj) => {
          if (proj.id !== report.projectId) return proj;
          const nextPct = Math.min(100, proj.progressPercent + report.completionDeltaPercent);
          return { ...proj, progressPercent: nextPct, updatedAt: report.reportDate };
        }),
      );

      const projName = projects.find((p) => p.id === report.projectId)?.name ?? 'Project';
      setActivities((prev) => [
        {
          id: `act-${Date.now()}`,
          projectId: report.projectId,
          type: 'progress_report',
          title: `Progress report submitted — ${projName}`,
          description: report.summary,
          date: report.reportDate,
          actor: report.submittedBy,
        },
        ...prev,
      ]);
    },
    [projects],
  );

  const createQuotation = useCallback(
    (payload: Omit<ProjectQuotation, 'id' | 'quotationNumber'>): ProjectQuotation => {
      const created: ProjectQuotation = {
        ...payload,
        id: `quo-${Date.now()}`,
        quotationNumber: `QTN-BF-2026-${String(quotations.length + 40).padStart(3, '0')}`,
      };
      setQuotations((prev) => [created, ...prev]);
      return created;
    },
    [quotations.length],
  );

  const updateQuotation = useCallback(
    (id: string, patch: Partial<ProjectQuotation>, revisionSummary?: string) => {
      setQuotations((prev) =>
        prev.map((q) => {
          if (q.id !== id) return q;
          const nextTotal = patch.totalAmount ?? q.totalAmount;
          const history = revisionSummary
            ? [
                ...(q.versionHistory ?? []),
                {
                  version: patch.version ?? q.version,
                  date: '2026-11-25',
                  author: 'Vikram Menon',
                  summary: revisionSummary,
                  totalAmount: nextTotal,
                },
              ]
            : q.versionHistory;
          return { ...q, ...patch, versionHistory: history };
        }),
      );
    },
    [],
  );

  const convertQuotationToProject = useCallback(
    (quotationId: string): Project | undefined => {
      const q = quotations.find((item) => item.id === quotationId);
      if (!q) return undefined;
      const created = createProject({
        name: q.title ?? `${q.customerName ?? 'New'} Residence`,
        customerName: q.customerName ?? 'Homeowner',
        customerPhone: q.customerPhone ?? '+91 98450 00000',
        siteAddress: q.siteAddress ?? 'Bengaluru',
        city: 'Bengaluru',
        projectType: q.projectType ?? 'Independent House',
        builtUpAreaSqFt: q.builtUpAreaSqFt ?? 2400,
        floors: q.floors ?? 2,
        contractValue: q.totalAmount,
        pricingMethod: 'Per Sq.Ft Turnkey',
        startDate: '2026-12-01',
        estimatedCompletionDate: '2027-10-31',
        status: 'Planning',
        siteManager: 'Prakash Gowda',
        notes: q.notes ?? `Converted from ${q.quotationNumber}.`,
      });
      setQuotations((prev) =>
        prev.map((item) =>
          item.id === quotationId
            ? { ...item, status: 'Converted', convertedProjectId: created.id, projectId: created.id }
            : item,
        ),
      );
      return created;
    },
    [quotations, createProject],
  );

  const addCatalogueMaterial = useCallback(
    (payload: Omit<MaterialCatalogueItem, 'id' | 'code'>) => {
      const item: MaterialCatalogueItem = {
        ...payload,
        id: `cat-${Date.now()}`,
        code: `MAT-${String(catalogueMaterials.length + 11).padStart(3, '0')}`,
      };
      setCatalogueMaterials((prev) => [...prev, item]);
    },
    [catalogueMaterials.length],
  );

  const recordStockMovement = useCallback((payload: Omit<StockMovement, 'id'>) => {
    setStockMovements((prev) => [{ ...payload, id: `sm-${Date.now()}` }, ...prev]);
  }, []);

  const createPurchaseOrder = useCallback(
    (payload: {
      supplierId: string;
      projectId: string;
      expectedDeliveryDate: string;
      items: Array<{
        materialId: string;
        materialName: string;
        unit: string;
        orderedQuantity: number;
        unitPrice: number;
      }>;
      supplierBillAttachment?: string;
      notes?: string;
    }) => {
      const sup = suppliers.find((s) => s.id === payload.supplierId);
      const totalAmount = payload.items.reduce(
        (sum, i) => sum + Math.round(i.orderedQuantity * i.unitPrice),
        0,
      );
      const po: PurchaseOrder = {
        id: `po-${Date.now()}`,
        poNumber: `PO-2026-${String(purchaseOrders.length + 87).padStart(3, '0')}`,
        supplierId: payload.supplierId,
        supplierName: sup?.name ?? 'Supplier',
        projectId: payload.projectId,
        orderDate: '2026-11-25',
        expectedDeliveryDate: payload.expectedDeliveryDate,
        status: 'Ordered',
        items: payload.items.map((item, idx) => ({
          id: `poi-${Date.now()}-${idx}`,
          ...item,
          receivedQuantity: 0,
        })),
        totalAmount,
        supplierBillAttachment: payload.supplierBillAttachment,
        notes: payload.notes,
      };
      setPurchaseOrders((prev) => [po, ...prev]);
    },
    [suppliers, purchaseOrders.length],
  );

  const recordPurchaseOrderDelivery = useCallback(
    (
      poId: string,
      receivedByItemId: Record<string, number>,
      deliveryDate: string,
      notes?: string,
    ) => {
      const targetPo = purchaseOrders.find((p) => p.id === poId);
      if (!targetPo) return;

      const updatedItems = targetPo.items.map((item) => {
        const added = Math.max(0, Number(receivedByItemId[item.id]) || 0);
        return {
          ...item,
          receivedQuantity: Math.min(item.orderedQuantity, item.receivedQuantity + added),
        };
      });

      const allDelivered = updatedItems.every((i) => i.receivedQuantity >= i.orderedQuantity);
      const anyDelivered = updatedItems.some((i) => i.receivedQuantity > 0);
      const nextStatus: PurchaseOrder['status'] = allDelivered
        ? 'Delivered'
        : anyDelivered
        ? 'Partially Delivered'
        : targetPo.status;

      setPurchaseOrders((prev) =>
        prev.map((po) =>
          po.id === poId ? { ...po, items: updatedItems, status: nextStatus } : po,
        ),
      );

      // Record Purchase Receipt stock movements for received quantities
      const newMovements: StockMovement[] = [];
      for (const item of targetPo.items) {
        const added = Math.max(0, Number(receivedByItemId[item.id]) || 0);
        if (added > 0) {
          newMovements.push({
            id: `sm-${Date.now()}-${item.id}`,
            materialId: item.materialId,
            movementType: 'Purchase Receipt',
            quantity: added,
            unit: item.unit,
            unitCost: item.unitPrice,
            date: deliveryDate,
            projectId: targetPo.projectId,
            purchaseOrderId: poId,
            notes: notes || `Received against ${targetPo.poNumber}`,
            recordedBy: 'Site Store',
          });
        }
      }
      if (newMovements.length > 0) {
        setStockMovements((prev) => [...newMovements, ...prev]);
      }
    },
    [purchaseOrders],
  );

  const recordSupplierPayment = useCallback((payload: Omit<SupplierPayment, 'id'>) => {
    setSupplierPayments((prev) => [{ ...payload, id: `sp-${Date.now()}` }, ...prev]);
    setSuppliers((prev) =>
      prev.map((s) =>
        s.id === payload.supplierId
          ? { ...s, outstandingBalance: Math.max(0, s.outstandingBalance - payload.amount) }
          : s,
      ),
    );
  }, []);

  /* ---------- Stage 9 Workforce, Role Wages, Shift Rules & Daily Attendance ---------- */

  const createWorker = useCallback(
    (payload: WorkerCreatePayload): Worker => {
      const nextCode = `WRK-${String(rawWorkers.length + 1).padStart(3, '0')}`;
      const overrideVal =
        typeof payload.individualDailySalary === 'number' && payload.individualDailySalary > 0
          ? Math.round(payload.individualDailySalary)
          : null;
      const roleCfg = roleWageConfigs.find((r) => r.role === payload.role);
      const effectiveWage =
        overrideVal ?? roleCfg?.defaultDailySalary ?? Math.round(payload.dailyWage || 0);

      const newWorker: Worker = {
        id: `wrk-${Date.now()}`,
        workerCode: nextCode,
        name: payload.name.trim(),
        phone: payload.phone.trim(),
        role: payload.role,
        dailyWage: effectiveWage,
        individualDailySalary: overrideVal,
        joinedDate: payload.joinedDate,
        assignedProjectId: payload.assignedProjectId,
        assignedProjectIds: payload.assignedProjectIds ?? [payload.assignedProjectId],
        active: payload.active ?? true,
        loginUsername:
          payload.loginUsername?.trim() ||
          `${payload.name.trim().toLowerCase().split(/\s+/)[0]}.wrk`,
        accountStatus: payload.accountStatus ?? 'Invited',
        notes: payload.notes?.trim() ?? '',
        attendanceToday: 'Present',
        daysWorkedThisMonth: 0,
        pendingWages: 0,
      };
      setRawWorkers((prev) => [newWorker, ...prev]);
      return newWorker;
    },
    [rawWorkers.length, roleWageConfigs],
  );

  const updateWorker = useCallback(
    (id: string, patch: Partial<WorkerCreatePayload>) => {
      setRawWorkers((prev) =>
        prev.map((w) => {
          if (w.id !== id) return w;
          const nextOverride =
            patch.individualDailySalary !== undefined
              ? patch.individualDailySalary && patch.individualDailySalary > 0
                ? Math.round(patch.individualDailySalary)
                : null
              : w.individualDailySalary;

          const nextRole = patch.role ?? w.role;
          const roleCfg = roleWageConfigs.find((r) => r.role === nextRole);
          const nextDailyWage =
            nextOverride ??
            roleCfg?.defaultDailySalary ??
            patch.dailyWage ??
            w.dailyWage;

          const nextAssignedProjectId = patch.assignedProjectId ?? w.assignedProjectId;

          return {
            ...w,
            ...patch,
            role: nextRole,
            individualDailySalary: nextOverride,
            dailyWage: nextDailyWage,
            assignedProjectId: nextAssignedProjectId,
            assignedProjectIds:
              patch.assignedProjectIds ??
              Array.from(new Set([...(w.assignedProjectIds ?? []), nextAssignedProjectId])),
          };
        }),
      );
    },
    [roleWageConfigs],
  );

  const toggleWorkerActive = useCallback((id: string) => {
    setRawWorkers((prev) =>
      prev.map((w) => {
        if (w.id !== id) return w;
        const nextActive = !(w.active ?? true);
        return {
          ...w,
          active: nextActive,
          accountStatus: nextActive
            ? w.accountStatus === 'Disabled'
              ? 'Active'
              : w.accountStatus
            : 'Disabled',
        };
      }),
    );
  }, []);

  const updateRoleWageConfig = useCallback(
    (role: DefaultWorkerRole, newDefaultDailySalary: number, updatedBy: string) => {
      const sanitized = Math.max(100, Math.round(newDefaultDailySalary));
      const today = '2026-11-25';
      setRoleWageConfigs((prev) =>
        prev.map((cfg) =>
          cfg.role === role
            ? {
                ...cfg,
                defaultDailySalary: sanitized,
                updatedAt: today,
                updatedBy,
              }
            : cfg,
        ),
      );
    },
    [],
  );

  const addShiftRule = useCallback((rule: Omit<ShiftRule, 'id'>): ShiftRule => {
    const created: ShiftRule = {
      ...rule,
      id: `shift-${Date.now()}`,
    };
    setShiftRules((prev) => [...prev, created]);
    return created;
  }, []);

  const updateShiftRule = useCallback(
    (id: string, patch: Partial<Omit<ShiftRule, 'id'>>) => {
      setShiftRules((prev) =>
        prev.map((r) => (r.id === id ? { ...r, ...patch } : r)),
      );
    },
    [],
  );

  const toggleShiftRuleActive = useCallback((id: string) => {
    setShiftRules((prev) =>
      prev.map((r) => (r.id === id ? { ...r, active: !r.active } : r)),
    );
  }, []);

  const upsertAttendanceEntries = useCallback(
    (entries: Array<Omit<AttendanceRecord, 'id'> & { id?: string }>) => {
      setAttendanceRecords((prev) => {
        const next = [...prev];
        for (const entry of entries) {
          const existingIndex = next.findIndex(
            (r) =>
              (entry.id && r.id === entry.id) ||
              (r.workerId === entry.workerId &&
                r.projectId === entry.projectId &&
                r.date === entry.date),
          );
          if (existingIndex >= 0) {
            next[existingIndex] = {
              ...next[existingIndex],
              ...entry,
              id: next[existingIndex].id,
            };
          } else {
            next.unshift({
              ...entry,
              id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            });
          }
        }
        return next;
      });
    },
    [],
  );

  const verifyAttendanceRecords = useCallback((recordIds: string[]) => {
    const idSet = new Set(recordIds);
    setAttendanceRecords((prev) =>
      prev.map((rec) => {
        if (!idSet.has(rec.id)) return rec;
        return {
          ...rec,
          status: rec.status === 'Pending verification' ? 'Present' : rec.status,
          submissionStatus: 'Verified',
        };
      }),
    );
  }, []);

  const recordBulkAttendance = useCallback(
    (
      projectId: string,
      date: string,
      statusInput:
        | Record<string, AttendanceStatus>
        | Array<{ workerId: string; status: AttendanceStatus }>,
    ): { created: number; updated: number } => {
      const normalRule =
        shiftRules.find((r) => r.isDefaultNormal && r.active) ?? shiftRules[0];
      const halfRule = shiftRules.find((r) => r.wageMultiplier === 0.5 && r.active);

      const pairs: Array<[string, AttendanceStatus]> = Array.isArray(statusInput)
        ? statusInput.map((item) => [item.workerId, item.status])
        : Object.entries(statusInput);

      let created = 0;
      let updated = 0;

      const entries: Array<Omit<AttendanceRecord, 'id'>> = pairs.map(
        ([workerId, status]) => {
          const exists = attendanceRecords.some(
            (r) =>
              r.workerId === workerId &&
              r.projectId === projectId &&
              r.date === date,
          );
          if (exists) updated += 1;
          else created += 1;

          const worker = workers.find((w) => w.id === workerId);
          const rate = worker?.dailyWage ?? 0;
          const isHalf = status === 'Half Day';
          const isPresent = status === 'Present' || status === 'Pending verification';
          const mult = isHalf
            ? halfRule?.wageMultiplier ?? 0.5
            : isPresent
            ? normalRule?.wageMultiplier ?? 1.0
            : 0;
          const units = isHalf
            ? halfRule?.attendanceUnits ?? 0.5
            : isPresent
            ? normalRule?.attendanceUnits ?? 1.0
            : 0;

          return {
            workerId,
            projectId,
            date,
            status,
            shiftRuleId: isHalf ? halfRule?.id : isPresent ? normalRule?.id : undefined,
            shiftName: isHalf
              ? halfRule?.name ?? 'Half Day'
              : isPresent
              ? normalRule?.name ?? 'Normal Working Day'
              : status,
            startTime: isHalf
              ? halfRule?.startTime ?? '09:00'
              : isPresent
              ? normalRule?.startTime ?? '09:00'
              : '',
            endTime: isHalf
              ? halfRule?.endTime ?? '13:30'
              : isPresent
              ? normalRule?.endTime ?? '18:00'
              : '',
            breakDurationMinutes: isPresent ? normalRule?.breakDurationMinutes ?? 60 : 0,
            attendanceUnits: units,
            wageMultiplier: mult,
            effectiveDailyRate: rate,
            calculatedWage: Math.round(rate * mult),
            submissionStatus: 'Submitted',
            submittedBy: 'Vikram Menon',
            submittedAt: `${date} 18:00`,
          };
        },
      );

      upsertAttendanceEntries(entries);
      return { created, updated };
    },
    [shiftRules, workers, attendanceRecords, upsertAttendanceEntries],
  );

  const recordWorkerAdvance = useCallback((payload: Omit<WorkerAdvance, 'id'>) => {
    setWorkerAdvances((prev) => [{ ...payload, id: `adv-${Date.now()}` }, ...prev]);
  }, []);

  const recordWagePayment = useCallback((payload: Omit<WagePayment, 'id'>) => {
    setWagePayments((prev) => [{ ...payload, id: `wp-${Date.now()}` }, ...prev]);
  }, []);

  const getWorkerWageSummary = useCallback(
    (workerId: string): ComputedWorkerWageSummary => {
      const worker = workers.find((w) => w.id === workerId) ?? workers[0];
      return computeWorkerPayrollSummary(
        worker,
        roleWageConfigs,
        attendanceRecords,
        workerAdvances,
        wagePayments,
      );
    },
    [workers, roleWageConfigs, attendanceRecords, workerAdvances, wagePayments],
  );

  const addSitePhoto = useCallback((photo: Omit<SitePhotoEntry, 'id'>) => {
    const id = `pho-${Date.now()}`;
    setSitePhotos((prev) => [{ ...photo, id }, ...prev]);
    setSiteUploads((prev) => [
      {
        id: `upl-${Date.now()}`,
        projectId: photo.projectId,
        title: photo.title,
        category: photo.category ?? 'Progress photo',
        fileName: photo.fileName,
        fileSize: '1.8 MB',
        uploadDate: photo.capturedDate,
        uploadedBy: photo.uploadedBy,
        stage: photo.stage,
        weekLabel: photo.weekLabel ?? 'Week of 23 Nov – 29 Nov 2026',
        description: photo.caption,
        clientVisible: photo.clientVisible,
        reviewStatus: photo.reviewStatus ?? 'Submitted',
      },
      ...prev,
    ]);
  }, []);

  const updateProgressReport = useCallback(
    (id: string, patch: Partial<SiteProgressReport>) => {
      setProgressReports((prev) =>
        prev.map((r) => (r.id === id ? { ...r, ...patch } : r)),
      );
    },
    [],
  );

  const reviewProgressReport = useCallback(
    (
      id: string,
      reviewStatus: ReviewStatus,
      ownerReviewNotes?: string,
      reviewedBy = 'Vikram Menon',
    ) => {
      let targetReport: SiteProgressReport | undefined;
      setProgressReports((prev) =>
        prev.map((r) => {
          if (r.id !== id) return r;
          targetReport = {
            ...r,
            reviewStatus,
            ownerReviewNotes: ownerReviewNotes ?? r.ownerReviewNotes,
            reviewedBy,
          };
          return targetReport;
        }),
      );

      if (reviewStatus === 'Reviewed' && targetReport) {
        const approved = targetReport;
        setProjects((prev) =>
          prev.map((proj) => {
            if (proj.id !== approved.projectId) return proj;
            const nextPct =
              typeof approved.progressPercent === 'number'
                ? Math.min(100, Math.max(proj.progressPercent, approved.progressPercent))
                : Math.min(100, proj.progressPercent + (approved.completionDeltaPercent || 0));
            return {
              ...proj,
              progressPercent: nextPct,
              updatedAt: '2026-11-25',
            };
          }),
        );
      }
    },
    [],
  );

  const updateMilestoneDetails = useCallback(
    (milestoneId: string, patch: Partial<ProjectMilestone>) => {
      const today = '2026-11-25';
      setMilestones((prev) =>
        prev.map((m) =>
          m.id === milestoneId
            ? {
                ...m,
                ...patch,
                actualDate:
                  patch.status === 'Completed' ? m.actualDate ?? today : m.actualDate,
              }
            : m,
        ),
      );
    },
    [],
  );

  const addSiteUpload = useCallback(
    (upload: Omit<SiteUploadRecord, 'id'>): SiteUploadRecord => {
      const created: SiteUploadRecord = {
        ...upload,
        id: `upl-${Date.now()}`,
      };
      setSiteUploads((prev) => [created, ...prev]);

      if (
        upload.category === 'Progress photo' ||
        upload.category === 'Site issue photo'
      ) {
        setSitePhotos((prev) => [
          {
            id: `pho-${Date.now()}`,
            projectId: upload.projectId,
            title: upload.title,
            stage: upload.stage,
            weekLabel: upload.weekLabel,
            capturedDate: upload.uploadDate,
            uploadedBy: upload.uploadedBy,
            caption: upload.description,
            fileName: upload.fileName,
            clientVisible: upload.clientVisible,
            category: upload.category,
            reviewStatus: upload.reviewStatus,
          },
          ...prev,
        ]);
      }
      return created;
    },
    [],
  );

  const updateSiteUpload = useCallback(
    (id: string, patch: Partial<SiteUploadRecord>) => {
      setSiteUploads((prev) =>
        prev.map((u) => (u.id === id ? { ...u, ...patch } : u)),
      );
    },
    [],
  );

  const reviewSiteUpload = useCallback(
    (
      id: string,
      reviewStatus: ReviewStatus,
      reviewNotes?: string,
      reviewedBy = 'Vikram Menon',
    ) => {
      let targetUpload: SiteUploadRecord | undefined;
      setSiteUploads((prev) =>
        prev.map((u) => {
          if (u.id !== id) return u;
          targetUpload = {
            ...u,
            reviewStatus,
            reviewNotes: reviewNotes ?? u.reviewNotes,
            reviewedBy,
          };
          return targetUpload;
        }),
      );

      if (targetUpload) {
        const reviewed = targetUpload;
        setSitePhotos((prev) =>
          prev.map((p) =>
            p.projectId === reviewed.projectId && p.fileName === reviewed.fileName
              ? { ...p, reviewStatus }
              : p,
          ),
        );

        if (
          reviewStatus === 'Reviewed' &&
          reviewed.category !== 'Progress photo' &&
          reviewed.category !== 'Site issue photo'
        ) {
          setDocuments((prev) => {
            const exists = prev.some(
              (d) => d.projectId === reviewed.projectId && d.title === reviewed.title,
            );
            if (exists) return prev;
            const docCategory: ProjectDocument['category'] =
              reviewed.category === 'Bill' || reviewed.category === 'Receipt'
                ? 'Invoice'
                : 'Other';
            return [
              {
                id: `doc-upl-${reviewed.id}`,
                projectId: reviewed.projectId,
                title: reviewed.title,
                category: docCategory,
                fileName: reviewed.fileName,
                version: 'v1.0',
                uploadedDate: reviewed.uploadDate,
                fileSize: reviewed.fileSize,
                uploadedBy: reviewed.uploadedBy,
              },
              ...prev,
            ];
          });
        }
      }
    },
    [],
  );

  const addSiteIssue = useCallback(
    (issue: Omit<SiteIssueRecord, 'id'>): SiteIssueRecord => {
      const created: SiteIssueRecord = {
        ...issue,
        id: `iss-${Date.now()}`,
      };
      setSiteIssues((prev) => [created, ...prev]);
      return created;
    },
    [],
  );

  const updateSiteIssueStatus = useCallback(
    (id: string, status: SiteIssueRecord['status']) => {
      setSiteIssues((prev) =>
        prev.map((iss) => (iss.id === id ? { ...iss, status } : iss)),
      );
    },
    [],
  );

  const createClientCredential = useCallback(
    (
      payload: Omit<ClientCredentialAccount, 'id' | 'createdAt'>,
    ): ClientCredentialAccount => {
      const created: ClientCredentialAccount = {
        ...payload,
        id: `cred-${Date.now()}`,
        createdAt: '2026-11-25',
      };
      setClientCredentials((prev) => [created, ...prev]);
      return created;
    },
    [],
  );

  const updateClientCredential = useCallback(
    (id: string, patch: Partial<ClientCredentialAccount>) => {
      setClientCredentials((prev) =>
        prev.map((c) => (c.id === id ? { ...c, ...patch } : c)),
      );
    },
    [],
  );

  const value = useMemo<BuildFlowContextValue>(
    () => ({
      projects,
      customers,
      payments,
      expenses,
      materials,
      materialStock: materials,
      deliveries,
      suppliers,
      workers,
      milestones,
      quotations,
      progressReports,
      documents,
      activities,
      catalogueMaterials,
      computedCatalogueStock,
      stockMovements,
      purchaseOrders,
      supplierPayments,
      supplierRates,
      attendanceRecords,
      workerAdvances,
      wagePayments,
      roleWageConfigs,
      shiftRules,
      sitePhotos,
      siteUploads,
      siteIssues,
      clientVariations,
      clientCredentials,
      getProjectById,
      getProjectFinancials,
      createProject,
      updateProject,
      assignProjectRoles,
      markPaymentReceived,
      toggleMilestoneStatus,
      addProgressReport,
      submitProgressReport: addProgressReport,
      updateProgressReport,
      reviewProgressReport,
      updateMilestoneProgress,
      updateMilestoneDetails,
      recordCustomerPayment,
      recordExpense,
      updateExpenseApproval,
      createQuotation,
      updateQuotation,
      convertQuotationToProject,
      addCatalogueMaterial,
      recordStockMovement,
      createPurchaseOrder,
      recordPurchaseOrderDelivery,
      recordSupplierPayment,
      createWorker,
      updateWorker,
      toggleWorkerActive,
      updateRoleWageConfig,
      addShiftRule,
      updateShiftRule,
      toggleShiftRuleActive,
      upsertAttendanceEntries,
      verifyAttendanceRecords,
      recordBulkAttendance,
      recordWorkerAdvance,
      recordWagePayment,
      getWorkerWageSummary,
      addSitePhoto,
      addSiteUpload,
      updateSiteUpload,
      reviewSiteUpload,
      addSiteIssue,
      updateSiteIssueStatus,
      createClientCredential,
      updateClientCredential,
    }),
    [
      projects,
      customers,
      payments,
      expenses,
      materials,
      deliveries,
      suppliers,
      workers,
      milestones,
      quotations,
      progressReports,
      documents,
      activities,
      catalogueMaterials,
      computedCatalogueStock,
      stockMovements,
      purchaseOrders,
      supplierPayments,
      supplierRates,
      attendanceRecords,
      workerAdvances,
      wagePayments,
      roleWageConfigs,
      shiftRules,
      sitePhotos,
      siteUploads,
      siteIssues,
      clientVariations,
      clientCredentials,
      getProjectById,
      getProjectFinancials,
      createProject,
      updateProject,
      assignProjectRoles,
      markPaymentReceived,
      toggleMilestoneStatus,
      addProgressReport,
      updateProgressReport,
      reviewProgressReport,
      updateMilestoneProgress,
      updateMilestoneDetails,
      recordCustomerPayment,
      recordExpense,
      updateExpenseApproval,
      createQuotation,
      updateQuotation,
      convertQuotationToProject,
      addCatalogueMaterial,
      recordStockMovement,
      createPurchaseOrder,
      recordPurchaseOrderDelivery,
      recordSupplierPayment,
      createWorker,
      updateWorker,
      toggleWorkerActive,
      updateRoleWageConfig,
      addShiftRule,
      updateShiftRule,
      toggleShiftRuleActive,
      upsertAttendanceEntries,
      verifyAttendanceRecords,
      recordBulkAttendance,
      recordWorkerAdvance,
      recordWagePayment,
      getWorkerWageSummary,
      addSitePhoto,
      addSiteUpload,
      updateSiteUpload,
      reviewSiteUpload,
      addSiteIssue,
      updateSiteIssueStatus,
      createClientCredential,
      updateClientCredential,
    ],
  );

  return (
    <BuildFlowContext.Provider value={value}>
      {children}
    </BuildFlowContext.Provider>
  );
}

export function useBuildFlow() {
  const ctx = useContext(BuildFlowContext);
  if (!ctx) {
    throw new Error('useBuildFlow must be used inside BuildFlowProvider');
  }
  return ctx;
}
