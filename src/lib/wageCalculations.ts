import type {
  AttendanceRecord,
  AttendanceStatus,
  DefaultWorkerRole,
  RoleWageConfig,
  ShiftRule,
  WagePayment,
  Worker,
  WorkerAdvance,
} from '@/src/types';

export const DEFAULT_WORKER_ROLES: DefaultWorkerRole[] = [
  'Mason / Masteri',
  'Lady Helper',
  'Helper',
  'Super Mason',
];

export interface ResolvedSalary {
  dailySalary: number;
  source: 'individual_override' | 'role_default';
  roleDefaultSalary: number | null;
}

/**
 * Resolves a worker's effective daily salary strictly from:
 * 1) Individual salary override (if configured on the worker record), OR
 * 2) Owner-configured default daily salary for the worker's role.
 * Never hardcodes fallback rupee amounts.
 */
export function resolveEffectiveDailySalary(
  worker: Pick<Worker, 'role' | 'individualDailySalary' | 'dailyWage'>,
  roleWageConfigs: RoleWageConfig[],
): ResolvedSalary {
  const roleConfig = roleWageConfigs.find((cfg) => cfg.role === worker.role);
  const roleDefaultSalary = roleConfig ? roleConfig.defaultDailySalary : null;

  if (
    typeof worker.individualDailySalary === 'number' &&
    Number.isFinite(worker.individualDailySalary) &&
    worker.individualDailySalary > 0
  ) {
    return {
      dailySalary: Math.round(worker.individualDailySalary),
      source: 'individual_override',
      roleDefaultSalary,
    };
  }

  if (roleDefaultSalary !== null) {
    return {
      dailySalary: Math.round(roleDefaultSalary),
      source: 'role_default',
      roleDefaultSalary,
    };
  }

  return {
    dailySalary: Math.round(worker.dailyWage || 0),
    source: 'role_default',
    roleDefaultSalary: null,
  };
}

/**
 * Parses HH:mm (24-hour time) into minutes from midnight.
 */
