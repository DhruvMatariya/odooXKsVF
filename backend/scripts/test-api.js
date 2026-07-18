#!/usr/bin/env node
// Use native fetch in Node.js

const BASE = 'http://localhost:5001/api/v1';

async function main() {
  console.log('=== Testing API ===\n');
  
  // Test categories
  console.log('1. Testing /categories...');
  const catsRes = await fetch(`${BASE}/categories`);
  const cats = await catsRes.json();
  console.log(`   ✓ Categories: ${JSON.stringify(cats, null, 2)}`);
  
  // Test products
  console.log('\n2. Testing /products...');
  const productsRes = await fetch(`${BASE}/products?page=1&limit=10`);
  const products = await productsRes.json();
  console.log(`   ✓ Products: ${JSON.stringify(products, null, 2)}`);
  
  // Test product detail
  if (products.data && products.data.length > 0) {
    const firstProduct = products.data[0];
    console.log(`\n3. Testing /products/${firstProduct.id}...`);
    const detailRes = await fetch(`${BASE}/products/${firstProduct.id}`);
    const detail = await detailRes.json();
    console.log(`   ✓ Product detail: ${JSON.stringify(detail, null, 2)}`);
  }
  
  console.log('\n=== API Test Complete ===');
}

main().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
