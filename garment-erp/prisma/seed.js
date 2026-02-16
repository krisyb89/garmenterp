// prisma/seed.js
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

// Guard: never run in production unless explicitly allowed
if (
  process.env.NODE_ENV === 'production' &&
  process.env.ALLOW_SEED !== 'true'
) {
  console.error(
    '⛔ Seed blocked in production. Set ALLOW_SEED=true in Replit Secrets to run once, then remove it.'
  );
  process.exit(1);
}

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create admin user
  const adminPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@garment-erp.com' },
    update: {},
    create: {
      email: 'admin@garment-erp.com',
      passwordHash: adminPassword,
      name: 'System Admin',
      role: 'ADMIN',
    },
  });

  // Create sample merchandiser
  const merchPassword = await bcrypt.hash('merch123', 10);
  const merchandiser = await prisma.user.upsert({
    where: { email: 'merch@garment-erp.com' },
    update: {},
    create: {
      email: 'merch@garment-erp.com',
      passwordHash: merchPassword,
      name: 'John Merchandiser',
      role: 'MERCHANDISER',
    },
  });

  // Create sample customers
  const customer1 = await prisma.customer.upsert({
    where: { code: 'NK' },
    update: {},
    create: {
      name: 'Nike Inc.',
      code: 'NK',
      contactPerson: 'Sarah Johnson',
      email: 'sarah@nike.com',
      country: 'US',
      currency: 'USD',
      paymentTermDays: 60,
      paymentTermBasis: 'ROG',
    },
  });

  const customer2 = await prisma.customer.upsert({
    where: { code: 'ZR' },
    update: {},
    create: {
      name: 'Zara / Inditex',
      code: 'ZR',
      contactPerson: 'Maria Garcia',
      email: 'maria@zara.com',
      country: 'ES',
      currency: 'EUR',
      paymentTermDays: 90,
      paymentTermBasis: 'ROG',
    },
  });

  // Create sample suppliers
  const supplier1 = await prisma.supplier.upsert({
    where: { code: 'LTF' },
    update: {},
    create: {
      name: 'Lutai Textile',
      code: 'LTF',
      type: 'FABRIC_MILL',
      country: 'China',
      currency: 'CNY',
      paymentTerms: 'TT 30 days',
      leadTimeDays: 45,
    },
  });

  const supplier2 = await prisma.supplier.upsert({
    where: { code: 'YKK' },
    update: {},
    create: {
      name: 'YKK Zipper',
      code: 'YKK',
      type: 'TRIM_SUPPLIER',
      country: 'Japan',
      currency: 'USD',
      paymentTerms: 'TT 30 days',
      leadTimeDays: 21,
    },
  });

  // Create sample factories
  const factory1 = await prisma.factory.upsert({
    where: { code: 'HQ-FAC' },
    update: {},
    create: {
      name: 'HQ Factory',
      code: 'HQ-FAC',
      country: 'China',
      isInHouse: true,
      capacity: '10000 pcs/month',
      specialties: 'Woven shirts, Blouses',
    },
  });

  const factory2 = await prisma.factory.upsert({
    where: { code: 'VN-01' },
    update: {},
    create: {
      name: 'Vietnam Partner Factory',
      code: 'VN-01',
      country: 'Vietnam',
      isInHouse: false,
      capacity: '20000 pcs/month',
      specialties: 'Knits, Activewear',
    },
  });

  // Create sample materials
  const fabric1 = await prisma.material.upsert({
    where: { code: 'FAB-001' },
    update: {},
    create: {
      code: 'FAB-001',
      name: 'Cotton Poplin 133x72',
      type: 'FABRIC',
      composition: '100% Cotton',
      weight: '120 GSM',
      width: '58 inches',
      unitOfMeasure: 'YDS',
    },
  });

  const trim1 = await prisma.material.upsert({
    where: { code: 'TRM-001' },
    update: {},
    create: {
      code: 'TRM-001',
      name: 'Woven Main Label',
      type: 'LABEL',
      unitOfMeasure: 'PCS',
    },
  });

  // System settings
  const settings = [
    { key: 'company_name', value: 'Garment Trading Co.', description: 'Company display name' },
    { key: 'base_currency', value: 'USD', description: 'Base reporting currency' },
    { key: 'default_wastage_percent', value: '3', description: 'Default fabric wastage %' },
    { key: 'default_aql_level', value: '2.5', description: 'Default AQL inspection level' },
    { key: 'po_prefix', value: 'PO', description: 'Purchase order number prefix' },
    { key: 'srs_prefix', value: 'SRS', description: 'SRS number prefix' },
  ];

  for (const setting of settings) {
    await prisma.systemSetting.upsert({
      where: { key: setting.key },
      update: { value: setting.value },
      create: setting,
    });
  }

  console.log('✅ Seed complete');
  console.log('Admin login: admin@garment-erp.com / admin123');
  console.log('Merch login: merch@garment-erp.com / merch123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
