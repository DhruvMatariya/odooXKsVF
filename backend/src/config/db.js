import pg from "pg";
import env from "./env.js";
import { logger } from '../utils/logger.js';

const { Pool } = pg;

const pool = new Pool({
    host: env.DB_HOST,
    port: Number(env.DB_PORT),
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    database: env.DB_NAME,
});

export const connectDatabase = async () => {
    try {
        await pool.query('SELECT 1');
        logger.info('Database connection successful');
    } catch (err) {
        logger.error('Error connecting to the database:', { error: err.message });
        throw err;
    }
};

export default pool;