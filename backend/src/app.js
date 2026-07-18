import express from 'express';
import authRouter from './routes/auth.js';
import catalogRouter from './routes/catalog.js';
import ordersRouter from './routes/orders.js';
import docsRouter from './docs/docs.route.js';
import { globalErrorHandler } from './middleware/auth.middleware.js';
import { orderService } from './services/order.service.js';
import { getPaymentProvider } from './payments/index.js';
import env from './config/env.js';
import cors from 'cors';

const paymentProvider = getPaymentProvider();

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use('/uploads', express.static('uploads'));

app.use('/api/v1/auth', authRouter);
app.use('/api/v1/catalog', catalogRouter);
app.use('/api/v1/orders', ordersRouter);
app.use('/api/v1/docs', docsRouter);

app.use(globalErrorHandler);

export default app;