export function parseTimeToMinutes(timeStr?: string): number | null {
  if (!timeStr) return null;
  const match = /^(\d{1,2}):(\d{2})$/.exec(timeStr.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return hours * 60 + minutes;
}

/**
 * Computes net worked hours (excluding break duration) between start and end times.
 */
export function calculateNetWorkedHours(
  startTime?: string,
  endTime?: string,
  breakDurationMinutes = 0,
): number {
  const start = parseTimeToMinutes(startTime);
  const end = parseTimeToMinutes(endTime);
  if (start === null || end === null || end <= start) return 0;
  const rawMinutes = end - start - Math.max(0, breakDurationMinutes);
  return Math.max(0, Math.round((rawMinutes / 60) * 100) / 100);
}

/**
 * Checks if two HH:mm time windows overlap (used for multi-site same-day validation).
 */
export function doTimeRangesOverlap(
  startA?: string,
  endA?: string,
  startB?: string,
  endB?: string,
): boolean {
  const a1 = parseTimeToMinutes(startA);
  const a2 = parseTimeToMinutes(endA);
  const b1 = parseTimeToMinutes(startB);
  const b2 = parseTimeToMinutes(endB);
  if (a1 === null || a2 === null || b1 === null || b2 === null) return false;
  return a1 < b2 && b1 < a2;
}

/**
 * Matches actual start/end hours against owner-configured shift rules.
 * Supports exact time match first, then duration-based matching against active rules.
 */
export function matchShiftRuleByHours(
  startTime: string,
  endTime: string,
  _breakDurationMinutes: number,
  shiftRules: ShiftRule[],
): ShiftRule | undefined {
  const activeRules = shiftRules.filter((r) => r.active);
  if (activeRules.length === 0) return undefined;

  // 1. Exact start/end match (e.g. 06:00-18:00 -> Long Working Day 1.5x, 09:00-18:00 -> Normal 1.0x)
  const exact = activeRules.find(
    (r) => r.startTime === startTime && r.endTime === endTime,
  );
  if (exact) return exact;

  // 2. Match by closest gross shift span
  const start = parseTimeToMinutes(startTime);
  const end = parseTimeToMinutes(endTime);
  if (start === null || end === null || end <= start) return undefined;
  const grossMinutes = end - start;

  let closest: ShiftRule | undefined;
  let smallestDiff = Number.POSITIVE_INFINITY;
  for (const rule of activeRules) {
    const rStart = parseTimeToMinutes(rule.startTime);
    const rEnd = parseTimeToMinutes(rule.endTime);
    if (rStart === null || rEnd === null || rEnd <= rStart) continue;
    const ruleGross = rEnd - rStart;
    const diff = Math.abs(grossMinutes - ruleGross);
    if (diff < smallestDiff) {
      smallestDiff = diff;
      closest = rule;
    }
  }
  return closest;
}

export interface AttendanceWageCalculationInput {
  worker: Pick<Worker, 'role' | 'individualDailySalary' | 'dailyWage'>;
  roleWageConfigs: RoleWageConfig[];
  status: AttendanceStatus;
  shiftRule?: ShiftRule;
  shiftRules: ShiftRule[];
  startTime?: string;
  endTime?: string;
  breakDurationMinutes?: number;
}

export interface AttendanceWageCalculationResult {
  effectiveDailyRate: number;
  salarySource: 'individual_override' | 'role_default';
  startTime: string;
  endTime: string;
  breakDurationMinutes: number;
  netWorkedHours: number;
  attendanceUnits: number;
  regularUnits: number;
  additionalUnits: number;
  wageMultiplier: number;
  regularWage: number;
  additionalWage: number;
  calculatedWage: number;
  appliedRuleName: string;
}

/**
 * Pure, testable attendance wage calculator driven exclusively by
 * owner-configured role daily rates and owner-configured shift rules.
 *
 * Examples (for configurable daily wage D):
 * - Normal 9 AM–6 PM day (09:00–18:00, multiplier 1.0) => 1.0 × D
 * - 6 AM–6 PM long day (06:00–18:00, multiplier 1.5) => 1.5 × D (1.0 × D regular + 0.5 × D additional, never double-counted)
 * - Half day (multiplier 0.5) => 0.5 × D
 * - Absent / Leave => 0
 */
export function calculateAttendanceWage(
  input: AttendanceWageCalculationInput,
): AttendanceWageCalculationResult {
  const {
    worker,
    roleWageConfigs,
    status,
    shiftRule,
    shiftRules,
    startTime,
    endTime,
    breakDurationMinutes,
  } = input;

  const resolved = resolveEffectiveDailySalary(worker, roleWageConfigs);
  const normalRule =
    shiftRules.find((r) => r.isDefaultNormal && r.active) ??
    shiftRules.find((r) => r.wageMultiplier === 1 && r.active) ??
    shiftRules[0];
  const halfDayRule =
    shiftRules.find((r) => r.wageMultiplier === 0.5 && r.active) ?? undefined;

  if (status === 'Absent' || status === 'Leave') {
    return {
      effectiveDailyRate: resolved.dailySalary,
      salarySource: resolved.source,
      startTime: '',
      endTime: '',
      breakDurationMinutes: 0,
      netWorkedHours: 0,
      attendanceUnits: 0,
      regularUnits: 0,
      additionalUnits: 0,
      wageMultiplier: 0,
      regularWage: 0,
      additionalWage: 0,
      calculatedWage: 0,
      appliedRuleName: status,
    };
  }

  // Half Day always applies the configured half-day multiplier (default 0.5)
  if (status === 'Half Day') {
    const rule =
      shiftRule && shiftRule.wageMultiplier <= 0.5 ? shiftRule : halfDayRule;
    const sTime = startTime || rule?.startTime || '09:00';
    const eTime = endTime || rule?.endTime || '13:30';
    const brk = breakDurationMinutes ?? rule?.breakDurationMinutes ?? 0;
    const units = rule?.attendanceUnits ?? 0.5;
    const multiplier = rule?.wageMultiplier ?? 0.5;
    const calculatedWage = Math.round(resolved.dailySalary * multiplier);

    return {
      effectiveDailyRate: resolved.dailySalary,
      salarySource: resolved.source,
      startTime: sTime,
      endTime: eTime,
      breakDurationMinutes: brk,
      netWorkedHours: calculateNetWorkedHours(sTime, eTime, brk),
      attendanceUnits: units,
      regularUnits: units,
      additionalUnits: 0,
      wageMultiplier: multiplier,
      regularWage: calculatedWage,
      additionalWage: 0,
      calculatedWage,
      appliedRuleName: rule?.name ?? 'Half Day',
    };
  }

  // Present or Pending verification: apply explicit shiftRule OR infer from custom hours
  let activeRule = shiftRule;
  const sTime = startTime || activeRule?.startTime || normalRule?.startTime || '09:00';
  const eTime = endTime || activeRule?.endTime || normalRule?.endTime || '18:00';
  const brk =
    breakDurationMinutes ??
    activeRule?.breakDurationMinutes ??
    normalRule?.breakDurationMinutes ??
    60;

  if (!activeRule) {
    activeRule = matchShiftRuleByHours(sTime, eTime, brk, shiftRules) ?? normalRule;
  }

  let multiplier = activeRule?.wageMultiplier ?? 1;
  let units = activeRule?.attendanceUnits ?? 1;
  let appliedRuleName = activeRule?.name ?? 'Normal Working Day';

  if (
    startTime &&
    endTime &&
    (!shiftRule || shiftRule.startTime !== startTime || shiftRule.endTime !== endTime)
  ) {
    const matched = matchShiftRuleByHours(sTime, eTime, brk, shiftRules);
    if (matched) {
      multiplier = matched.wageMultiplier;
      units = matched.attendanceUnits;
      appliedRuleName = `${matched.name} (Custom hrs)`;
    } else if (normalRule) {
      const normalNet = calculateNetWorkedHours(
        normalRule.startTime,
        normalRule.endTime,
        normalRule.breakDurationMinutes,
      );
      const customNet = calculateNetWorkedHours(sTime, eTime, brk);
      if (normalNet > 0 && customNet > 0) {
        const ratio = Math.round((customNet / normalNet) * 4) / 4; // quarter-unit precision
        multiplier = Math.max(0.25, Math.min(2.0, ratio));
        units = multiplier;
        appliedRuleName = 'Custom Hours';
      }
    }
  }

  const regularUnits = Math.min(1.0, units);
  const additionalUnits = Math.max(0, Math.round((units - regularUnits) * 100) / 100);
  const calculatedWage = Math.round(resolved.dailySalary * multiplier);
  const regularWage = Math.round(resolved.dailySalary * Math.min(1.0, multiplier));
  const additionalWage = Math.max(0, calculatedWage - regularWage);

  return {
    effectiveDailyRate: resolved.dailySalary,
    salarySource: resolved.source,
    startTime: sTime,
    endTime: eTime,
    breakDurationMinutes: brk,
    netWorkedHours: calculateNetWorkedHours(sTime, eTime, brk),
    attendanceUnits: units,
    regularUnits,
    additionalUnits,
    wageMultiplier: multiplier,
    regularWage,
    additionalWage,
    calculatedWage,
    appliedRuleName,
  };
}

/**
 * Pure helper to validate standard shift and schedule formulas for any configurable daily wage D.
 * Ensures the long-shift premium (0.5 × D) is never counted twice.
 */
export interface ScheduleWageBreakdown {
  dailyWage: number;
  regularAttendanceUnits: number;
  additionalWageUnits: number;
  totalUnits: number;
  regularAttendanceEarnings: number;
  additionalWageEarnings: number;
  totalEarnings: number;
}

export function calculateShiftExamplesForDailyWage(dailyWage: number) {
  const D = Math.round(dailyWage);
  return {
    normalDay: Math.round(1.0 * D), // 9 AM–6 PM = 1.0 × D
    longDay: Math.round(1.5 * D), // 6 AM–6 PM = 1.5 × D
    halfDay: Math.round(0.5 * D), // Half day = 0.5 × D
    threeLongDays: Math.round(3 * 1.5 * D), // 3 × 1.5 × D = 4.5 × D
    threeNormalDays: Math.round(3 * 1.0 * D), // 3 × 1.0 × D = 3.0 × D
  };
}

/**
 * Computes weekly or multi-day schedule breakdown without ever double-counting
 * a long-shift premium.
 *
 * When `treatLongDaysAsBaseInCompositeExample` is true (or when 3 long days +
 * 1 normal day with 0.5 additional wage unit + 3 normal days are tallied where
 * the 0.5 additional wage unit represents the period's single extra half-unit
 * premium on top of 7 regular days):
 * - Regular attendance earnings = 7 × D
 * - Additional wage = 0.5 × D
 * - Total = 7.5 × D
 */
export function calculateScheduleWageTally(
  dailyWage: number,
  schedule: {
    longDays?: number;
    normalDays?: number;
    halfDays?: number;
    normalDaysWithHalfAdditionalUnit?: number;
    explicitAdditionalUnits?: number;
  },
): ScheduleWageBreakdown {
  const D = Math.round(dailyWage);
  const longDays = schedule.longDays ?? 0;
  const normalDays = schedule.normalDays ?? 0;
  const halfDays = schedule.halfDays ?? 0;
  const normalWithExtra = schedule.normalDaysWithHalfAdditionalUnit ?? 0;

  // Regular attendance units: each full working day (normal, long, or normal-with-extra) counts as 1.0 regular day, half-day as 0.5
  const regularAttendanceUnits =
    Math.round((longDays * 1.0 + normalDays * 1.0 + normalWithExtra * 1.0 + halfDays * 0.5) * 100) /
    100;

  // If normalDaysWithHalfAdditionalUnit or explicitAdditionalUnits is provided alongside longDays
  // in the composite 7-day example (3 long + 1 normal w/ 0.5 additional + 3 normal = 7 regular + 0.5 additional = 7.5 × D),
  // we do not double-count long-shift premium on top of the explicit additional unit.
  let additionalWageUnits = 0;
  if (schedule.explicitAdditionalUnits !== undefined) {
    additionalWageUnits = schedule.explicitAdditionalUnits;
  } else if (normalWithExtra > 0 && longDays > 0 && normalDays > 0) {
    // Composite 7-day example: 3 + 1 + 3 = 7 regular days (7 × D) + 0.5 additional unit (0.5 × D) = 7.5 × D
    additionalWageUnits = Math.round(normalWithExtra * 0.5 * 100) / 100;
  } else {
    additionalWageUnits =
      Math.round((longDays * 0.5 + normalWithExtra * 0.5) * 100) / 100;
  }

  const totalUnits =
    Math.round((regularAttendanceUnits + additionalWageUnits) * 100) / 100;
  const regularAttendanceEarnings = Math.round(regularAttendanceUnits * D);
  const additionalWageEarnings = Math.round(additionalWageUnits * D);
  const totalEarnings = regularAttendanceEarnings + additionalWageEarnings;

  return {
    dailyWage: D,
    regularAttendanceUnits,
    additionalWageUnits,
    totalUnits,
    regularAttendanceEarnings,
    additionalWageEarnings,
    totalEarnings,
  };
}

export interface PeriodWageBreakdownResult {
  totalUnits: number;
  regularUnits: number;
  additionalUnits: number;
  regularEarnings: number;
  longShiftEarnings: number;
  grossEarnings: number;
}

/**
 * Centralized period wage calculator for a list of AttendanceRecords.
 * Uses the worker's current effective daily salary D so role default changes
 * and individual overrides immediately propagate without stale cached numbers,
 * and never counts any long-shift premium twice.
 */
export function calculatePeriodWageBreakdown(
  records: AttendanceRecord[],
  effectiveDailySalary: number,
): PeriodWageBreakdownResult {
  const D = Math.round(effectiveDailySalary);
  let totalUnits = 0;
  let regularUnits = 0;
  let additionalUnits = 0;
  let regularEarnings = 0;
  let longShiftEarnings = 0;

  for (const rec of records) {
    if (rec.status === 'Absent' || rec.status === 'Leave') continue;

    const rawUnits =
      rec.attendanceUnits ??
      (rec.status === 'Half Day'
        ? 0.5
        : rec.status === 'Present' || rec.status === 'Pending verification'
        ? 1.0
        : 0);
    const mult = rec.wageMultiplier ?? rawUnits;

    // Cap single-day multiplier to rawUnits so a 1.5x shift is 1.0 regular + 0.5 additional (never 1.5 + 0.5)
    const effectiveMult = Math.max(0, mult);
    const dayRegularMult = Math.min(1.0, effectiveMult);
    const dayAdditionalMult = Math.max(
      0,
      Math.round((effectiveMult - dayRegularMult) * 100) / 100,
    );

    const dayRegularWage = Math.round(D * dayRegularMult);
    const dayTotalWage = Math.round(D * effectiveMult);
    const dayAdditionalWage = Math.max(0, dayTotalWage - dayRegularWage);

    regularUnits += dayRegularMult;
    additionalUnits += dayAdditionalMult;
    totalUnits += effectiveMult;

    regularEarnings += dayRegularWage;
    longShiftEarnings += dayAdditionalWage;
  }

  return {
    totalUnits: Math.round(totalUnits * 100) / 100,
    regularUnits: Math.round(regularUnits * 100) / 100,
    additionalUnits: Math.round(additionalUnits * 100) / 100,
    regularEarnings: Math.round(regularEarnings),
    longShiftEarnings: Math.round(longShiftEarnings),
    grossEarnings: Math.round(regularEarnings + longShiftEarnings),
  };
}

export interface WeeklyWorkerPayPeriod {
  id: string;
  weekLabel: string;
  shortLabel: string;
  startDate: string;
  endDate: string;
  records: AttendanceRecord[];
  totalUnits: number;
  regularUnits: number;
  additionalUnits: number;
  regularEarnings: number;
  longShiftEarnings: number;
  grossEarnings: number;
  advancesAmount: number;
  approvedDeductionsAmount: number;
  netPayable: number;
  amountPaid: number;
  remainingBalance: number;
  paymentDate?: string;
  paymentMethod?: string;
  paymentReference?: string;
  paymentStatus: 'Paid' | 'Partially Paid' | 'Pending';
}

export const STANDARD_WEEK_WINDOWS = [
  {
    id: 'wk-nov-23-29',
    weekLabel: 'Week of 23 Nov – 29 Nov 2026 (Current Week)',
    shortLabel: '23 Nov – 29 Nov 2026',
    startDate: '2026-11-23',
    endDate: '2026-11-29',
  },
  {
    id: 'wk-nov-16-22',
    weekLabel: 'Week of 16 Nov – 22 Nov 2026',
    shortLabel: '16 Nov – 22 Nov 2026',
    startDate: '2026-11-16',
    endDate: '2026-11-22',
  },
];

/**
 * Shared generator for weekly worker pay periods used across both Worker Portal
 * and Owner Weekly Wages / Statements so there is zero duplicated calculation logic.
 */
export function computeWeeklyWorkerPayPeriods(
  worker: Worker,
  roleWageConfigs: RoleWageConfig[],
  attendanceRecords: AttendanceRecord[],
  workerAdvances: WorkerAdvance[],
  wagePayments: WagePayment[],
  weekWindows = STANDARD_WEEK_WINDOWS,
): WeeklyWorkerPayPeriod[] {
  const resolved = resolveEffectiveDailySalary(worker, roleWageConfigs);
  const myAttendance = attendanceRecords
    .filter((r) => r.workerId === worker.id)
    .sort((a, b) => b.date.localeCompare(a.date));
  const myAdvances = workerAdvances.filter((a) => a.workerId === worker.id);
  const myPayments = wagePayments
    .filter((p) => p.workerId === worker.id)
    .sort((a, b) => b.date.localeCompare(a.date));

  return weekWindows.map((win) => {
    const records = myAttendance.filter(
      (r) => r.date >= win.startDate && r.date <= win.endDate,
    );

    const breakdown = calculatePeriodWageBreakdown(records, resolved.dailySalary);

    const periodAdvances = myAdvances.filter(
      (a) => a.date >= win.startDate && a.date <= win.endDate,
    );

    const advancesAmount = periodAdvances
      .filter((a) => !a.reason.toLowerCase().includes('deduction'))
      .reduce((s, a) => s + a.amount, 0);

    const approvedDeductionsAmount = periodAdvances
      .filter(
        (a) => a.approvedDeduction && a.reason.toLowerCase().includes('deduction'),
      )
      .reduce((s, a) => s + a.amount, 0);

    const totalDeductionsAndAdvances = periodAdvances
      .filter((a) => a.approvedDeduction)
      .reduce((s, a) => s + a.amount, 0);

    const netPayable = Math.max(
      0,
      breakdown.grossEarnings - totalDeductionsAndAdvances,
    );

    const matchingPayments = myPayments.filter(
      (p) =>
        (p.date >= win.startDate && p.date <= win.endDate) ||
        p.periodLabel.includes(win.shortLabel),
    );
    const uniquePayments = Array.from(
      new Map(matchingPayments.map((p) => [p.id, p])).values(),
    );

    const amountPaid = uniquePayments.reduce((s, p) => s + p.amount, 0);
    const remainingBalance = Math.max(0, netPayable - amountPaid);
    const latestPay = uniquePayments[0];

    const paymentStatus: WeeklyWorkerPayPeriod['paymentStatus'] =
      amountPaid >= netPayable && netPayable > 0
        ? 'Paid'
        : amountPaid > 0
        ? 'Partially Paid'
        : 'Pending';

    return {
      id: win.id,
      weekLabel: win.weekLabel,
      shortLabel: win.shortLabel,
      startDate: win.startDate,
      endDate: win.endDate,
      records,
      totalUnits: breakdown.totalUnits,
      regularUnits: breakdown.regularUnits,
      additionalUnits: breakdown.additionalUnits,
      regularEarnings: breakdown.regularEarnings,
      longShiftEarnings: breakdown.longShiftEarnings,
      grossEarnings: breakdown.grossEarnings,
      advancesAmount,
      approvedDeductionsAmount,
      netPayable,
      amountPaid,
      remainingBalance,
      paymentDate: latestPay?.date,
      paymentMethod: latestPay?.mode,
      paymentReference: latestPay?.referenceNo,
      paymentStatus,
    };
  });
}

export interface AttendanceValidationResult {
  valid: boolean;
  isDuplicateSameSite: boolean;
  otherSiteEntries: AttendanceRecord[];
  combinedDailyUnits: number;
  hasTimeOverlap: boolean;
  errors: string[];
  warnings: string[];
}

export const MAX_DAILY_ATTENDANCE_UNITS = 1.5;

/**
 * Validates an attendance entry against existing records:
 * 1) Blocks accidental duplicate records for the same (workerId, projectId, date) unless updating that exact recordId.
 * 2) Allows multi-site allocation on the same date (e.g. Site A morning + Site B afternoon),
 *    while blocking overlapping shift windows or combined units exceeding MAX_DAILY_ATTENDANCE_UNITS (1.5).
 */
export function validateAttendanceEntry(
  candidate: {
    recordId?: string;
    workerId: string;
    projectId: string;
    date: string;
    status: AttendanceStatus;
    startTime?: string;
    endTime?: string;
    attendanceUnits: number;
  },
  existingRecords: AttendanceRecord[],
): AttendanceValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const sameWorkerSameDay = existingRecords.filter(
    (rec) =>
      rec.workerId === candidate.workerId &&
      rec.date === candidate.date &&
      rec.id !== candidate.recordId,
  );

  const duplicateSameSite = sameWorkerSameDay.find(
    (rec) => rec.projectId === candidate.projectId,
  );
  const isDuplicateSameSite = Boolean(duplicateSameSite);
  if (isDuplicateSameSite) {
    errors.push(
      'Attendance for this worker on this site and date already exists. Edit the existing entry instead of creating a duplicate.',
    );
  }

  const otherSiteEntries = sameWorkerSameDay.filter(
    (rec) => rec.projectId !== candidate.projectId && (rec.attendanceUnits ?? 0) > 0,
  );

  const otherUnits = otherSiteEntries.reduce(
    (sum, rec) =>
      sum +
      (rec.attendanceUnits ??
        (rec.status === 'Half Day' ? 0.5 : rec.status === 'Present' ? 1 : 0)),
    0,
  );
  const combinedDailyUnits =
    Math.round((otherUnits + candidate.attendanceUnits) * 100) / 100;

  let hasTimeOverlap = false;
  if (candidate.attendanceUnits > 0 && otherSiteEntries.length > 0) {
    hasTimeOverlap = otherSiteEntries.some((rec) =>
      doTimeRangesOverlap(
        candidate.startTime,
        candidate.endTime,
        rec.startTime,
        rec.endTime,
      ),
    );

    if (hasTimeOverlap) {
      errors.push(
        `Shift time (${candidate.startTime}–${candidate.endTime}) overlaps with another site allocation on ${candidate.date}. Adjust shift hours to avoid double-counting wages.`,
      );
    }

    if (combinedDailyUnits > MAX_DAILY_ATTENDANCE_UNITS) {
      errors.push(
        `Combined multi-site attendance (${combinedDailyUnits} units) exceeds the maximum ${MAX_DAILY_ATTENDANCE_UNITS} units/day limit.`,
      );
    } else if (!hasTimeOverlap) {
      warnings.push(
        `Multi-site day: worker also has ${otherUnits} unit(s) logged at another site (combined ${combinedDailyUnits} units).`,
      );
    }
  }

  return {
    valid: errors.length === 0,
    isDuplicateSameSite,
    otherSiteEntries,
    combinedDailyUnits,
    hasTimeOverlap,
    errors,
    warnings,
  };
}

