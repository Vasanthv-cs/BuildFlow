export type ProjectStatus =
  | 'Planning'
  | 'In Progress'
  | 'On Hold'
  | 'Completed';

export type ProjectType =
  | 'Independent House'
  | 'Duplex Villa'
  | 'G+2 Residence'
  | 'Renovation & Extension'
  | 'Farmhouse Residence';

export type PricingMethod =
  | 'Per Sq.Ft Turnkey'
  | 'Fixed Lump Sum'
  | 'Labour Contract + Material'
  | 'Cost Plus Percentage';

/* ---------- Auth & Role-Based Frontend Experience ---------- */
export type AppRole = 'owner' | 'supervisor' | 'worker' | 'client';

export interface AuthUser {
  id: string;
  username: string;
  fullName: string;
  email: string;
  phone: string;
  role: AppRole;
  title: string;
  initials: string;
  /** Projects this user is allowed to view/manage (for supervisor / client / worker) */
  assignedProjectIds: string[];
  /** Linked worker entity id when role === 'worker' */
  linkedWorkerId?: string;
  /** Linked customer entity id when role === 'client' */
  linkedCustomerId?: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  gstNumber?: string;
}

export interface Project {
  id: string;
  code: string;
  name: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  siteAddress: string;
  city: string;
  projectType: ProjectType;
  builtUpAreaSqFt: number;
  floors: number;
  contractValue: number;
  pricingMethod: PricingMethod;
  startDate: string; // YYYY-MM-DD
  estimatedCompletionDate: string; // YYYY-MM-DD
  status: ProjectStatus;
  siteManager: string;
  progressPercent: number;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export type ProjectFormValues = Omit<
  Project,
  'id' | 'code' | 'customerId' | 'progressPercent' | 'createdAt' | 'updatedAt'
>;

export type PaymentStatus = 'Received' | 'Pending' | 'Overdue';
export type PaymentMode =
  | 'Bank Transfer'
  | 'NEFT / RTGS'
  | 'UPI'
  | 'Cheque'
  | 'Cash'
  | 'Other';

export interface CustomerPayment {
  id: string;
  projectId: string;
  customerName: string;
  invoiceNumber: string;
  receiptNumber?: string;
  stage: string;
  amount: number;
  dueDate: string;
  paidDate?: string;
  mode?: PaymentMode;
  referenceNo?: string;
  notes?: string;
  status: PaymentStatus;
}

export type ExpenseCategory =
  | 'Materials'
  | 'Labour Wages'
  | 'Subcontractor'
  | 'Equipment & Shuttering'
  | 'Transport & Unloading'
  | 'Site Utilities & Approvals';

export type BillPaymentStatus = 'Paid' | 'Pending' | 'Partial';
export type ExpenseApprovalStatus = 'Approved' | 'Pending Approval' | 'Rejected';

export interface Expense {
  id: string;
  projectId: string;
  date: string;
  category: ExpenseCategory;
  description: string;
  vendorName: string;
  supplierId?: string;
  amount: number;
  paidAmount: number;
  paymentMode: PaymentMode;
  paymentStatus: BillPaymentStatus;
  approvalStatus?: ExpenseApprovalStatus;
  receiptAttachmentName?: string;
  billNumber: string;
}

export type MaterialCategory =
  | 'Cement'
  | 'Steel & TMT'
  | 'Aggregates & Sand'
  | 'Bricks & Blocks'
  | 'Plumbing & Sanitary'
  | 'Electrical'
  | 'Flooring & Paint';

export interface MaterialCatalogueItem {
  id: string;
  code: string;
  name: string;
  category: MaterialCategory;
  unit: string;
  defaultSupplierId: string;
  minimumStock: number;
  reorderPoint: number;
  standardUnitCost: number;
}

export type StockMovementType =
  | 'Purchase Receipt'
  | 'Material Issue to Project'
  | 'Material Return'
  | 'Stock Adjustment'
  | 'Transfer Between Projects'
  | 'Damaged or Wasted';

export interface StockMovement {
  id: string;
  materialId: string;
  movementType: StockMovementType;
  quantity: number;
  unit: string;
  unitCost?: number;
  date: string;
  projectId?: string;
  targetProjectId?: string;
  purchaseOrderId?: string;
  notes: string;
  recordedBy: string;
}

export interface MaterialStock {
  id: string;
  projectId: string;
  name: string;
  category: MaterialCategory;
  unit: string;
  currentStock: number;
  reorderLevel: number;
  unitPrice: number;
  lastUpdated: string;
  preferredSupplierId: string;
}

export type DeliveryStatus = 'Scheduled' | 'In Transit' | 'Delivered' | 'Delayed';

export interface MaterialDelivery {
  id: string;
  projectId: string;
  supplierId: string;
  supplierName: string;
  materialName: string;
  quantity: number;
  unit: string;
  totalAmount: number;
  orderDate: string;
  expectedDate: string;
  status: DeliveryStatus;
}

export type PurchaseOrderStatus =
  | 'Draft'
  | 'Ordered'
  | 'Partially Delivered'
  | 'Delivered'
  | 'Cancelled';

export interface PurchaseOrderItem {
  id: string;
  materialId: string;
  materialName: string;
  unit: string;
  orderedQuantity: number;
  receivedQuantity: number;
  unitPrice: number;
}

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  supplierId: string;
  supplierName: string;
  projectId: string;
  orderDate: string;
  expectedDeliveryDate: string;
  status: PurchaseOrderStatus;
  items: PurchaseOrderItem[];
  totalAmount: number;
  supplierBillAttachment?: string;
  notes?: string;
}

