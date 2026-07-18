import { HTTP_STATUS } from '../config/constant.js';
import ApiResponse from '../utils/ApiResponse.js';
import { verifyToken } from '../services/jwt.js';

export const globalErrorHandler = (err, req, res, next) => {
    const statusCode = err.statusCode || 500;
    const message = err.message || 'Internal Server Error';
    res.status(statusCode).json({
        success: false,
        statusCode,
        message
    });
};

export const authenticateUser = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(HTTP_STATUS.UNAUTHORIZED).json(new ApiResponse(HTTP_STATUS.UNAUTHORIZED, 'Access token required'));
    }
    const accessToken = authHeader.split(' ')[1];
    try {
        const decoded = verifyToken(accessToken);
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(HTTP_STATUS.UNAUTHORIZED).json(new ApiResponse(HTTP_STATUS.UNAUTHORIZED, 'Invalid or expired access token'));
    }
};

export const authorizeRoles = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return res.status(HTTP_STATUS.FORBIDDEN).json(new ApiResponse(HTTP_STATUS.FORBIDDEN, 'Insufficient permissions'));
        }
        next();
    }
};