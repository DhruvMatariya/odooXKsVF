#!/usr/bin/env node
// Smoke test for Catalog Service
// Run after: npm run migrate && npm run seed:categories
// Usage: node scripts/smoke-test.js

import fetch from 'node-fetch';

const BASE = 'http://localhost:3000/api/v1';

async function request(method, path, body, token) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (body) opts.body = JSON.stringify(body);
  if (token) opts.headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, opts);
  const data = await res.json();
  if (!res.ok) throw new Error(`${method} ${path}: ${res.status} ${JSON.stringify(data)}`);
  return data;
}

async function main() {
  console.log('=== CATALOG SERVICE SMOKE TEST ===\n');

  // 1. Register vendor
  console.log('1. Register vendor...');
  const vendorReg = await request('POST', '/auth/register', {
    role: 'vendor',
    fullName: 'Test Vendor',
    email: `vendor_${Date.now()}@test.com`,
    password: 'Password123!',
    companyName: 'Test Rental Co',
    gstNumber: '27AAECS1234A1Z5',
    productCategory: 'Cameras',
  });
  const vendorToken = vendorReg.data.accessToken;
  const vendorId = vendorReg.data.id;
  console.log('   ✓ Vendor registered:', vendorId);

  // 2. Register customer
  console.log('2. Register customer...');
  const custReg = await request('POST', '/auth/register', {
    role: 'customer',
    fullName: 'Test Customer',
    email: `cust_${Date.now()}@test.com`,
    password: 'Password123!',
  });
  const custToken = custReg.data.accessToken;
  console.log('   ✓ Customer registered:', custReg.data.id);

  // 3. Get categories (public)
  console.log('3. GET /categories (public)...');
  const cats = await request('GET', '/categories');
  console.log('   ✓ Categories:', cats.data.map(c => c.name).join(', '));
  const cameraCat = cats.data.find(c => c.name === 'Cameras');
  if (!cameraCat) throw new Error('Cameras category not found');

  // 4. Vendor creates product
  console.log('4. POST /products (vendor)...');
  const product = await request('POST', '/products', {
    categoryId: cameraCat.id,
    name: 'Canon EOS R5',
    description: 'Professional mirrorless camera',
    brand: 'Canon',
    manufacturer: 'Canon Inc.',
    thumbnail: 'https://example.com/canon-r5.jpg',
    images: ['https://example.com/canon-r5-1.jpg', 'https://example.com/canon-r5-2.jpg'],
  }, vendorToken);
  const productId = product.data.id;
  console.log('   ✓ Product created:', productId);

  // 5. Vendor sets pricing
  console.log('5. POST /products/:id/pricing (vendor)...');
  const pricing = await request('POST', `/products/${productId}/pricing`, {
    period: 'DAY',
    duration: 1,
    price: 5000, // $50.00
    deposit: 10000, // $100.00
  }, vendorToken);
  console.log('   ✓ Pricing created:', pricing.data.id);

  // 6. Public lists products
  console.log('6. GET /products (public)...');
  const list = await request('GET', '/products?page=1&limit=10');
  console.log('   ✓ Products found:', list.meta.total);
  console.log('   ✓ First product:', list.data[0]?.name);

  // 7. Public gets product detail (aggregated)
  console.log('7. GET /products/:id (public)...');
  const detail = await request('GET', `/products/${productId}`);
  console.log('   ✓ Product detail:', detail.data.name);
  console.log('   ✓ Has inventory:', !!detail.data.inventory);
  console.log('   ✓ Has pricing:', !!detail.data.pricing?.length);
  console.log('   ✓ Has category:', !!detail.data.category);
  console.log('   ✓ Has vendor:', !!detail.data.vendor);
  console.log('   ✓ Has lateFeeRule:', !!detail.data.lateFeeRule);
  console.log('   ✓ Has cancellationPolicy:', !!detail.data.cancellationPolicy);

  // 8. Vendor updates inventory
  console.log('8. PATCH /products/:id/inventory (vendor)...');
  const inv = await request('PATCH', `/products/${productId}/inventory`, {
    available: 5,
    maintenance: 1,
  }, vendorToken);
  console.log('   ✓ Inventory updated:', inv.data);

  // 9. GET inventory
  console.log('9. GET /products/:id/inventory...');
  const invGet = await request('GET', `/products/${productId}/inventory`);
  console.log('   ✓ Inventory:', invGet.data);

  // 10. Vendor updates product
  console.log('10. PATCH /products/:id (vendor)...');
  await request('PATCH', `/products/${productId}`, {
    description: 'Updated description',
    brand: 'Canon Updated',
  }, vendorToken);
  console.log('   ✓ Product updated');

  // 11. Vendor creates return slot
  console.log('11. POST /vendor/return-slots (vendor)...');
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
  const slot = await request('POST', '/vendor/return-slots', {
    date: tomorrow,
    slotLabel: 'MORNING',
    capacity: 10,
  }, vendorToken);
  console.log('   ✓ Return slot created:', slot.data.id);

  // 12. GET return slots
  console.log('12. GET /vendor/return-slots?date=... (vendor)...');
  const slots = await request('GET', `/vendor/return-slots?date=${tomorrow}`, null, vendorToken);
  console.log('   ✓ Slots:', slots.data.length);

  // 13. Vendor sets late fee rule
  console.log('13. PUT /vendor/late-fee-rule (vendor)...');
  await request('PUT', '/vendor/late-fee-rule', {
    gracePeriodHours: 2,
    rateType: 'HOURLY',
    rateAmount: 500,
    maxCap: 5000,
  }, vendorToken);
  console.log('   ✓ Late fee rule set');

  // 14. Vendor sets cancellation policy
  console.log('14. PUT /vendor/cancellation-policy (vendor)...');
  await request('PUT', '/vendor/cancellation-policy', {
    fullRefundHoursBefore: 48,
    partialRefundHoursBefore: 12,
    partialRefundPercent: 75,
  }, vendorToken);
  console.log('   ✓ Cancellation policy set');

  // 15. Vendor soft-deletes product
  console.log('15. DELETE /products/:id (vendor)...');
  await request('DELETE', `/products/${productId}`, null, vendorToken);
  console.log('   ✓ Product soft-deleted');

  // Verify product no longer in public list
  const listAfter = await request('GET', `/products?search=Canon`);
  const found = listAfter.data.find(p => p.id === productId);
  if (found) throw new Error('Deleted product still visible');
  console.log('   ✓ Product hidden from public list');

  console.log('\n=== ALL TESTS PASSED ===');
}

main().catch(err => {
  console.error('\n=== TEST FAILED ===');
  console.error(err.message);
  process.exit(1);
});