export interface SupplierMaterialRate {
  id: string;
  supplierId: string;
  materialId: string;
  unitPrice: number;
  leadTimeDays: number;
  lastQuotedDate: string;
}

export interface SupplierPayment {
  id: string;
  supplierId: string;
  projectId?: string;
  billNumber: string;
  amount: number;
  date: string;
  mode: PaymentMode;
  referenceNo: string;
  notes?: string;
}

export interface Supplier {
  id: string;
  name: string;
  category: MaterialCategory;
  categories?: MaterialCategory[];
  contactPerson: string;
  phone: string;
  email?: string;
  city: string;
  address?: string;
  gstNumber: string;
  paymentTerms?: string;
  outstandingBalance: number;
  dueDate?: string;
  totalSupplied: number;
}

/* ---------- Workforce, Wage Configuration & Shift Rules ---------- */

/** Core standardized daily-wage worker roles configured by Owner */
export type DefaultWorkerRole =
  | 'Mason / Masteri'
  | 'Lady Helper'
  | 'Helper'
  | 'Super Mason';

/** Includes legacy trade roles for backward compatibility */
export type WorkerRole =
  | DefaultWorkerRole
  | 'Site Engineer'
  | 'Head Mason'
  | 'Mason'
  | 'Bar Bender'
  | 'Carpenter (Shuttering)'
  | 'Electrician'
  | 'Plumber'
  | 'Tile Layer'
  | 'Painter'
  | 'Site Helper';

export type WorkerAccountStatus = 'Active' | 'Invited' | 'Disabled';

export interface RoleWageConfig {
  id: string;
  role: DefaultWorkerRole;
  defaultDailySalary: number;
  description: string;
  updatedAt: string;
  updatedBy: string;
}

export interface ShiftRule {
  id: string;
  name: string;
  code: string;
  startTime: string; // HH:mm (24h, e.g. '09:00')
  endTime: string; // HH:mm (24h, e.g. '18:00')
  breakDurationMinutes: number;
  attendanceUnits: number; // e.g. 1.0, 1.5, 0.5
  wageMultiplier: number; // e.g. 1.0, 1.5, 0.5
  isDefaultNormal?: boolean;
  active: boolean;
  description?: string;
}

export type AttendanceStatus =
  | 'Present'
  | 'Half Day'
  | 'Absent'
  | 'Leave'
  | 'Pending verification';

