import express from 'express';
import authRouter from './routes/auth.js';
import catalogRouter from './routes/catalog.js';
import docsRouter from './docs/docs.route.js';
import { globalErrorHandler } from './middleware/auth.middleware.js';
import catalogRouter from './routes/catalog.js';
import pool from './config/db.js';
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/api/v1/auth', authRouter);
app.use('/api/v1', catalogRouter);
app.use('/api/v1/docs', docsRouter);
app.use(globalErrorHandler);


export default app;