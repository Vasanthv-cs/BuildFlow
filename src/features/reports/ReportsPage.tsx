import React, { useMemo, useState } from 'react';
import {
  Building2,
  Calculator,
  Calendar,
  CheckCircle2,
  Clock,
  CreditCard,
  Download,
  FileSpreadsheet,
  FileText,
  Filter,
  HardHat,
  IndianRupee,
  Layers,
  Package,
  Printer,
  Receipt,
  Search,
  TrendingDown,
  TrendingUp,
  Truck,
  Users,
} from 'lucide-react';
import { PageContainer, PageHeader } from '@/src/components/layout/PageContainer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';
import { Badge, getProjectStatusVariant } from '@/src/components/ui/badge';
import { Input, Label } from '@/src/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/src/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/src/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/src/components/ui/table';
import { useBuildFlow } from '@/src/context/BuildFlowContext';
import {
  calculateScheduleWageTally,
  calculateShiftExamplesForDailyWage,
} from '@/src/lib/wageCalculations';
import { formatIndianDate, formatINR, exportToCsv } from '@/src/lib/utils';

export function ReportsPage() {
  const {
    projects,
    workers,
    progressReports,
    payments,
    expenses,
    customers,
    catalogueMaterials,
    computedCatalogueStock,
    stockMovements,
    purchaseOrders,
    supplierPayments,
    suppliers,
    milestones,
    getProjectFinancials,
    getWorkerWageSummary,
  } = useBuildFlow();

  const [activeTab, setActiveTab] = useState<string>('financial_summary');
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // ── 1. Financial Summary Report ───────────────────────────────────────────
  const financialSummaryRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return projects
      .filter((p) => {
        if (projectFilter !== 'all' && p.id !== projectFilter) return false;
        if (q) {
          const hay = [p.name, p.code, p.customerName, p.siteManager, p.city].join(' ').toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      })
      .map((project) => {
        const fin = getProjectFinancials(project.id);
        const marginPercent = fin.contractValue > 0 ? (fin.projectedMargin / fin.contractValue) * 100 : 0;
        return {
          project,
          fin,
          marginPercent,
        };
      });
  }, [projects, projectFilter, searchQuery, getProjectFinancials]);

  // ── 2. Income & Expenses Ledger ───────────────────────────────────────────
  const incomeExpensesRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const incomeItems = payments.map((p) => ({
      id: `inc-${p.id}`,
      date: p.paidDate || p.dueDate,
      type: 'Income' as const,
      category: 'Client Collection',
      projectId: p.projectId,
      reference: p.referenceNo || p.receiptNumber || p.invoiceNumber,
      description: `Payment from ${p.customerName} (${p.mode || 'Direct Transfer'})`,
      amount: p.amount,
      status: p.status,
    }));

    const expenseItems = expenses.map((e) => ({
      id: `exp-${e.id}`,
      date: e.date,
      type: 'Expense' as const,
      category: e.category,
      projectId: e.projectId,
      reference: e.billNumber || e.id,
      description: `${e.description} (${e.vendorName})`,
      amount: e.amount,
      status: e.paymentStatus,
    }));

    const combined = [...incomeItems, ...expenseItems];

    return combined
      .filter((item) => {
        if (projectFilter !== 'all' && item.projectId !== projectFilter) return false;
        if (dateFrom && item.date < dateFrom) return false;
        if (dateTo && item.date > dateTo) return false;
        if (q) {
          const hay = [item.category, item.description, item.reference].join(' ').toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [payments, expenses, projectFilter, dateFrom, dateTo, searchQuery]);

  // ── 3. Customer Outstanding Dues ──────────────────────────────────────────
  const customerOutstandingRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return projects
      .filter((p) => {
        if (projectFilter !== 'all' && p.id !== projectFilter) return false;
        if (q) {
          const hay = [p.name, p.customerName, p.code].join(' ').toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      })
      .map((p) => {
        const fin = getProjectFinancials(p.id);
        const pending = Math.max(0, fin.contractValue - fin.amountReceived);
        const percentCollected = fin.contractValue > 0 ? (fin.amountReceived / fin.contractValue) * 100 : 0;
        return {
          projectId: p.id,
          projectName: p.name,
          customerName: p.customerName,
          contractValue: fin.contractValue,
          amountReceived: fin.amountReceived,
          outstandingBalance: pending,
          percentCollected,
          status: pending === 0 ? 'Fully Paid' : percentCollected > 50 ? 'Partially Paid' : 'Pending',
        };
      });
  }, [projects, projectFilter, searchQuery, getProjectFinancials]);

  // ── 4. Supplier Outstanding Payables ──────────────────────────────────────
  const supplierOutstandingRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return suppliers
      .filter((s) => {
        if (q) {
          const hay = [s.name, s.category, s.contactPerson].join(' ').toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      })
      .map((supplier) => {
        const orders = purchaseOrders.filter((po) => po.supplierId === supplier.id);
        const paymentsMade = supplierPayments
          .filter((sp) => sp.supplierId === supplier.id)
          .reduce((sum, sp) => sum + sp.amount, 0);

        const totalBilled = orders.reduce((sum, po) => sum + po.totalAmount, 0) || supplier.outstandingBalance + paymentsMade;
        const balanceDue = Math.max(0, totalBilled - paymentsMade);

        return {
          supplier,
          totalBilled,
          paymentsMade,
          balanceDue,
          ordersCount: orders.length,
        };
      });
  }, [suppliers, purchaseOrders, supplierPayments, searchQuery]);

  // ── 5. Worker Wage Report ─────────────────────────────────────────────────
  const workerWageRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return workers
      .filter((w) => {
        if (projectFilter !== 'all' && w.assignedProjectId !== projectFilter) return false;
        if (q) {
          const hay = [w.name, w.workerCode ?? '', w.role, w.phone].join(' ').toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      })
      .map((w) => getWorkerWageSummary(w.id));
  }, [workers, projectFilter, searchQuery, getWorkerWageSummary]);

  // ── 6. Material Stock Report ──────────────────────────────────────────────
  const materialStockRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return computedCatalogueStock.filter((item) => {
      if (q) {
        const hay = [item.material.name, item.material.category, item.material.code].join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [computedCatalogueStock, searchQuery]);

  // ── 7. Material Consumption ───────────────────────────────────────────────
  const materialConsumptionRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return stockMovements
      .filter((m) => {
        if (m.movementType !== 'Material Issue to Project') return false;
        if (projectFilter !== 'all' && m.projectId !== projectFilter) return false;
        if (dateFrom && m.date < dateFrom) return false;
        if (dateTo && m.date > dateTo) return false;
        const mat = catalogueMaterials.find((c) => c.id === m.materialId);
        if (q) {
          const hay = [mat?.name ?? '', m.notes ?? ''].join(' ').toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      })
      .map((m) => {
        const mat = catalogueMaterials.find((c) => c.id === m.materialId);
        return {
          ...m,
          materialName: mat?.name ?? 'Material Item',
        };
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [stockMovements, catalogueMaterials, projectFilter, dateFrom, dateTo, searchQuery]);

  // ── 8. Budget vs Actual Expenses ──────────────────────────────────────────
  const budgetVsActualRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return projects
      .filter((p) => {
        if (projectFilter !== 'all' && p.id !== projectFilter) return false;
        if (q) {
          const hay = [p.name, p.code, p.customerName].join(' ').toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      })
      .map((p) => {
        const fin = getProjectFinancials(p.id);
        const budgetedCost = Math.round(fin.contractValue * 0.75); // Standard 75% budget baseline
        const actualCost = fin.recordedExpenses;
        const variance = budgetedCost - actualCost;
        const isOverBudget = variance < 0;

        return {
          project: p,
          budgetedCost,
          actualCost,
          variance,
          isOverBudget,
          spendPercent: budgetedCost > 0 ? (actualCost / budgetedCost) * 100 : 0,
        };
      });
  }, [projects, projectFilter, searchQuery, getProjectFinancials]);

  // ── 9. Construction Progress ──────────────────────────────────────────────
  const constructionProgressRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return milestones
      .filter((m) => {
        if (projectFilter !== 'all' && m.projectId !== projectFilter) return false;
        if (q) {
          const hay = [m.title, m.stageCategory, m.status].join(' ').toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => a.stageOrder - b.stageOrder);
  }, [milestones, projectFilter, searchQuery]);

  // ── 10. Monthly Cash Flow ─────────────────────────────────────────────────
  const monthlyCashFlowSummary = useMemo(() => {
    const totalInflow = payments.reduce((sum, p) => sum + p.amount, 0);
    const totalSiteExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
    const totalSupplierPayouts = supplierPayments.reduce((sum, sp) => sum + sp.amount, 0);
    const totalWages = workerWageRows.reduce((sum, w) => sum + w.netPayable, 0);
    const totalOutflow = totalSiteExpenses + totalSupplierPayouts + totalWages;
    const netCashFlow = totalInflow - totalOutflow;

    return {
      totalInflow,
      totalSiteExpenses,
      totalSupplierPayouts,
      totalWages,
      totalOutflow,
      netCashFlow,
    };
  }, [payments, expenses, supplierPayments, workerWageRows]);

  // Global KPI totals
  const globalTotals = useMemo(() => {
    const contractTotal = financialSummaryRows.reduce((s, r) => s + r.fin.contractValue, 0);
    const receivedTotal = financialSummaryRows.reduce((s, r) => s + r.fin.amountReceived, 0);
    const expensesTotal = financialSummaryRows.reduce((s, r) => s + r.fin.recordedExpenses, 0);
    const pendingClientDues = customerOutstandingRows.reduce((s, r) => s + r.outstandingBalance, 0);
    const pendingSupplierPayables = supplierOutstandingRows.reduce((s, r) => s + r.balanceDue, 0);
    const totalWagePayroll = workerWageRows.reduce((s, r) => s + r.netPayable, 0);

    return {
      contractTotal,
      receivedTotal,
      expensesTotal,
      pendingClientDues,
      pendingSupplierPayables,
      totalWagePayroll,
    };
  }, [financialSummaryRows, customerOutstandingRows, supplierOutstandingRows, workerWageRows]);

  // ── CSV Export Handler ────────────────────────────────────────────────────
  const handleExportCsv = () => {
    const timestamp = new Date().toISOString().split('T')[0];

    switch (activeTab) {
      case 'financial_summary':
        exportToCsv(
          `BuildFlow_Project_Financial_Summary_${timestamp}`,
          ['Project Name', 'Project Code', 'Customer', 'Supervisor', 'Contract Value (INR)', 'Received (INR)', 'Expenses (INR)', 'Projected Margin (INR)', 'Margin %', 'Status'],
          financialSummaryRows.map((r) => [
            r.project.name,
            r.project.code,
            r.project.customerName,
            r.project.siteManager,
            r.fin.contractValue,
            r.fin.amountReceived,
            r.fin.recordedExpenses,
            r.fin.projectedMargin,
            r.marginPercent.toFixed(1),
            r.project.status,
          ]),
        );
        break;

      case 'income_expenses':
        exportToCsv(
          `BuildFlow_Income_and_Expenses_${timestamp}`,
          ['Date', 'Type', 'Category', 'Project ID', 'Reference', 'Description', 'Amount (INR)', 'Status'],
          incomeExpensesRows.map((r) => [
            r.date,
            r.type,
            r.category,
            r.projectId,
            r.reference,
            r.description,
            r.amount,
            r.status,
          ]),
        );
        break;

      case 'customer_outstanding':
        exportToCsv(
          `BuildFlow_Customer_Outstanding_${timestamp}`,
          ['Project Name', 'Customer Name', 'Contract Value (INR)', 'Amount Received (INR)', 'Outstanding Dues (INR)', 'Collection %', 'Status'],
          customerOutstandingRows.map((r) => [
            r.projectName,
            r.customerName,
            r.contractValue,
            r.amountReceived,
            r.outstandingBalance,
            r.percentCollected.toFixed(1),
            r.status,
          ]),
        );
        break;

      case 'supplier_outstanding':
        exportToCsv(
          `BuildFlow_Supplier_Outstanding_${timestamp}`,
          ['Supplier Name', 'Category', 'Contact Person', 'Phone', 'Total Billed (INR)', 'Payments Made (INR)', 'Balance Due (INR)'],
          supplierOutstandingRows.map((r) => [
            r.supplier.name,
            r.supplier.category,
            r.supplier.contactPerson,
            r.supplier.phone,
            r.totalBilled,
            r.paymentsMade,
            r.balanceDue,
          ]),
        );
        break;

      case 'worker_wages':
        exportToCsv(
          `BuildFlow_Worker_Wage_Register_${timestamp}`,
          ['Worker Name', 'Role', 'Daily Wage (INR)', 'Present Days', 'Half Days', 'Overtime Days', 'Gross Wage (INR)', 'Advances (INR)', 'Net Payable (INR)'],
          workerWageRows.map((w) => [
            w.worker.name,
            w.worker.role,
            w.worker.dailyWage ?? 0,
            w.presentDays,
            w.halfDays,
            w.longShiftDays,
            w.grossWages,
            w.approvedAdvances,
            w.netPayable,
          ]),
        );
        break;

      case 'material_stock':
        exportToCsv(
          `BuildFlow_Material_Stock_${timestamp}`,
          ['Item Code', 'Material Name', 'Category', 'Unit', 'Current Stock', 'Min Threshold', 'Unit Cost (INR)', 'Stock Valuation (INR)', 'Status'],
          materialStockRows.map((m) => [
            m.material.code,
            m.material.name,
            m.material.category,
            m.material.unit,
            m.currentStock,
            m.material.minimumStock,
            m.averagePurchaseCost,
            Math.round(m.currentStock * m.averagePurchaseCost),
            m.isBelowMinimum ? 'Critical Low' : m.isLowStock ? 'Reorder Needed' : 'Normal',
          ]),
        );
        break;

      case 'material_consumption':
        exportToCsv(
          `BuildFlow_Material_Consumption_${timestamp}`,
          ['Date', 'Material Name', 'Quantity', 'Unit', 'Project ID', 'Stage / Purpose', 'Recorded By', 'Reference'],
          materialConsumptionRows.map((m) => [
            m.date,
            m.materialName,
            m.quantity,
            m.unit,
            m.projectId ?? '',
            m.notes ?? '',
            m.recordedBy,
            m.id,
          ]),
        );
        break;

      case 'budget_actual':
        exportToCsv(
          `BuildFlow_Budget_vs_Actual_${timestamp}`,
          ['Project Name', 'Customer', 'Allocated Budget (INR)', 'Actual Expenses (INR)', 'Variance (INR)', 'Spend %', 'Overrun Status'],
          budgetVsActualRows.map((r) => [
            r.project.name,
            r.project.customerName,
            r.budgetedCost,
            r.actualCost,
            r.variance,
            r.spendPercent.toFixed(1),
            r.isOverBudget ? 'Over Budget' : 'Within Budget',
          ]),
        );
        break;

      case 'construction_progress':
        exportToCsv(
          `BuildFlow_Construction_Progress_${timestamp}`,
          ['Stage Order', 'Milestone Title', 'Stage Category', 'Planned Date', 'Planned %', 'Actual %', 'Status'],
          constructionProgressRows.map((m) => [
            m.stageOrder,
            m.title,
            m.stageCategory,
            m.plannedDate,
            m.plannedProgressPercent,
            m.actualProgressPercent ?? 0,
            m.status,
          ]),
        );
        break;

      default:
        break;
    }
  };

  return (
    <PageContainer>
      <PageHeader
        title="Executive Reports & Financial Statements"
        description="Comprehensive construction management reports covering portfolio profitability, income vs expenses, customer dues, supplier payables, workforce wages, and inventory consumption."
        actions={
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={handleExportCsv}>
              <Download className="h-4 w-4" />
              <span>Export CSV</span>
            </Button>
            <Button size="sm" onClick={() => window.print()}>
              <Printer className="h-4 w-4" />
              <span>Print Report</span>
            </Button>
          </div>
        }
      />

      {/* KPI Top Cards */}
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Card className="p-3.5 border-slate-200">
          <p className="text-[11px] font-medium text-slate-500">Contract Value</p>
          <p className="mt-1 font-mono text-base font-semibold text-slate-900 tabular-nums">
            {formatINR(globalTotals.contractTotal, { compact: true })}
          </p>
          <p className="mt-0.5 text-[10px] text-slate-400">Total Portfolio</p>
        </Card>
        <Card className="p-3.5 border-slate-200">
          <p className="text-[11px] font-medium text-slate-500">Client Collections</p>
          <p className="mt-1 font-mono text-base font-semibold text-emerald-700 tabular-nums">
            {formatINR(globalTotals.receivedTotal, { compact: true })}
          </p>
          <p className="mt-0.5 text-[10px] text-emerald-600 font-medium">Inflows Received</p>
        </Card>
        <Card className="p-3.5 border-slate-200">
          <p className="text-[11px] font-medium text-slate-500">Recorded Expenses</p>
          <p className="mt-1 font-mono text-base font-semibold text-slate-900 tabular-nums">
            {formatINR(globalTotals.expensesTotal, { compact: true })}
          </p>
          <p className="mt-0.5 text-[10px] text-slate-400">Site Disbursements</p>
        </Card>
        <Card className="p-3.5 border-slate-200">
          <p className="text-[11px] font-medium text-slate-500">Client Dues</p>
          <p className="mt-1 font-mono text-base font-semibold text-amber-700 tabular-nums">
            {formatINR(globalTotals.pendingClientDues, { compact: true })}
          </p>
          <p className="mt-0.5 text-[10px] text-amber-600 font-medium">Pending Receivables</p>
        </Card>
        <Card className="p-3.5 border-slate-200">
          <p className="text-[11px] font-medium text-slate-500">Supplier Payables</p>
          <p className="mt-1 font-mono text-base font-semibold text-rose-700 tabular-nums">
            {formatINR(globalTotals.pendingSupplierPayables, { compact: true })}
          </p>
          <p className="mt-0.5 text-[10px] text-rose-600 font-medium">Vendor Balances</p>
        </Card>
        <Card className="p-3.5 border-slate-200">
          <p className="text-[11px] font-medium text-slate-500">Net Wages</p>
          <p className="mt-1 font-mono text-base font-semibold text-[#A65229] tabular-nums">
            {formatINR(globalTotals.totalWagePayroll, { compact: true })}
          </p>
          <p className="mt-0.5 text-[10px] text-slate-400">Workforce Payroll</p>
        </Card>
      </div>

      {/* Global Filter Bar */}
      <Card className="mb-5 p-4 border-slate-200">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, reference, code..."
              className="pl-9 text-xs"
            />
          </div>
          <Select value={projectFilter} onValueChange={setProjectFilter}>
            <SelectTrigger className="text-xs">
              <SelectValue placeholder="All Projects" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Projects</SelectItem>
              {projects.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2">
            <Label className="text-xs text-slate-500 shrink-0">From</Label>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="text-xs"
            />
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-xs text-slate-500 shrink-0">To</Label>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="text-xs"
            />
          </div>
        </div>
      </Card>

      {/* Reports Tabs Navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4 flex flex-wrap h-auto gap-1 bg-slate-100 p-1">
          <TabsTrigger value="financial_summary" className="text-xs">
            <Building2 className="mr-1.5 h-3.5 w-3.5" />
            Financial Summary
          </TabsTrigger>
          <TabsTrigger value="income_expenses" className="text-xs">
            <TrendingUp className="mr-1.5 h-3.5 w-3.5" />
            Income &amp; Expenses
          </TabsTrigger>
          <TabsTrigger value="customer_outstanding" className="text-xs">
            <CreditCard className="mr-1.5 h-3.5 w-3.5" />
            Customer Dues
          </TabsTrigger>
          <TabsTrigger value="supplier_outstanding" className="text-xs">
            <Truck className="mr-1.5 h-3.5 w-3.5" />
            Supplier Payables
          </TabsTrigger>
          <TabsTrigger value="worker_wages" className="text-xs">
            <HardHat className="mr-1.5 h-3.5 w-3.5" />
            Worker Wage Report
          </TabsTrigger>
          <TabsTrigger value="material_stock" className="text-xs">
            <Package className="mr-1.5 h-3.5 w-3.5" />
            Material Stock
          </TabsTrigger>
          <TabsTrigger value="material_consumption" className="text-xs">
            <Layers className="mr-1.5 h-3.5 w-3.5" />
            Consumption Log
          </TabsTrigger>
          <TabsTrigger value="monthly_cashflow" className="text-xs">
            <IndianRupee className="mr-1.5 h-3.5 w-3.5" />
            Monthly Cash Flow
          </TabsTrigger>
          <TabsTrigger value="budget_actual" className="text-xs">
            <Receipt className="mr-1.5 h-3.5 w-3.5" />
            Budget vs Actual
          </TabsTrigger>
          <TabsTrigger value="construction_progress" className="text-xs">
            <FileSpreadsheet className="mr-1.5 h-3.5 w-3.5" />
            Progress Audit
          </TabsTrigger>
        </TabsList>

        {/* ── Tab 1: Project Financial Summary ── */}
        <TabsContent value="financial_summary">
          <Card className="border-slate-200">
            <CardHeader className="border-b border-slate-100 pb-3">
              <CardTitle className="text-base font-semibold">Project-Wise Profitability Statement</CardTitle>
              <CardDescription className="text-xs">
                Contract value, collections received, recorded site costs, and projected profit margin in INR
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Project &amp; Customer</TableHead>
                    <TableHead>Supervisor</TableHead>
                    <TableHead className="text-right">Contract Value</TableHead>
                    <TableHead className="text-right">Received</TableHead>
                    <TableHead className="text-right">Expenses</TableHead>
                    <TableHead className="text-right">Projected Margin</TableHead>
                    <TableHead className="text-right">Margin %</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {financialSummaryRows.map(({ project, fin, marginPercent }) => (
                    <TableRow key={project.id}>
                      <TableCell>
                        <div className="font-semibold text-slate-900 text-sm">{project.name}</div>
                        <div className="text-xs text-slate-500">
                          {project.code} · {project.customerName}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-slate-700">{project.siteManager}</TableCell>
                      <TableCell className="text-right font-mono text-xs font-medium tabular-nums">
                        {formatINR(fin.contractValue)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs text-emerald-700 tabular-nums">
                        {formatINR(fin.amountReceived)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs text-slate-800 tabular-nums">
                        {formatINR(fin.recordedExpenses)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs font-semibold text-[#A65229] tabular-nums">
                        {formatINR(fin.projectedMargin)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs font-medium tabular-nums">
                        {marginPercent.toFixed(1)}%
                      </TableCell>
                      <TableCell>
                        <Badge variant={getProjectStatusVariant(project.status)}>
                          {project.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Tab 2: Income & Expenses ── */}
        <TabsContent value="income_expenses">
          <Card className="border-slate-200">
            <CardHeader className="border-b border-slate-100 pb-3">
              <CardTitle className="text-base font-semibold">Cash Inflows vs Site Outflows</CardTitle>
              <CardDescription className="text-xs">
                Audited ledger of client payments received vs vendor bills and site operational disbursements
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Reference &amp; Description</TableHead>
                    <TableHead className="text-right">Amount (INR)</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {incomeExpensesRows.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="text-xs font-mono text-slate-700">
                        {formatIndianDate(item.date)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={item.type === 'Income' ? 'success' : 'neutral'}>
                          {item.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs font-medium text-slate-800">{item.category}</TableCell>
                      <TableCell>
                        <div className="text-xs text-slate-900 font-medium">{item.description}</div>
                        <div className="text-[11px] font-mono text-slate-400">{item.reference}</div>
                      </TableCell>
                      <TableCell
                        className={`text-right font-mono text-xs font-semibold tabular-nums ${
                          item.type === 'Income' ? 'text-emerald-700' : 'text-slate-800'
                        }`}
                      >
                        {item.type === 'Income' ? '+' : '-'} {formatINR(item.amount)}
                      </TableCell>
                      <TableCell className="text-xs text-slate-600">{item.status}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Tab 3: Customer Outstanding Payments ── */}
        <TabsContent value="customer_outstanding">
          <Card className="border-slate-200">
            <CardHeader className="border-b border-slate-100 pb-3">
              <CardTitle className="text-base font-semibold">Customer Receivables &amp; Outstanding Dues</CardTitle>
              <CardDescription className="text-xs">
                Tracking client milestone payments, total contract values, and pending balances
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Project &amp; Homeowner</TableHead>
                    <TableHead className="text-right">Contract Value</TableHead>
                    <TableHead className="text-right">Collected</TableHead>
                    <TableHead className="text-right">Pending Dues</TableHead>
                    <TableHead className="text-right">Collected %</TableHead>
                    <TableHead>Payment Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customerOutstandingRows.map((row) => (
                    <TableRow key={row.projectId}>
                      <TableCell>
                        <div className="font-semibold text-slate-900 text-sm">{row.projectName}</div>
                        <div className="text-xs text-slate-500">{row.customerName}</div>
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs tabular-nums">
                        {formatINR(row.contractValue)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs text-emerald-700 tabular-nums">
                        {formatINR(row.amountReceived)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs font-bold text-amber-700 tabular-nums">
                        {formatINR(row.outstandingBalance)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs font-medium tabular-nums">
                        {row.percentCollected.toFixed(1)}%
                      </TableCell>
                      <TableCell>
                        <Badge variant={row.outstandingBalance === 0 ? 'success' : 'warning'}>
                          {row.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Tab 4: Supplier Outstanding Payments ── */}
        <TabsContent value="supplier_outstanding">
          <Card className="border-slate-200">
            <CardHeader className="border-b border-slate-100 pb-3">
              <CardTitle className="text-base font-semibold">Supplier Accounts &amp; Outstanding Payables</CardTitle>
              <CardDescription className="text-xs">
                Material purchase orders, payments executed, and pending vendor dues
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Supplier Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead className="text-right">Total Billed</TableHead>
                    <TableHead className="text-right">Payments Made</TableHead>
                    <TableHead className="text-right">Balance Due</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {supplierOutstandingRows.map((row) => (
                    <TableRow key={row.supplier.id}>
                      <TableCell className="font-medium text-slate-900 text-sm">{row.supplier.name}</TableCell>
                      <TableCell className="text-xs text-slate-600">{row.supplier.category}</TableCell>
                      <TableCell className="text-xs text-slate-600">
                        {row.supplier.contactPerson} · {row.supplier.phone}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs tabular-nums">
                        {formatINR(row.totalBilled)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs text-emerald-700 tabular-nums">
                        {formatINR(row.paymentsMade)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs font-bold text-rose-700 tabular-nums">
                        {formatINR(row.balanceDue)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Tab 5: Worker Wage Report ── */}
        <TabsContent value="worker_wages">
          <Card className="border-slate-200">
            <CardHeader className="border-b border-slate-100 pb-3">
              <CardTitle className="text-base font-semibold">Weekly Workforce Payroll Register</CardTitle>
              <CardDescription className="text-xs">
                Attendance tally, daily wage overrides, shift formulas, mid-week advances, and net wage payable
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Worker</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead className="text-right">Base Wage (D)</TableHead>
                    <TableHead className="text-right">Present (1.0D)</TableHead>
                    <TableHead className="text-right">Half (0.5D)</TableHead>
                    <TableHead className="text-right">Long/OT (1.5D)</TableHead>
                    <TableHead className="text-right">Gross Wage</TableHead>
                    <TableHead className="text-right">Advances</TableHead>
                    <TableHead className="text-right">Net Payable</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {workerWageRows.map((w) => (
                    <TableRow key={w.worker.id}>
                      <TableCell>
                        <div className="font-semibold text-slate-900 text-sm">{w.worker.name}</div>
                        <div className="text-[11px] font-mono text-slate-400">{w.worker.workerCode}</div>
                      </TableCell>
                      <TableCell className="text-xs text-slate-700">{w.worker.role}</TableCell>
                      <TableCell className="text-right font-mono text-xs tabular-nums">
                        {formatINR(w.worker.dailyWage ?? 0)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs tabular-nums">
                        {w.presentDays}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs tabular-nums">
                        {w.halfDays}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs tabular-nums text-amber-700">
                        {w.longShiftDays}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs font-semibold tabular-nums">
                        {formatINR(w.grossWages)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs text-rose-700 tabular-nums">
                        - {formatINR(w.approvedAdvances)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs font-bold text-[#A65229] tabular-nums">
                        {formatINR(w.netPayable)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Tab 6: Material Stock Report ── */}
        <TabsContent value="material_stock">
          <Card className="border-slate-200">
            <CardHeader className="border-b border-slate-100 pb-3">
              <CardTitle className="text-base font-semibold">Inventory Catalogue &amp; Stock Valuation</CardTitle>
              <CardDescription className="text-xs">
                Real-time site material balances, reorder thresholds, and current stock inventory value in INR
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item Code</TableHead>
                    <TableHead>Material Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Current Stock</TableHead>
                    <TableHead className="text-right">Min Threshold</TableHead>
                    <TableHead className="text-right">Unit Cost</TableHead>
                    <TableHead className="text-right">Total Valuation</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {materialStockRows.map((m) => (
                    <TableRow key={m.material.id}>
                      <TableCell className="font-mono text-xs text-slate-500">{m.material.code}</TableCell>
                      <TableCell className="font-medium text-slate-900 text-sm">{m.material.name}</TableCell>
                      <TableCell className="text-xs text-slate-600">{m.material.category}</TableCell>
                      <TableCell className="text-right font-mono text-xs font-semibold tabular-nums">
                        {m.currentStock} {m.material.unit}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs text-slate-500 tabular-nums">
                        {m.material.minimumStock} {m.material.unit}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs tabular-nums">
                        {formatINR(m.averagePurchaseCost)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs font-bold text-slate-900 tabular-nums">
                        {formatINR(Math.round(m.currentStock * m.averagePurchaseCost))}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            m.isBelowMinimum ? 'danger' : m.isLowStock ? 'warning' : 'success'
                          }
                        >
                          {m.isBelowMinimum ? 'Critical Low' : m.isLowStock ? 'Reorder Needed' : 'Normal'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Tab 7: Material Consumption ── */}
        <TabsContent value="material_consumption">
          <Card className="border-slate-200">
            <CardHeader className="border-b border-slate-100 pb-3">
              <CardTitle className="text-base font-semibold">Material Consumption &amp; Issue Logs</CardTitle>
              <CardDescription className="text-xs">
                Audit trail of materials issued from inventory to specific projects and construction stages
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Material</TableHead>
                    <TableHead className="text-right">Quantity Issued</TableHead>
                    <TableHead>Stage / Purpose</TableHead>
                    <TableHead>Recorded By</TableHead>
                    <TableHead>Reference</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {materialConsumptionRows.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell className="text-xs font-mono text-slate-700">
                        {formatIndianDate(m.date)}
                      </TableCell>
                      <TableCell className="font-medium text-slate-900 text-sm">{m.materialName}</TableCell>
                      <TableCell className="text-right font-mono text-xs font-semibold tabular-nums text-slate-900">
                        {m.quantity} {m.unit}
                      </TableCell>
                      <TableCell className="text-xs text-slate-700">{m.notes || 'Civil Work'}</TableCell>
                      <TableCell className="text-xs text-slate-600">{m.recordedBy}</TableCell>
                      <TableCell className="font-mono text-xs text-slate-400">{m.id}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Tab 8: Monthly Cash Flow ── */}
        <TabsContent value="monthly_cashflow">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
            <Card className="p-5 border-emerald-200 bg-emerald-50/40">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-emerald-800">Total Cash Inflow</span>
                <TrendingUp className="h-4 w-4 text-emerald-600" />
              </div>
              <p className="mt-2 font-mono text-2xl font-bold text-emerald-900">
                {formatINR(monthlyCashFlowSummary.totalInflow)}
              </p>
              <p className="mt-1 text-xs text-emerald-700">Client progress collections</p>
            </Card>

            <Card className="p-5 border-rose-200 bg-rose-50/40">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-rose-800">Total Cash Outflow</span>
                <TrendingDown className="h-4 w-4 text-rose-600" />
              </div>
              <p className="mt-2 font-mono text-2xl font-bold text-rose-900">
                {formatINR(monthlyCashFlowSummary.totalOutflow)}
              </p>
              <p className="mt-1 text-xs text-rose-700">Disbursements, materials &amp; wages</p>
            </Card>

            <Card className="p-5 border-slate-200 bg-slate-50/60">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-700">Net Operating Cash Flow</span>
                <IndianRupee className="h-4 w-4 text-slate-600" />
              </div>
              <p className="mt-2 font-mono text-2xl font-bold text-slate-900">
                {formatINR(monthlyCashFlowSummary.netCashFlow)}
              </p>
              <p className="mt-1 text-xs text-slate-600">Retained operating liquidity</p>
            </Card>
          </div>

          <Card className="border-slate-200">
            <CardHeader className="border-b border-slate-100 pb-3">
              <CardTitle className="text-base font-semibold">Cash Flow Breakdown</CardTitle>
              <CardDescription className="text-xs">Summary of major inflows and outflows</CardDescription>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between py-2 border-b border-slate-100">
                <span className="text-xs text-slate-600 font-medium">Customer Collections Received</span>
                <span className="font-mono text-xs font-semibold text-emerald-700">
                  + {formatINR(monthlyCashFlowSummary.totalInflow)}
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-slate-100">
                <span className="text-xs text-slate-600 font-medium">Site Operational Expenses</span>
                <span className="font-mono text-xs font-semibold text-slate-800">
                  - {formatINR(monthlyCashFlowSummary.totalSiteExpenses)}
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-slate-100">
                <span className="text-xs text-slate-600 font-medium">Supplier &amp; Material Payments</span>
                <span className="font-mono text-xs font-semibold text-slate-800">
                  - {formatINR(monthlyCashFlowSummary.totalSupplierPayouts)}
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-slate-100">
                <span className="text-xs text-slate-600 font-medium">Workforce Payroll Net Wages</span>
                <span className="font-mono text-xs font-semibold text-[#A65229]">
                  - {formatINR(monthlyCashFlowSummary.totalWages)}
                </span>
              </div>
              <div className="flex items-center justify-between pt-2">
                <span className="text-sm font-bold text-slate-900">Net Retained Cash</span>
                <span className="font-mono text-sm font-bold text-slate-900">
                  {formatINR(monthlyCashFlowSummary.netCashFlow)}
                </span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Tab 9: Budget vs Actual Expenses ── */}
        <TabsContent value="budget_actual">
          <Card className="border-slate-200">
            <CardHeader className="border-b border-slate-100 pb-3">
              <CardTitle className="text-base font-semibold">Budget vs Actual Cost Tracking</CardTitle>
              <CardDescription className="text-xs">
                Comparing allocated project expense baseline vs recorded actual site spend
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Project &amp; Customer</TableHead>
                    <TableHead className="text-right">Allocated Budget</TableHead>
                    <TableHead className="text-right">Actual Cost</TableHead>
                    <TableHead className="text-right">Variance (INR)</TableHead>
                    <TableHead className="text-right">Budget Spend %</TableHead>
                    <TableHead>Variance Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {budgetVsActualRows.map((row) => (
                    <TableRow key={row.project.id}>
                      <TableCell>
                        <div className="font-semibold text-slate-900 text-sm">{row.project.name}</div>
                        <div className="text-xs text-slate-500">{row.project.customerName}</div>
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs tabular-nums">
                        {formatINR(row.budgetedCost)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs font-medium tabular-nums text-slate-900">
                        {formatINR(row.actualCost)}
                      </TableCell>
                      <TableCell
                        className={`text-right font-mono text-xs font-bold tabular-nums ${
                          row.isOverBudget ? 'text-rose-700' : 'text-emerald-700'
                        }`}
                      >
                        {row.variance >= 0 ? '+' : ''} {formatINR(row.variance)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs tabular-nums">
                        {row.spendPercent.toFixed(1)}%
                      </TableCell>
                      <TableCell>
                        <Badge variant={row.isOverBudget ? 'danger' : 'success'}>
                          {row.isOverBudget ? 'Over Budget' : 'Under Budget'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Tab 10: Construction Progress ── */}
        <TabsContent value="construction_progress">
          <Card className="border-slate-200">
            <CardHeader className="border-b border-slate-100 pb-3">
              <CardTitle className="text-base font-semibold">Milestone Execution &amp; Construction Audit</CardTitle>
              <CardDescription className="text-xs">
                Stage progression, target planned dates vs actual on-site milestone completion
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order</TableHead>
                    <TableHead>Milestone Stage</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Target Date</TableHead>
                    <TableHead className="text-right">Planned %</TableHead>
                    <TableHead className="text-right">Actual %</TableHead>
                    <TableHead>Stage Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {constructionProgressRows.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell className="font-mono text-xs text-slate-400">#{m.stageOrder}</TableCell>
                      <TableCell className="font-medium text-slate-900 text-sm">{m.title}</TableCell>
                      <TableCell className="text-xs text-slate-600">{m.stageCategory}</TableCell>
                      <TableCell className="text-xs font-mono text-slate-700">
                        {formatIndianDate(m.plannedDate)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs tabular-nums text-slate-500">
                        {m.plannedProgressPercent}%
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs font-bold tabular-nums text-slate-900">
                        {m.actualProgressPercent}%
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            m.status === 'Completed'
                              ? 'success'
                              : m.status === 'In Progress'
                              ? 'info'
                              : m.status === 'Delayed'
                              ? 'danger'
                              : 'neutral'
                          }
                        >
                          {m.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </PageContainer>
  );
}
