import express from 'express';
import authRouter from './routes/auth.js';
import catalogRouter from './routes/catalog.js';
import ordersRouter from './routes/orders.js';
import docsRouter from './docs/docs.route.js';
import { globalErrorHandler } from './middleware/auth.middleware.js';
import { orderService } from './services/order.service.js';
import { getPaymentProvider } from './payments/index.js';
import env from './config/env.js';

const paymentProvider = getPaymentProvider();

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static('uploads'));

app.use('/api/v1/auth', authRouter);
app.use('/api/v1/catalog', catalogRouter);
app.use('/api/v1/orders', ordersRouter);
app.use('/api/v1/docs', docsRouter);

// Razorpay webhook
app.post('/api/v1/webhooks/razorpay', express.raw({ type: 'application/json' }), async (req, res) => {
  const signature = req.headers['x-razorpay-signature'];
  const webhookSecret = env.RAZORPAY_WEBHOOK_SECRET;

  let event;
  try {
    event = await paymentProvider.verifyWebhookSignature(req.body.toString(), signature, webhookSecret);
  } catch (err) {
    console.error('Razorpay webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle Razorpay events
  if (event.event === 'payment.captured') {
    const payment = event.payload.payment.entity;
    const orderId = payment.notes?.orderId;
    const type = payment.notes?.type;

    if (orderId && type) {
      try {
        await orderService.handlePaymentSuccess(orderId, payment.id, type);
      } catch (err) {
        console.error('Error handling Razorpay payment success:', err);
        return res.status(500).send('Error processing payment');
      }
    }
  } else if (event.event === 'payment.failed') {
    const payment = event.payload.payment.entity;
    const orderId = payment.notes?.orderId;
    
    if (orderId) {
      try {
        await orderService.handlePaymentInitiationFailure(orderId, new Error(payment.error_description || 'Payment failed'));
      } catch (err) {
        console.error('Error handling payment failure:', err);
      }
    }
  } else if (event.event === 'refund.processed') {
    const refund = event.payload.refund.entity;
    const paymentId = refund.payment_id;
    
    if (paymentId) {
      const payment = await paymentProvider.getPaymentStatus(paymentId);
      const orderId = payment.orderId;
      if (orderId) {
        try {
          await orderService.handleRefund(orderId, paymentId);
        } catch (err) {
          console.error('Error handling refund:', err);
        }
      }
    }
  }

  res.json({ received: true });
});

app.use(globalErrorHandler);

export default app;