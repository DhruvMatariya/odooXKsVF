import express from 'express';
import authRouter from './routes/auth.js';
import docsRouter from './docs/docs.route.js';
import { globalErrorHandler } from './middleware/auth.middleware.js';
import pool from './config/db.js';
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/api/auth',authRouter);
app.use('/api/auth/docs', docsRouter);
app.use(globalErrorHandler);


export default app;