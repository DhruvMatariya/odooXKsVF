import { HTTP_STATUS } from '../config/constant.js';
import ApiResponse from '../utils/ApiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';
import { createUserService, loginUserService, logoutService, refreshTokenService, forgotPasswordService, resetPasswordService, verifyEmailService, profileService } from '../services/auth.service.js';

export function health(req, res) {
    res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, 'Auth Service is healthy'));
}

export const createUserController = asyncHandler(async (req, res) => {
    const response = await createUserService(req.validated.body);
    res.status(response.statusCode).json(response);
});

export const loginUserController = asyncHandler(async (req, res) => {
    const { email, password } = req.validated.body;
    const response = await loginUserService(email, password);
    res.status(response.statusCode).json(response);
});

export const logoutController = asyncHandler(async (req, res) => {
    const { refreshToken } = req.validated.body;
    const response = await logoutService(refreshToken);
    res.status(response.statusCode).json(response);
});

export const refreshTokenController = asyncHandler(async (req, res) => {
    const { refreshToken } = req.validated.body;
    const response = await refreshTokenService(refreshToken);
    res.status(response.statusCode).json(response);
});

export const forgotPasswordController = asyncHandler(async (req, res) => {
    const { email } = req.validated.body;
    const response = await forgotPasswordService(email);
    res.status(response.statusCode).json(response);
});

export const resetPasswordController = asyncHandler(async (req, res) => {
    const { token, password } = req.validated.body;
    const response = await resetPasswordService(token, password);
    res.status(response.statusCode).json(response);
});

export const verifyEmailController = asyncHandler(async (req, res) => {
    const { token } = req.validated.body;
    const response = await verifyEmailService(token);
    res.status(response.statusCode).json(response);
});

export const profileController = asyncHandler(async (req, res) => {
    const response = await profileService(req.user.id);
    res.status(response.statusCode).json(response);
});