export type AttendanceSubmissionStatus = 'Draft' | 'Submitted' | 'Verified';

export interface Worker {
  id: string;
  workerCode?: string; // e.g. WRK-001
  name: string;
  role: WorkerRole;
  phone: string;
  /** Effective daily wage (resolved from individualDailySalary or role default) */
  dailyWage: number;
  /** When defined and > 0, overrides the role's default daily salary */
  individualDailySalary?: number | null;
  assignedProjectId: string;
  assignedProjectIds?: string[];
  active?: boolean;
  loginUsername?: string;
  accountStatus?: WorkerAccountStatus;
  notes?: string;
  attendanceToday: AttendanceStatus;
  daysWorkedThisMonth: number;
  pendingWages: number;
  joinedDate: string;
}

export interface AttendanceRecord {
  id: string;
  workerId: string;
  projectId: string;
  date: string; // YYYY-MM-DD
  status: AttendanceStatus;
  shiftRuleId?: string;
  shiftName?: string;
  startTime?: string; // HH:mm
  endTime?: string; // HH:mm
  breakDurationMinutes?: number;
  attendanceUnits?: number; // 1.0, 1.5, 0.5, 0
  wageMultiplier?: number; // 1.0, 1.5, 0.5, 0
  additionalWageUnits?: number;
  effectiveDailyRate?: number;
  calculatedWage?: number;
  submissionStatus?: AttendanceSubmissionStatus;
  submittedBy?: string;
  submittedAt?: string;
  notes?: string;
}

export interface WorkerAdvance {
  id: string;
  workerId: string;
  projectId: string;
  date: string;
  amount: number;
  approvedDeduction: boolean;
  reason: string;
}

export interface WagePayment {
  id: string;
  workerId: string;
  projectId: string;
  date: string;
  amount: number;
  mode: PaymentMode;
  referenceNo: string;
  periodLabel: string;
  notes?: string;
}

export type ReviewStatus =
  | 'Draft'
  | 'Submitted'
  | 'Reviewed'
  | 'Needs correction';

export type SiteUploadCategory =
  | 'Progress photo'
  | 'Bill'
  | 'Receipt'
  | 'Material delivery document'
  | 'Site issue photo';

export interface SiteUploadRecord {
  id: string;
  projectId: string;
  title: string;
  category: SiteUploadCategory;
  fileName: string;
  fileSize: string;
  uploadDate: string;
  uploadedBy: string;
  stage: string;
  weekLabel?: string;
  amount?: number;
  billAmount?: number;
  vendorName?: string;
  billNumber?: string;
  description: string;
  clientVisible: boolean;
  reviewStatus: ReviewStatus;
  reviewNotes?: string;
  reviewedBy?: string;
}

export interface SiteIssueRecord {
  id: string;
  projectId: string;
  title: string;
  severity: 'Low' | 'Medium' | 'High';
  status: 'Open' | 'In Review' | 'Resolved';
  reportedDate: string;
  reportedBy: string;
  stage: string;
  description: string;
  delayDaysImpact?: number;
}

export interface ClientVariationItem {
  id: string;
  projectId: string;
  referenceCode: string;
  title: string;
  description: string;
  approvedDate: string;
  amount: number;
  status: 'Approved' | 'Pending';
}

export interface ClientCredentialAccount {
  id: string;
  customerId: string;
  customerName: string;
  username: string;
  email: string;
  phone: string;
  assignedProjectIds: string[];
  accountStatus: 'Active' | 'Invited' | 'Disabled';
  createdAt: string;
  lastLoginAt?: string;
  notes?: string;
}

export interface SitePhotoEntry {
  id: string;
  projectId: string;
  title: string;
  stage: string;
  weekLabel?: string;
  capturedDate: string;
  uploadedBy: string;
  caption: string;
  fileName: string;
  clientVisible: boolean;
  category?: SiteUploadCategory;
  reviewStatus?: ReviewStatus;
  reviewNotes?: string;
}

export type MilestoneStatus = 'Completed' | 'In Progress' | 'Delayed' | 'Upcoming';

