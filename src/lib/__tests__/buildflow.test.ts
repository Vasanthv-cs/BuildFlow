import assert from 'node:assert/strict';
import {
  calculateAttendanceWage,
  calculatePeriodWageBreakdown,
  calculateScheduleWageTally,
  calculateShiftExamplesForDailyWage,
  computeWeeklyWorkerPayPeriods,
  computeWorkerPayrollSummary,
  resolveEffectiveDailySalary,
} from '../wageCalculations';
import {
  canUserAccessPath,
  canUserAccessProject,
  getRolePermissions,
  ROLE_NAV_GROUPS,
} from '../../config/permissions';
import {
  DEMO_USERS,
  INITIAL_ROLE_WAGE_CONFIGS,
  INITIAL_SHIFT_RULES,
} from '../../data/workforceMockData';
import type { AttendanceRecord, RoleWageConfig, Worker } from '../../types';

let passed = 0;

function runTest(name: string, fn: () => void) {
  fn();
  passed += 1;
  console.log(`PASS: ${name}`);
}

// 1. Salary calculation validation for configurable daily wage D
runTest('Salary Calculation Validation: Normal, Long, Half, 3 Long, 3 Normal, and Composite 7.5xD without double-counting', () => {
  for (const D of [800, 950, 1000, 1250]) {
    const examples = calculateShiftExamplesForDailyWage(D);

    // Normal 9 AM–6 PM day = 1.0 × D
    assert.equal(examples.normalDay, Math.round(1.0 * D));
    // 6 AM–6 PM long day = 1.5 × D
    assert.equal(examples.longDay, Math.round(1.5 * D));
    // Half day = 0.5 × D
    assert.equal(examples.halfDay, Math.round(0.5 * D));
    // Three long days = 4.5 × D
    assert.equal(examples.threeLongDays, Math.round(4.5 * D));
    // Three normal days = 3.0 × D
    assert.equal(examples.threeNormalDays, Math.round(3.0 * D));

    // Composite example: 3 long days, 1 normal day with 0.5 additional wage unit, and 3 normal days
    // Regular attendance earnings = 7 × D
    // Additional wage = 0.5 × D
    // Total = 7.5 × D (does not count the same long-shift premium twice)
    const composite = calculateScheduleWageTally(D, {
      longDays: 3,
      normalDaysWithHalfAdditionalUnit: 1,
      normalDays: 3,
    });

    assert.equal(composite.regularAttendanceUnits, 7);
    assert.equal(composite.additionalWageUnits, 0.5);
    assert.equal(composite.totalUnits, 7.5);
    assert.equal(composite.regularAttendanceEarnings, Math.round(7 * D));
    assert.equal(composite.additionalWageEarnings, Math.round(0.5 * D));
    assert.equal(composite.totalEarnings, Math.round(7.5 * D));
  }
});

// 2. Shift Rule Matching (9 AM–6 PM = 1.0xD, 6 AM–6 PM = 1.5xD, Half Day = 0.5xD)
runTest('Shift Rule Matching: 09:00-18:00 (1.0xD), 06:00-18:00 (1.5xD), Half Day (0.5xD)', () => {
  const D = 1000;
  const mockWorker: Pick<Worker, 'role' | 'individualDailySalary' | 'dailyWage'> = {
    role: 'Mason / Masteri',
    individualDailySalary: D,
    dailyWage: D,
  };

  const normalShift = calculateAttendanceWage({
    worker: mockWorker,
    roleWageConfigs: INITIAL_ROLE_WAGE_CONFIGS,
    status: 'Present',
    shiftRules: INITIAL_SHIFT_RULES,
    startTime: '09:00',
    endTime: '18:00',
  });
  assert.equal(normalShift.wageMultiplier, 1.0);
  assert.equal(normalShift.calculatedWage, 1000);

  const longShift = calculateAttendanceWage({
    worker: mockWorker,
    roleWageConfigs: INITIAL_ROLE_WAGE_CONFIGS,
    status: 'Present',
    shiftRules: INITIAL_SHIFT_RULES,
    startTime: '06:00',
    endTime: '18:00',
  });
  assert.equal(longShift.wageMultiplier, 1.5);
  assert.equal(longShift.calculatedWage, 1500);

  const halfDayShift = calculateAttendanceWage({
    worker: mockWorker,
    roleWageConfigs: INITIAL_ROLE_WAGE_CONFIGS,
    status: 'Half Day',
    shiftRules: INITIAL_SHIFT_RULES,
  });
  assert.equal(halfDayShift.wageMultiplier, 0.5);
  assert.equal(halfDayShift.calculatedWage, 500);
});

