export const MESSAGES = {
    AUTH: {
        USER_ALREADY_EXISTS: 'Email already registered',
        INVALID_CREDENTIALS: 'Invalid email or password',
        EMAIL_NOT_VERIFIED: 'Please verify your email before logging in',
        LOGIN_SUCCESS: 'Login successful',
        LOGOUT_SUCCESS: 'Logout successful',
        TOKEN_REFRESHED: 'Token refreshed successfully',
        INVALID_REFRESH_TOKEN: 'Invalid or expired refresh token',
        USER_NOT_FOUND: 'User not found',
        PASSWORD_RESET_SENT: 'If the email exists, a reset link has been sent',
        INVALID_RESET_TOKEN: 'Invalid or expired reset token',
        PASSWORD_RESET_SUCCESS: 'Password reset successfully',
        EMAIL_VERIFIED: 'Email verified successfully',
        INVALID_VERIFICATION_TOKEN: 'Invalid or expired verification token',
        REGISTRATION_SUCCESS: 'User created successfully. Please verify your email.',
        PROFILE_FETCHED: 'Profile fetched successfully',
        PROFILE_NOT_FOUND: 'User not found'
    },
    VALIDATION: {
        MISSING_FIELDS: 'Missing required fields',
        INVALID_EMAIL: 'Invalid email format',
        WEAK_PASSWORD: 'Password must be at least 8 characters with uppercase, lowercase, number, and special character',
        INVALID_ROLE: 'Invalid role',
        TOKEN_REQUIRED: 'Token is required',
        REFRESH_TOKEN_REQUIRED: 'Refresh token is required'
    },
    SERVER: {
        INTERNAL_ERROR: 'Internal server error',
        DB_CONNECTION_FAILED: 'Database connection failed',
        EMAIL_SEND_FAILED: 'Failed to send email'
    }
};