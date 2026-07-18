import { z } from 'zod';

export const createOrderSchema = z.object({
  body: z.object({
    productId: z.uuid('Invalid product ID'),
    pricingId: z.uuid('Invalid pricing ID'),
    quantity: z.number().int().min(1).default(1),
    channel: z.enum(['ONLINE', 'OFFLINE']),
    deliveryType: z.enum(['PICKUP', 'DELIVERY']),
    rentalPeriodStart: z.iso.datetime('Invalid rentalPeriodStart format, use ISO 8601'),
    rentalPeriodEnd: z.iso.datetime('Invalid rentalPeriodEnd format, use ISO 8601'),
  }).refine(data => new Date(data.rentalPeriodStart) < new Date(data.rentalPeriodEnd), {
    message: 'rentalPeriodStart must be before rentalPeriodEnd',
    path: ['rentalPeriodStart'],
  }).refine(data => new Date(data.rentalPeriodStart) > new Date(), {
    message: 'rentalPeriodStart must be in the future',
    path: ['rentalPeriodStart'],
  }),
});

export const orderIdParamSchema = z.object({
  params: z.object({ id: z.uuid('Invalid order ID') }),
});

export const confirmDeliverySchema = z.object({
  params: z.object({ id: z.uuid('Invalid order ID') }),
  body: z.discriminatedUnion('decision', [
    z.object({
      decision: z.literal('ACCEPT'),
    }),
    z.object({
      decision: z.literal('REJECT'),
      resolution: z.enum(['REFUND', 'REPLACE']),
      reason: z.string().min(1),
      photos: z.array(z.url()).optional().default([]),
    }),
  ]),
});

export const resolveReplacementSchema = z.object({
  params: z.object({ id: z.uuid('Invalid order ID') }),
  body: z.object({
    resolution: z.enum(['REDISPATCH', 'REFUND']),
  }),
});

export const returnSlotSchema = z.object({
  params: z.object({ id: z.uuid('Invalid order ID') }),
  body: z.object({
    returnSlotId: z.uuid('Invalid return slot ID'),
  }),
});

export const markReturnedSchema = z.object({
  params: z.object({ id: z.uuid('Invalid order ID') }),
  body: z.object({
    actualReturnTime: z.iso.datetime().optional(),
  }),
});

export const inspectSchema = z.object({
  params: z.object({ id: z.uuid('Invalid order ID') }),
  body: z.object({
    damageFound: z.boolean(),
    conditionNotes: z.string().optional(),
    photos: z.array(z.url()).optional().default([]),
    damageDeductionAmount: z.number().int().min(0).default(0),
  }),
});

export const reportIssueSchema = z.object({
  params: z.object({ id: z.uuid('Invalid order ID') }),
  body: z.object({
    description: z.string().min(1),
    photos: z.array(z.url()).optional().default([]),
  }),
});

export const resolveDisputeSchema = z.object({
  params: z.object({ id: z.uuid('Invalid order ID') }),
  body: z.object({
    resolution: z.enum(['ACCEPT', 'REJECT']),
    note: z.string().min(1),
  }),
});

export const cancelOrderSchema = z.object({
  params: z.object({ id: z.uuid('Invalid order ID') }),
  body: z.object({}).optional(),
});

export const markPaidOfflineSchema = z.object({
  params: z.object({ id: z.uuid('Invalid order ID') }),
  body: z.object({}),
});

export const listOrdersQuerySchema = z.object({
  query: z.object({
    status: z.enum(['PENDING_PAYMENT', 'CONFIRMED', 'DISPATCHED', 'REJECTED_AT_DELIVERY', 'REPLACEMENT_REQUESTED', 'HANDED_OVER', 'ACTIVE_RENTAL', 'RETURN_SCHEDULED', 'RETURNED_PENDING_INSPECTION', 'INSPECTED', 'DEPOSIT_REFUNDED', 'PENALTY_APPLIED', 'DISPUTED', 'CANCELLED', 'COMPLETED']).optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(10),
  }),
});

export const vendorOrderSchema = z.object({
  body: z.object({
    customerEmail: z.email('Invalid customer email'),
    productId: z.uuid('Invalid product ID'),
    pricingId: z.uuid('Invalid pricing ID'),
    quantity: z.number().int().min(1).default(1),
    channel: z.literal('OFFLINE'),
    deliveryType: z.enum(['PICKUP', 'DELIVERY']),
    rentalPeriodStart: z.iso.datetime('Invalid rentalPeriodStart format, use ISO 8601'),
    rentalPeriodEnd: z.iso.datetime('Invalid rentalPeriodEnd format, use ISO 8601'),
  }).refine(data => new Date(data.rentalPeriodStart) < new Date(data.rentalPeriodEnd), {
    message: 'rentalPeriodStart must be before rentalPeriodEnd',
    path: ['rentalPeriodStart'],
  }).refine(data => new Date(data.rentalPeriodStart) > new Date(), {
    message: 'rentalPeriodStart must be in the future',
    path: ['rentalPeriodStart'],
  }),
});

export const dispatchOrderSchema = z.object({
  params: z.object({ id: z.uuid('Invalid order ID') }),
  body: z.object({}),
});