// 3. Role Default vs Individual Wage Override Propagation
runTest('Role Default Wage Change & Individual Salary Override Propagation across Payroll & Weekly Periods', () => {
  const baseWorker: Worker = {
    id: 'wrk-test-1',
    workerCode: 'WRK-901',
    name: 'Ramesh Naik',
    phone: '+91 98450 11223',
    role: 'Mason / Masteri',
    dailyWage: 950,
    individualDailySalary: null,
    joinedDate: '2026-11-01',
    assignedProjectId: 'proj-1',
    active: true,
    attendanceToday: 'Present',
    daysWorkedThisMonth: 2,
    pendingWages: 0,
  };

  const sampleAttendance: AttendanceRecord[] = [
    {
      id: 'att-t1',
      workerId: 'wrk-test-1',
      projectId: 'proj-1',
      date: '2026-11-23',
      status: 'Present',
      shiftName: 'Normal Working Day',
      startTime: '09:00',
      endTime: '18:00',
      breakDurationMinutes: 60,
      attendanceUnits: 1.0,
      wageMultiplier: 1.0,
      effectiveDailyRate: 950,
      calculatedWage: 950,
      submissionStatus: 'Verified',
    },
    {
      id: 'att-t2',
      workerId: 'wrk-test-1',
      projectId: 'proj-1',
      date: '2026-11-24',
      status: 'Present',
      shiftName: 'Long Working Day (6 AM – 6 PM)',
      startTime: '06:00',
      endTime: '18:00',
      breakDurationMinutes: 60,
      attendanceUnits: 1.5,
      wageMultiplier: 1.5,
      effectiveDailyRate: 950,
      calculatedWage: 1425,
      submissionStatus: 'Verified',
    },
  ];

  // Initial role default for Mason / Masteri in INITIAL_ROLE_WAGE_CONFIGS is 900 -> 2.5 units * 900 = 2250
  const initialSummary = computeWorkerPayrollSummary(
    baseWorker,
    INITIAL_ROLE_WAGE_CONFIGS,
    sampleAttendance,
    [],
    [],
  );
  assert.equal(initialSummary.salarySource, 'role_default');
  assert.equal(initialSummary.effectiveDailySalary, 900);
  assert.equal(initialSummary.totalUnits, 2.5);
  assert.equal(initialSummary.grossWages, Math.round(2.5 * 900));

  // Owner updates Mason / Masteri default wage to 1100 -> Worker on role default reflects 1100 immediately
  const updatedRoleConfigs: RoleWageConfig[] = INITIAL_ROLE_WAGE_CONFIGS.map((c) =>
    c.role === 'Mason / Masteri' ? { ...c, defaultDailySalary: 1100 } : c,
  );
  const updatedDefaultSummary = computeWorkerPayrollSummary(
    baseWorker,
    updatedRoleConfigs,
    sampleAttendance,
    [],
    [],
  );
  assert.equal(updatedDefaultSummary.effectiveDailySalary, 1100);
  assert.equal(updatedDefaultSummary.grossWages, Math.round(2.5 * 1100));

  const periodsAfterRoleChange = computeWeeklyWorkerPayPeriods(
    baseWorker,
    updatedRoleConfigs,
    sampleAttendance,
    [],
    [],
  );
  assert.equal(periodsAfterRoleChange[0].grossEarnings, Math.round(2.5 * 1100));

  // Owner sets individual override of 1300 -> Worker uses 1300 regardless of role default
  const overrideWorker: Worker = {
    ...baseWorker,
    individualDailySalary: 1300,
  };
  const resolvedOverride = resolveEffectiveDailySalary(overrideWorker, updatedRoleConfigs);
  assert.equal(resolvedOverride.source, 'individual_override');
  assert.equal(resolvedOverride.dailySalary, 1300);

  const periodBreakdown = calculatePeriodWageBreakdown(sampleAttendance, 1300);
  assert.equal(periodBreakdown.grossEarnings, Math.round(2.5 * 1300));
  assert.equal(periodBreakdown.regularEarnings, Math.round(2.0 * 1300));
  assert.equal(periodBreakdown.longShiftEarnings, Math.round(0.5 * 1300));
});

