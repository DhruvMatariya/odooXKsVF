#!/usr/bin/env node
// Seed script for categories table
// Run with: npm run seed:categories

import { fileURLToPath } from 'url';
import path from 'path';
import pool from '../src/config/db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const categories = [
  {
    name: 'Cameras',
    description: 'Professional and consumer cameras, lenses, and photography equipment for events and productions'
  },
  {
    name: 'Power Tools',
    description: 'Drills, saws, sanders, and construction equipment for renovation and DIY projects'
  },
  {
    name: 'Party Equipment',
    description: 'Tents, tables, chairs, sound systems, lighting, and decor for events and celebrations'
  },
  {
    name: 'Vehicles',
    description: 'Cars, vans, trucks, and specialty vehicles for transport and logistics needs'
  },
  {
    name: 'Furniture',
    description: 'Office furniture, event furniture, and home furnishings for temporary use'
  },
  {
    name: 'Audio Visual',
    description: 'Projectors, screens, speakers, microphones, and AV equipment for presentations and events'
  },
  {
    name: 'Outdoor & Camping',
    description: 'Tents, camping gear, outdoor cooking equipment, and recreational vehicles'
  },
  {
    name: 'Cleaning Equipment',
    description: 'Industrial vacuums, pressure washers, floor scrubbers, and cleaning machinery'
  }
];

async function seedCategories() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    for (const cat of categories) {
      await client.query(
        `INSERT INTO categories (name, description) 
         VALUES ($1, $2) 
         ON CONFLICT (name) DO NOTHING`,
        [cat.name, cat.description]
      );
      console.log(`Seeded category: ${cat.name}`);
    }
    
    await client.query('COMMIT');
    console.log('Categories seeded successfully!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error seeding categories:', err.message);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

seedCategories().catch(() => process.exit(1));