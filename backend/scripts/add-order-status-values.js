import pg from 'pg';
const { Pool } = pg;
const pool = new Pool({ host: 'localhost', port: 5432, user: 'postgres', password: 'postgres', database: 'rental_management' });

const values = ['REJECTED_AT_DELIVERY', 'REPLACEMENT_REQUESTED', 'RETURNED_PENDING_INSPECTION', 'INSPECTED', 'DEPOSIT_REFUNDED', 'PENALTY_APPLIED', 'DISPUTED', 'COMPLETED'];

async function run() {
  const client = await pool.connect();
  try {
    for (const v of values) {
      try {
        await client.query(`ALTER TYPE order_status ADD VALUE IF NOT EXISTS '${v}'`);
        console.log('Added:', v);
      } catch (e) {
        console.log('Exists or error:', v, e.message);
      }
    }
  } finally {
    client.release();
    await pool.end();
  }
}
run();