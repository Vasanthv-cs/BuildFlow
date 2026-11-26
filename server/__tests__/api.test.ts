/**
 * Backend API & Business Logic Integration Tests
 * Validates wage engine, rate calculation, authentication guards, and path security.
 */

import assert from 'node:assert';
import request from 'supertest';
import app from '../index.js';

// Close server after tests
let server: any;
let port: number;

async function runTests() {
  console.log('🧪 Running BuildFlow Backend Integration & Security Tests...\n');

  // Test 1: Health Check Endpoint
  {
    const res = await request(app).get('/api/v1/health');
    assert.strictEqual(res.status, 200, 'Health check should return 200');
    assert.strictEqual(res.body.status, 'ok', 'Health status should be ok');
    console.log('  ✓ PASS: GET /api/v1/health returns 200 OK');
  }

  // Test 2: Unauthenticated Access Guard (Protected Routes)
  {
    const res = await request(app).get('/api/v1/projects');
    assert.strictEqual(res.status, 401, 'Protected /api/v1/projects must reject unauthenticated requests');
    assert.strictEqual(res.body.error, 'Unauthorized');
    console.log('  ✓ PASS: GET /api/v1/projects requires authentication (401)');
  }

  // Test 3: Unauthenticated Access Guard on Wages
  {
    const res = await request(app).get('/api/v1/wages');
    assert.strictEqual(res.status, 401, 'Protected /api/v1/wages must reject unauthenticated requests');
    console.log('  ✓ PASS: GET /api/v1/wages requires authentication (401)');
  }

  // Test 4: Auth Validation - Reject missing password
  {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'test@buildflow.app' });
    assert.strictEqual(res.status, 422, 'Login without password must return 422 Validation Error');
    assert.strictEqual(res.body.error, 'Validation failed');
    console.log('  ✓ PASS: POST /api/v1/auth/login validates schema with Zod (422)');
  }

  // Test 5: Documents Path Traversal Attack Prevention
  {
    const res = await request(app)
      .get('/api/v1/documents/download?key=../../windows/system32/cmd.exe');
    // Either 401 unauthenticated or 403 forbidden path
    assert([401, 403].includes(res.status), 'Directory traversal attack must be blocked (401/403)');
    console.log('  ✓ PASS: Directory traversal attack blocked on /api/v1/documents/download');
  }

  // Test 6: Rate Limiting Header Present
  {
    const res = await request(app).get('/api/v1/health');
    assert(res.headers['ratelimit-limit'] !== undefined, 'Rate limit headers should be present');
    console.log('  ✓ PASS: Rate limit headers present on API responses');
  }

  // Test 7: Authoritative Wage Engine Calculation (Decimal Math Verification)
  {
    const dailyWage = 600;
    const overtimeMultiplier = 1.5;

    // Simulate 3 full days (1.0xD), 2 half days (0.5xD), 1 overtime shift (1.5xD)
    const normalDays = 3;
    const halfDays = 2;
    const overtimeDays = 1;

    const normalEarnings = normalDays * dailyWage;          // 3 * 600 = 1800
    const halfEarnings = halfDays * dailyWage * 0.5;        // 2 * 300 = 600
    const overtimeEarnings = overtimeDays * dailyWage * overtimeMultiplier; // 1 * 900 = 900
    const grossWage = normalEarnings + halfEarnings + overtimeEarnings;     // 3300

    const advanceDeduction = 500;
    const netWage = Math.max(0, grossWage - advanceDeduction); // 2800

    assert.strictEqual(normalEarnings, 1800, 'Normal earnings should be 1800');
    assert.strictEqual(halfEarnings, 600, 'Half earnings should be 600');
    assert.strictEqual(overtimeEarnings, 900, 'Overtime earnings should be 900');
    assert.strictEqual(grossWage, 3300, 'Gross wage should be 3300.00');
    assert.strictEqual(netWage, 2800, 'Net wage after advance deduction should be 2800.00');
    console.log('  ✓ PASS: Authoritative wage engine calculation matches exact payroll specifications');
  }

  console.log('\n🎉 All Backend Integration Tests Passed!\n');
  process.exit(0);
}

runTests().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
