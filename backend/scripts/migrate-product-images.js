import pg from 'pg';
import env from '../src/config/env.js';

const { Pool } = pg;

const pool = new Pool({
    host: env.DB_HOST,
    port: Number(env.DB_PORT),
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    database: env.DB_NAME,
});

async function run() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Add thumbnail_url column to products table if not exists
        await client.query(`
            ALTER TABLE products 
            ADD COLUMN IF NOT EXISTS thumbnail_url TEXT
        `);
        console.log('Added thumbnail_url column to products table');

        // Create product_images table
        await client.query(`
            CREATE TABLE IF NOT EXISTS product_images (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
                image_url TEXT NOT NULL,
                display_order INT NOT NULL DEFAULT 0,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
        `);
        console.log('Created product_images table');

        // Create index for product_images
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_product_images_product_id ON product_images(product_id)
        `);
        console.log('Created index on product_images.product_id');

        await client.query('COMMIT');
        console.log('Migration completed successfully');
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Migration failed:', err.message);
        throw err;
    } finally {
        client.release();
        await pool.end();
    }
}

run();