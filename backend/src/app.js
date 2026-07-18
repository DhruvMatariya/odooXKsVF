import express from 'express';
import Stripe from 'stripe';
import authRouter from './routes/auth.js';
import catalogRouter from './routes/catalog.js';
import ordersRouter from './routes/orders.js';
import docsRouter from './docs/docs.route.js';
import { globalErrorHandler } from './middleware/auth.middleware.js';
import { orderService } from './services/order.service.js';
import env from './config/env.js';

const stripe = new Stripe(env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' });

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static('uploads'));

app.use('/api/v1/auth', authRouter);
app.use('/api/v1', catalogRouter);
app.use('/api/v1', ordersRouter);
app.use('/api/v1/docs', docsRouter);

app.post('/api/v1/webhooks/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = env.STRIPE_WEBHOOK_SECRET;

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'payment_intent.succeeded') {
    const paymentIntent = event.data.object;
    const orderId = paymentIntent.metadata?.orderId;
    const type = paymentIntent.metadata?.type;

    if (orderId && type) {
      try {
        await orderService.handleStripePaymentSuccess(orderId, paymentIntent.id, type);
      } catch (err) {
        console.error('Error handling payment success:', err);
        return res.status(500).send('Error processing payment');
      }
    }
  } else if (event.type === 'charge.refunded') {
    const charge = event.data.object;
    const paymentIntentId = charge.payment_intent;
    if (paymentIntentId) {
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
      const orderId = paymentIntent.metadata?.orderId;
      if (orderId) {
        try {
          await orderService.handleStripeRefund(orderId, paymentIntentId);
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