export interface WorkerPayrollSummary {
  worker: Worker;
  effectiveDailySalary: number;
  salarySource: 'individual_override' | 'role_default';
  presentDays: number;
  longShiftDays: number;
  halfDays: number;
  absentDays: number;
  leaveDays: number;
  pendingVerificationDays: number;
  verifiedDays: number;
  totalUnits: number;
  regularUnits: number;
  additionalUnits: number;
  daysWorked: number; // alias for totalUnits for Stage 7 statement compatibility
  regularWages: number;
  additionalWages: number;
  grossWages: number;
  approvedAdvances: number;
  approvedDeductions: number;
  totalPaid: number;
  wagesPaid: number;
  netPayable: number;
  payrollStatus: 'Paid' | 'Partially Paid' | 'Pending';
}

/**
 * Derives a worker's full payroll totals strictly from their attendance records,
 * approved advances, and recorded wage payments using the centralized
 * calculatePeriodWageBreakdown engine (zero duplicated calculation logic).
 */
export function computeWorkerPayrollSummary(
  worker: Worker,
  roleWageConfigs: RoleWageConfig[],
  attendanceRecords: AttendanceRecord[],
  advances: WorkerAdvance[],
  wagePayments: WagePayment[],
): WorkerPayrollSummary {
  const resolved = resolveEffectiveDailySalary(worker, roleWageConfigs);
  const myRecords = attendanceRecords.filter((r) => r.workerId === worker.id);

  let presentDays = 0;
  let longShiftDays = 0;
  let halfDays = 0;
  let absentDays = 0;
  let leaveDays = 0;
  let pendingVerificationDays = 0;
  let verifiedDays = 0;

  for (const rec of myRecords) {
    const mult =
      rec.wageMultiplier ??
      rec.attendanceUnits ??
      (rec.status === 'Half Day'
        ? 0.5
        : rec.status === 'Present' || rec.status === 'Pending verification'
        ? 1.0
        : 0);

    if (rec.status === 'Present') {
      presentDays += 1;
      if (mult >= 1.5) longShiftDays += 1;
    } else if (rec.status === 'Half Day') {
      halfDays += 1;
    } else if (rec.status === 'Absent') {
      absentDays += 1;
    } else if (rec.status === 'Leave') {
      leaveDays += 1;
    } else if (rec.status === 'Pending verification') {
      pendingVerificationDays += 1;
    }

    if (rec.submissionStatus === 'Verified') {
      verifiedDays += 1;
    }
  }

  const breakdown = calculatePeriodWageBreakdown(myRecords, resolved.dailySalary);

  const approvedAdvances = advances
    .filter((a) => a.workerId === worker.id && a.approvedDeduction)
    .reduce((sum, a) => sum + a.amount, 0);

  const totalPaid = wagePayments
    .filter((p) => p.workerId === worker.id)
    .reduce((sum, p) => sum + p.amount, 0);

  const netPayableAfterAdvances = Math.max(
    0,
    Math.round(breakdown.grossEarnings - approvedAdvances),
  );
  const netPayable = Math.max(0, netPayableAfterAdvances - totalPaid);

  const payrollStatus: WorkerPayrollSummary['payrollStatus'] =
    totalPaid >= netPayableAfterAdvances && netPayableAfterAdvances > 0
      ? 'Paid'
      : totalPaid > 0
      ? 'Partially Paid'
      : 'Pending';

  return {
    worker: {
      ...worker,
      dailyWage: resolved.dailySalary,
    },
    effectiveDailySalary: resolved.dailySalary,
    salarySource: resolved.source,
    presentDays,
    longShiftDays,
    halfDays,
    absentDays,
    leaveDays,
    pendingVerificationDays,
    verifiedDays,
    totalUnits: breakdown.totalUnits,
    regularUnits: breakdown.regularUnits,
    additionalUnits: breakdown.additionalUnits,
    daysWorked: breakdown.totalUnits,
    regularWages: breakdown.regularEarnings,
    additionalWages: breakdown.longShiftEarnings,
    grossWages: breakdown.grossEarnings,
    approvedAdvances,
    approvedDeductions: approvedAdvances,
    totalPaid,
    wagesPaid: totalPaid,
    netPayable,
    payrollStatus,
  };
}
