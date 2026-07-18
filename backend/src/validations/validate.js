import { HTTP_STATUS } from '../config/constant.js';
import ApiResponse from '../utils/ApiResponse.js';

export const validate = (schema) => (req, res, next) => {
    const result = schema.safeParse({
        body: req.body,
        query: req.query,
        params: req.params
    });

    if (!result.success) {
        const errors = result.error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message
        }));
        return res.status(HTTP_STATUS.BAD_REQUEST).json(
            new ApiResponse(HTTP_STATUS.BAD_REQUEST, 'Validation failed', errors)
        );
    }

    req.validated = result.data;
    next();
};