export type StandardMilestoneStage =
  | 'Foundation'
  | 'Brickwork'
  | 'Roof slab'
  | 'Plumbing and electrical'
  | 'Plastering'
  | 'Flooring'
  | 'Painting'
  | 'Final handover';

export interface ProjectMilestone {
  id: string;
  projectId: string;
  title: string;
  stageCategory?: StandardMilestoneStage;
  stageOrder: number;
  plannedDate: string;
  actualDate?: string;
  plannedProgressPercent?: number;
  actualProgressPercent?: number;
  weightPercent: number;
  status: MilestoneStatus;
  completedWorkDescription?: string;
  remainingWorkDescription?: string;
  expectedNextActivity?: string;
  notes?: string;
}

export type QuotationStatus = 'Draft' | 'Sent' | 'Approved' | 'Revised' | 'Converted';

export interface QuotationItem {
  id: string;
  workPackage: string;
  specification: string;
  quantity: number;
  unit: string;
  rate: number;
  amount: number;
}

export interface QuotationMilestone {
  id: string;
  stage: string;
  percentage: number;
  amount: number;
}

export interface QuotationVersionEntry {
  version: string;
  date: string;
  author: string;
  summary: string;
  totalAmount: number;
}

export interface ProjectQuotation {
  id: string;
  projectId: string;
  convertedProjectId?: string;
  quotationNumber: string;
  title?: string;
  customerName?: string;
  customerPhone?: string;
  siteAddress?: string;
  projectType?: ProjectType;
  builtUpAreaSqFt?: number;
  floors?: number;
  version: string;
  issuedDate: string;
  validUntil: string;
  status: QuotationStatus;
  subtotal?: number;
  discountType?: 'amount' | 'percent';
  discountValue?: number;
  taxPercent?: number;
  taxAmount?: number;
  totalAmount: number;
  items: QuotationItem[];
  includedWork?: string[];
  excludedWork?: string[];
  paymentMilestones?: QuotationMilestone[];
  versionHistory?: QuotationVersionEntry[];
  notes?: string;
}

export interface SiteProgressReport {
  id: string;
  projectId: string;
  reportDate: string;
  weekLabel?: string;
  weekStartDate?: string;
  weekEndDate?: string;
  submittedBy: string;
  stage: string;
  summary: string;
  workCompleted?: string;
  workRemaining?: string;
  workPlanned?: string;
  materialsUsed?: string;
  problemsOrDelays?: string;
  safetyOrQualityObservations?: string;
  nextDayPlan?: string;
  notesForOwner?: string;
  clientVisibleSummary?: string;
  progressPercent?: number;
  reviewStatus?: ReviewStatus;
  ownerReviewNotes?: string;
  reviewedBy?: string;
  photoPlaceholders?: string[];
  attachedPhotoIds?: string[];
  attachedDocumentIds?: string[];
  workersOnSite: number;
  weather: 'Clear' | 'Partly Cloudy' | 'Light Rain';
  completionDeltaPercent: number;
}

export type DocumentCategory =
  | 'Architectural Drawing'
  | 'Structural Drawing'
  | 'Contract Agreement'
  | 'Municipal Permit'
  | 'BOQ & Estimate'
  | 'Soil Test Report'
  | 'Invoice'
  | 'Other';

export interface ProjectDocument {
  id: string;
  projectId: string;
  title: string;
  category: DocumentCategory;
  fileName: string;
  fileSize: string;
  uploadedBy: string;
  uploadedDate: string;
  version: string;
  milestoneStage?: string;
  weekLabel?: string;
}

export type ActivityType =
  | 'payment_received'
  | 'material_purchase'
  | 'expense_recorded'
  | 'progress_report'
  | 'project_updated';

export interface ActivityEvent {
  id: string;
  projectId: string;
  type: ActivityType;
  title: string;
  description: string;
  date: string;
  amount?: number;
  actor: string;
}

export type DateRangeFilter = 'all' | '30d' | '90d' | '180d';
