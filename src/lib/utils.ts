import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format INR currency using Indian numbering system (e.g. ₹48,50,000)
 */
export function formatINR(amount: number, options?: { compact?: boolean }): string {
  if (!Number.isFinite(amount)) return '₹0';

  if (options?.compact) {
    const abs = Math.abs(amount);
    const sign = amount < 0 ? '-' : '';
    if (abs >= 1_00_00_000) {
      return `${sign}₹${(abs / 1_00_00_000).toFixed(2)} Cr`;
    }
    if (abs >= 1_00_000) {
      return `${sign}₹${(abs / 1_00_000).toFixed(2)} L`;
    }
    if (abs >= 1_000) {
      return `${sign}₹${(abs / 1_000).toFixed(1)} K`;
    }
  }

  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Math.round(amount));
}

/**
 * Format ISO date string into Indian readable format (e.g. 14 Nov 2026)
 */
export function formatIndianDate(isoDate: string): string {
  if (!isoDate) return '—';
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return isoDate;
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

/**
 * Format ISO date string into DD/MM/YYYY format
 */
export function formatIndianShortDate(isoDate: string): string {
  if (!isoDate) return '—';
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return isoDate;
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

/**
 * Format sq.ft area with Indian number grouping
 */
export function formatArea(sqft: number): string {
  return `${new Intl.NumberFormat('en-IN').format(sqft)} sq.ft`;
}

/**
 * Check if an ISO date falls within the last N days from a reference date
 */
export function isWithinDays(isoDate: string, days: number, referenceDate = new Date('2026-11-22')): boolean {
  const target = new Date(isoDate);
  if (Number.isNaN(target.getTime())) return false;
  const diffMs = referenceDate.getTime() - target.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  return diffDays >= -365 && diffDays <= days;
}

/**
 * Universal CSV export utility for tables and reports
 */
export function exportToCsv(
  filename: string,
  headers: string[],
  rows: (string | number | boolean | undefined | null)[][],
): void {
  const escapeCell = (val: string | number | boolean | undefined | null) => {
    const str = String(val ?? '');
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const csvContent = [
    headers.map(escapeCell).join(','),
    ...rows.map((row) => row.map(escapeCell).join(',')),
  ].join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
