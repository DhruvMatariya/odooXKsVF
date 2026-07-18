#!/usr/bin/env node
import pool from '../src/config/db.js';

async function checkDb() {
  try {
    console.log('=== Checking Database ===\n');

    // Check categories
    const categories = await pool.query('SELECT * FROM categories');
    console.log(`Categories found: ${categories.rows.length}`);
    categories.rows.forEach(c => console.log(`  - ${c.id}: ${c.name}`));

    // Check products
    const products = await pool.query('SELECT * FROM products WHERE is_deleted = false');
    console.log(`\nProducts found: ${products.rows.length}`);
    products.rows.forEach(p => {
      console.log(`  - ${p.id}: ${p.name} (status: ${p.status}, vendor: ${p.vendor_user_id})`);
      console.log(`    Thumbnail: ${p.thumbnail}`);
      console.log(`    Images: ${JSON.stringify(p.images)}`);
    });

    // Check inventory
    const inventory = await pool.query('SELECT * FROM inventory');
    console.log(`\nInventory records found: ${inventory.rows.length}`);

    // Check pricing
    const pricing = await pool.query('SELECT * FROM product_pricing');
    console.log(`\nPricing records found: ${pricing.rows.length}`);
    pricing.rows.forEach(p => {
      console.log(`  - Product ${p.product_id}: ${p.duration} ${p.period} @ ${p.price}`);
    });

    console.log('\n=== Check Complete ===');
  } catch (err) {
    console.error('Error checking database:', err);
  } finally {
    pool.end();
  }
}

checkDb();
