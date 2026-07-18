import { Router } from 'express';
import asyncHandler from '../utils/asyncHandler.js';
import { validate } from '../validations/validate.js';
import { registerSchema, loginSchema, forgotPasswordSchema, resetPasswordSchema, refreshTokenSchema, verifyEmailSchema, logoutSchema } from '../validations/register.schema.js';
import { authenticateUser } from '../middleware/auth.middleware.js';
import {
    health,
    createUserController,
    loginUserController,
    logoutController,
    refreshTokenController,
    forgotPasswordController,
    resetPasswordController,
    verifyEmailController,
    profileController
} from '../controllers/auth.controllers.js';

const router = Router();

router.get('/health', asyncHandler(health));
router.post('/register', validate(registerSchema), asyncHandler(createUserController));
router.post('/login', validate(loginSchema), asyncHandler(loginUserController));
router.post('/logout', validate(logoutSchema), asyncHandler(logoutController));
router.post('/refresh-token', validate(refreshTokenSchema), asyncHandler(refreshTokenController));
router.post('/forgot-password', validate(forgotPasswordSchema), asyncHandler(forgotPasswordController));
router.post('/reset-password', validate(resetPasswordSchema), asyncHandler(resetPasswordController));
router.post('/verify-email', validate(verifyEmailSchema), asyncHandler(verifyEmailController));
router.get('/profile', authenticateUser, asyncHandler(profileController));

export default router;