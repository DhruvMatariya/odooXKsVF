import jwt from 'jsonwebtoken';
import { HTTP_STATUS } from '../config/constant.js';
import ApiError from '../utils/ApiError.js';
import env from '../config/env.js';

export const generateToken = (payload) => {
    return jwt.sign(payload, env.JWT_SECRET, { expiresIn: env.ACCESS_TOKEN_EXPIRY });
}

export const verifyToken = (token) => {
    try {
        const decoded = jwt.verify(token, env.JWT_SECRET);
        return decoded;
    } catch (err) {
        throw new ApiError(HTTP_STATUS.UNAUTHORIZED, 'Invalid token');
    }
}