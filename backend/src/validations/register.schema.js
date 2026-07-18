import { z } from 'zod';

export const registerSchema = z.object({
    body: z.object({
        email: z.string().email('Invalid email format'),
        password: z.string().min(8, 'Password must be at least 8 characters')
            .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
            .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
            .regex(/[0-9]/, 'Password must contain at least one number')
            .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
        full_name: z.string().min(1, 'Full name is required').max(100, 'Full name too long'),
        role: z.enum(['admin', 'customer', 'vendor'], { errorMap: () => ({ message: 'Invalid role' }) })
    })
});

export const loginSchema = z.object({
    body: z.object({
        email: z.string().email('Invalid email format'),
        password: z.string().min(1, 'Password is required')
    })
});

export const forgotPasswordSchema = z.object({
    body: z.object({
        email: z.string().email('Invalid email format')
    })
});

export const resetPasswordSchema = z.object({
    body: z.object({
        token: z.string().min(1, 'Reset token is required'),
        password: z.string().min(8, 'Password must be at least 8 characters')
            .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
            .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
            .regex(/[0-9]/, 'Password must contain at least one number')
            .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character')
    })
});

export const refreshTokenSchema = z.object({
    body: z.object({
        refreshToken: z.string().min(1, 'Refresh token is required')
    })
});

export const verifyEmailSchema = z.object({
    body: z.object({
        token: z.string().min(1, 'Verification token is required')
    })
});

export const logoutSchema = z.object({
    body: z.object({
        refreshToken: z.string().min(1, 'Refresh token is required')
    })
});

export const vendorProfileSchema = z.object({
    body: z.object({
        gst_number: z.string().length(15, 'GST number must be 15 characters'),
        company_name: z.string().min(1, 'Company name is required').max(150, 'Company name too long'),
        product_category: z.string().min(1, 'Product category is required').max(100, 'Product category too long')
    })
});