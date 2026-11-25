/**
 * Prisma seed — populates the database with initial owner and demo accounts
 * Run with: npm run db:seed
 */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding BuildFlow database...');

  const saltRounds = 12;

  // ── Create Owner ────────────────────────────────────────────────────────────
  const ownerHash = await bcrypt.hash('Admin@1234', saltRounds);
  const owner = await prisma.user.upsert({
    where: { email: 'owner@buildflow.app' },
    update: {},
    create: {
      email: 'owner@buildflow.app',
      name: 'BuildFlow Owner',
      passwordHash: ownerHash,
      role: 'owner',
      isActive: true,
    },
  });
  console.log('  ✓ Owner:', owner.email);

  // ── Create Admin ─────────────────────────────────────────────────────────────
  const adminHash = await bcrypt.hash('Admin@1234', saltRounds);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@buildflow.app' },
    update: {},
    create: {
      email: 'admin@buildflow.app',
      name: 'BuildFlow Admin',
      passwordHash: adminHash,
      role: 'admin',
      isActive: true,
    },
  });
  console.log('  ✓ Admin:', admin.email);

  // ── Create Demo Supervisor ────────────────────────────────────────────────────
  const supHash = await bcrypt.hash('Supervisor@1234', saltRounds);
  const supervisorUser = await prisma.user.upsert({
    where: { email: 'supervisor@buildflow.app' },
    update: {},
    create: {
      email: 'supervisor@buildflow.app',
      name: 'Ravi Kumar',
      passwordHash: supHash,
      role: 'supervisor',
      isActive: true,
    },
  });
  await prisma.worker.upsert({
    where: { userId: supervisorUser.id },
    update: {},
    create: {
      userId: supervisorUser.id,
      name: 'Ravi Kumar',
      role: 'Supervisor',
      phone: '9876543210',
      dailyWage: '1200.00',
      overtimeMultiplier: '1.5',
      isActive: true,
    },
  });
  console.log('  ✓ Supervisor:', supervisorUser.email);

  // ── Create Demo Worker ────────────────────────────────────────────────────────
  const workerHash = await bcrypt.hash('Worker@1234', saltRounds);
  const workerUser = await prisma.user.upsert({
    where: { email: 'worker@buildflow.app' },
    update: {},
    create: {
      email: 'worker@buildflow.app',
      name: 'Suresh Patel',
      passwordHash: workerHash,
      role: 'worker',
      isActive: true,
    },
  });
  await prisma.worker.upsert({
    where: { userId: workerUser.id },
    update: {},
    create: {
      userId: workerUser.id,
      name: 'Suresh Patel',
      role: 'Mason',
      phone: '9876543211',
      dailyWage: '600.00',
      overtimeMultiplier: '1.5',
      skills: ['Masonry', 'Plastering'],
      isActive: true,
    },
  });
  console.log('  ✓ Worker:', workerUser.email);

  // ── Create Demo Client ────────────────────────────────────────────────────────
  const clientHash = await bcrypt.hash('Client@1234', saltRounds);
  const clientUser = await prisma.user.upsert({
    where: { email: 'client@buildflow.app' },
    update: {},
    create: {
      email: 'client@buildflow.app',
      name: 'Amit Sharma',
      passwordHash: clientHash,
      role: 'client',
      isActive: true,
    },
  });
  const clientRecord = await prisma.client.upsert({
    where: { userId: clientUser.id },
    update: {},
    create: {
      userId: clientUser.id,
      name: 'Amit Sharma',
      email: 'client@buildflow.app',
      phone: '9876543212',
      address: 'Mumbai, Maharashtra',
      isActive: true,
    },
  });
  console.log('  ✓ Client:', clientUser.email);

  // ── Create Demo Project ───────────────────────────────────────────────────────
  const demoProject = await prisma.project.upsert({
    where: { id: 'proj-demo-001' },
    update: {},
    create: {
      id: 'proj-demo-001',
      name: 'Sharma Residence - 2BHK',
      clientId: clientRecord.id,
      status: 'active',
      budget: '4500000.00',
      address: 'Andheri West, Mumbai',
      description: 'Two bedroom residential construction project',
      startDate: new Date('2026-01-15'),
      endDate: new Date('2026-12-31'),
    },
  });
  console.log('  ✓ Demo project:', demoProject.name);

  // ── Create Demo Supplier ──────────────────────────────────────────────────────
  const supplier = await prisma.supplier.upsert({
    where: { id: 'sup-demo-001' },
    update: {},
    create: {
      id: 'sup-demo-001',
      name: 'BuildMart Supplies',
      contactPerson: 'Ramesh Gupta',
      phone: '9876543299',
      email: 'supplies@buildmart.com',
      category: 'Building Materials',
      isActive: true,
    },
  });
  console.log('  ✓ Demo supplier:', supplier.name);

  // ── Create Demo Material ──────────────────────────────────────────────────────
  await prisma.material.upsert({
    where: { id: 'mat-demo-001' },
    update: {},
    create: {
      id: 'mat-demo-001',
      name: 'OPC Cement (50kg bags)',
      unit: 'bags',
      category: 'Cement',
      minimumStock: '50',
      currentStock: '120',
      unitCost: '380.00',
    },
  });
  console.log('  ✓ Demo material created');

  console.log('\n✅ Seed complete!');
  console.log('\nDemo credentials:');
  console.log('  Owner:      owner@buildflow.app      / Admin@1234');
  console.log('  Admin:      admin@buildflow.app       / Admin@1234');
  console.log('  Supervisor: supervisor@buildflow.app  / Supervisor@1234');
  console.log('  Worker:     worker@buildflow.app      / Worker@1234');
  console.log('  Client:     client@buildflow.app      / Client@1234');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
