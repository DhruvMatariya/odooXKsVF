import { z } from 'zod';

export const categorySchema = z.object({
  body: z.object({
    name: z.string().min(1).max(50),
    description: z.string().max(300).optional(),
  }),
});

export const createProductSchema = z.object({
  body: z.object({
    categoryId: z.uuid('Invalid category ID'),
    name: z.string().min(1).max(100).trim(),
    description: z.string().max(2000).optional(),
    brand: z.string().max(100).optional(),
    manufacturer: z.string().max(100).optional(),
  }),
});

export const updateProductSchema = z.object({
  params: z.object({ id: z.uuid('Invalid product ID') }),
  body: z.object({
    categoryId: z.uuid('Invalid category ID').optional(),
    name: z.string().min(1).max(100).trim().optional(),
    description: z.string().max(2000).optional(),
    brand: z.string().max(100).optional(),
    manufacturer: z.string().max(100).optional(),
  }).refine(data => Object.keys(data).length > 0, 'At least one field required'),
});

export const productIdParamSchema = z.object({
  params: z.object({ id: z.uuid('Invalid product ID') }),
});

export const listProductsSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(10),
    search: z.string().max(100).optional(),
    category: z.uuid('Invalid category ID').optional(),
    brand: z.string().max(100).optional(),
    sort: z.enum(['name', 'createdAt', 'startingPrice']).default('name'),
    order: z.enum(['asc', 'desc']).default('asc'),
    vendorId: z.uuid('Invalid vendor ID').optional(),
  }),
});

export const updateInventorySchema = z.object({
  params: z.object({ id: z.uuid('Invalid product ID') }),
  body: z.object({
    available: z.number().int().min(0).optional(),
    maintenance: z.number().int().min(0).optional(),
  }).strict().refine(data => Object.keys(data).length > 0, 'At least one field required'),
});

export const createPricingSchema = z.object({
  params: z.object({ id: z.uuid('Invalid product ID') }),
  body: z.object({
    period: z.enum(['HOUR', 'DAY', 'WEEK']),
    duration: z.number().int().min(1),
    price: z.number().int().min(1),
    deposit: z.number().int().min(0).default(0),
  }),
});

export const pricingIdParamSchema = z.object({
  params: z.object({ id: z.uuid('Invalid pricing ID') }),
});

export const updatePricingSchema = z.object({
  params: z.object({ id: z.uuid('Invalid pricing ID') }),
  body: z.object({
    period: z.enum(['HOUR', 'DAY', 'WEEK']).optional(),
    duration: z.number().int().min(1).optional(),
    price: z.number().int().min(1).optional(),
    deposit: z.number().int().min(0).optional(),
  }).strict().refine(data => Object.keys(data).length > 0, 'At least one field required'),
});

export const createReturnSlotSchema = z.object({
  body: z.object({
    date: z.iso.date(),
    slotLabel: z.enum(['MORNING', 'AFTERNOON', 'EVENING']),
    capacity: z.number().int().min(1),
  }),
});

export const returnSlotsQuerySchema = z.object({
  query: z.object({
    date: z.iso.date('Invalid date format, use YYYY-MM-DD'),
  }),
});

export const lateFeeRuleSchema = z.object({
  body: z.object({
    gracePeriodHours: z.number().int().min(0).default(0),
    rateType: z.enum(['HOURLY', 'DAILY']),
    rateAmount: z.number().int().min(1),
    maxCap: z.number().int().min(1),
  }),
});

export const cancellationPolicySchema = z.object({
  body: z.object({
    fullRefundHoursBefore: z.number().int().min(0).default(24),
    partialRefundHoursBefore: z.number().int().min(0).default(6),
    partialRefundPercent: z.number().int().min(0).max(100).default(50),
  }),
});