import {
  BarChart3,
  Building2,
  ClipboardCheck,
  FileSpreadsheet,
  HardHat,
  IndianRupee,
  LayoutDashboard,
  Package,
  Receipt,
  Settings,
  Truck,
  Users,
  Wallet,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  label: string;
  path: string;
  icon: LucideIcon;
  section: 'Operations' | 'Financials' | 'Resources' | 'System';
}

export const NAV_ITEMS: NavItem[] = [
  {
    label: 'Dashboard',
    path: '/',
    icon: LayoutDashboard,
    section: 'Operations',
  },
  {
    label: 'Projects',
    path: '/projects',
    icon: Building2,
    section: 'Operations',
  },
  {
    label: 'Site Progress',
    path: '/site-progress',
    icon: ClipboardCheck,
    section: 'Operations',
  },
  {
    label: 'Finance Overview',
    path: '/finance',
    icon: Wallet,
    section: 'Financials',
  },
  {
    label: 'Quotations',
    path: '/quotations',
    icon: FileSpreadsheet,
    section: 'Financials',
  },
  {
    label: 'Customer Payments',
    path: '/payments',
    icon: IndianRupee,
    section: 'Financials',
  },
  {
    label: 'Expenses',
    path: '/expenses',
    icon: Receipt,
    section: 'Financials',
  },
  {
    label: 'Reports',
    path: '/reports',
    icon: BarChart3,
    section: 'Financials',
  },
  {
    label: 'Customers',
    path: '/customers',
    icon: Users,
    section: 'Resources',
  },
  {
    label: 'Materials',
    path: '/materials',
    icon: Package,
    section: 'Resources',
  },
  {
    label: 'Suppliers',
    path: '/suppliers',
    icon: Truck,
    section: 'Resources',
  },
  {
    label: 'Workers',
    path: '/workers',
    icon: HardHat,
    section: 'Resources',
  },
  {
    label: 'Settings',
    path: '/settings',
    icon: Settings,
    section: 'System',
  },
];

export const NAV_SECTIONS: NavItem['section'][] = [
  'Operations',
  'Financials',
  'Resources',
  'System',
];