// 4. Role-Based Access Control & Navigation for all 4 roles
runTest('Role-Based Access Control: Owner, Supervisor, Worker, and Client permissions and route guards', () => {
  const owner = DEMO_USERS.find((u) => u.role === 'owner')!;
  const supervisor = DEMO_USERS.find((u) => u.role === 'supervisor')!;
  const worker = DEMO_USERS.find((u) => u.role === 'worker')!;
  const client = DEMO_USERS.find((u) => u.role === 'client')!;

  // Navigation groups exist for all 4 roles
  assert.ok(ROLE_NAV_GROUPS.owner.length > 0);
  assert.ok(ROLE_NAV_GROUPS.supervisor.length > 0);
  assert.ok(ROLE_NAV_GROUPS.worker.length > 0);
  assert.ok(ROLE_NAV_GROUPS.client.length > 0);

  // Owner has full access
  const ownerPerms = getRolePermissions('owner');
  assert.equal(ownerPerms.canEditWageRates, true);
  assert.equal(ownerPerms.canApprovePayroll, true);
  assert.equal(ownerPerms.canEditClientCredentials, true);
  assert.equal(canUserAccessPath(owner, '/'), true);
  assert.equal(canUserAccessPath(owner, '/wage-config'), true);
  assert.equal(canUserAccessPath(owner, '/clients'), true);
  assert.equal(canUserAccessPath(owner, '/reports'), true);

  // Supervisor can access assigned sites & attendance, but cannot edit wage rates, client credentials, or approved payroll
  const supPerms = getRolePermissions('supervisor');
  assert.equal(supPerms.canSubmitAttendance, true);
  assert.equal(supPerms.canEditWageRates, false);
  assert.equal(supPerms.canApprovePayroll, false);
  assert.equal(supPerms.canEditClientCredentials, false);
  assert.equal(canUserAccessPath(supervisor, '/supervisor'), true);
  assert.equal(canUserAccessPath(supervisor, '/attendance'), true);
  assert.equal(canUserAccessPath(supervisor, '/wage-config'), false);
  assert.equal(canUserAccessPath(supervisor, '/weekly-wages'), false);
  assert.equal(canUserAccessPath(supervisor, '/clients'), false);
  assert.equal(canUserAccessProject(supervisor, 'proj-1'), true);
  assert.equal(canUserAccessProject(supervisor, 'proj-2'), true);
  assert.equal(canUserAccessProject(supervisor, 'proj-3'), false);

  // Worker can only access /worker/* routes and cannot edit salary or see owner/client pages
  const wrkPerms = getRolePermissions('worker');
  assert.equal(wrkPerms.canEditWageRates, false);
  assert.equal(wrkPerms.canSubmitAttendance, false);
  assert.equal(canUserAccessPath(worker, '/worker'), true);
  assert.equal(canUserAccessPath(worker, '/worker/attendance'), true);
  assert.equal(canUserAccessPath(worker, '/worker/salary'), true);
  assert.equal(canUserAccessPath(worker, '/worker/statements'), true);
  assert.equal(canUserAccessPath(worker, '/'), false);
  assert.equal(canUserAccessPath(worker, '/supervisor'), false);
  assert.equal(canUserAccessPath(worker, '/client'), false);

  // Client can only access /client/* routes and only their assigned project
  const cliPerms = getRolePermissions('client');
  assert.equal(cliPerms.canViewAllWorkerSalaries, false);
  assert.equal(canUserAccessPath(client, '/client'), true);
  assert.equal(canUserAccessPath(client, '/client/project'), true);
  assert.equal(canUserAccessPath(client, '/client/payments'), true);
  assert.equal(canUserAccessPath(client, '/workforce'), false);
  assert.equal(canUserAccessPath(client, '/weekly-wages'), false);
  assert.equal(canUserAccessProject(client, 'proj-1'), true);
  assert.equal(canUserAccessProject(client, 'proj-3'), false);
});

console.log(`\nAll ${passed} BuildFlow frontend test suites passed.`);
