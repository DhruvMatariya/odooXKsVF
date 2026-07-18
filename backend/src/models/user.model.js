import pool from '../config/db.js';
import crypto from 'crypto';

export const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

export const createUser = async (user,client = pool) => {
    const { email, password_hash, full_name, role } = user;
    const query = 'INSERT INTO users (email, password_hash, full_name, role) VALUES ($1, $2, $3, $4) RETURNING *';
    const values = [email, password_hash, full_name, role];
    try {
        const result = await client.query(query, values);
        return result.rows[0];
    } catch (err) {
        throw new Error('Error creating user: ' + err.message);
    }
}

export const getUserByEmail = async (email, client = pool) => {
    const query = 'SELECT * FROM users WHERE email = $1';
    const values = [email];
    try {
        const result = await client.query(query, values);
        return result.rows[0];
    } catch (err) {
        throw new Error('Error fetching user by email: ' + err.message);
    }
}

export const getUserById = async (id, client = pool) => {
    const query = 'SELECT id, full_name, email, role, email_verified, created_at FROM users WHERE id = $1';
    const values = [id];
    try {
        const result = await client.query(query, values);
        return result.rows[0];
    } catch (err) {
        throw new Error('Error fetching user by id: ' + err.message);
    }
}

export const saveRefreshToken = async (userId, token, expiresAt, client = pool) => {
    const tokenHash = hashToken(token);
    const query = 'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3) RETURNING *';
    const values = [userId, tokenHash, expiresAt];
    try {
        const result = await client.query(query, values);
        return result.rows[0];
    } catch (err) {
        throw new Error('Error saving refresh token: ' + err.message);
    }
}

export const findRefreshToken = async (token) => {
    const tokenHash = hashToken(token);
    const query = 'SELECT * FROM refresh_tokens WHERE token = $1 AND expires_at > NOW()';
    const values = [tokenHash];
    try {
        const result = await pool.query(query, values);
        return result.rows[0];
    } catch (err) {
        throw new Error('Error finding refresh token: ' + err.message);
    }
}

export const deleteRefreshToken = async (token, client = pool) => {
    const tokenHash = hashToken(token);
    const query = 'DELETE FROM refresh_tokens WHERE token = $1';
    const values = [tokenHash];
    try {
        const result = await client.query(query, values);
        return result.rows[0];
    } catch (err) {
        throw new Error('Error deleting refresh token: ' + err.message);
    }
}

export const deleteUserRefreshTokens = async (userId, client = pool) => {
    const query = 'DELETE FROM refresh_tokens WHERE user_id = $1';
    const values = [userId];
    try {
        await client.query(query, values);
    } catch (err) {
        throw new Error('Error deleting user refresh tokens: ' + err.message);
    }
}

export const savePasswordResetToken = async (userId, token, expiresAt, client = pool) => {
    const tokenHash = hashToken(token);
    const query = 'INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3) RETURNING *';
    const values = [userId, tokenHash, expiresAt];
    try {
        const result = await client.query(query, values);
        return result.rows[0];
    } catch (err) {
        throw new Error('Error saving password reset token: ' + err.message);
    }
}

export const getPasswordResetToken = async (token, client = pool) => {
    const tokenHash = hashToken(token);
    const query = `SELECT prt.*, u.email FROM password_reset_tokens prt JOIN users u ON u.id = prt.user_id WHERE prt.token_hash = $1 AND prt.expires_at > NOW() AND prt.used = FALSE`;
    const values = [tokenHash];
    try {
        const result = await pool.query(query, values);
        return result.rows[0] || null;
    } catch (err) {
        throw new Error('Error fetching password reset token: ' + err.message);
    }
}

export const markPasswordResetTokenUsed = async (token, client = pool) => {
    const tokenHash = hashToken(token);
    const query = 'UPDATE password_reset_tokens SET used = TRUE WHERE token_hash = $1 RETURNING *';
    const values = [tokenHash];
    try {
        const result = await client.query(query, values);
        return result.rows[0];
    } catch (err) {
        throw new Error('Error marking password reset token as used: ' + err.message);
    }
}

export const updatePassword = async (email, passwordHash, client = pool) => {
    const query = 'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE email = $2 RETURNING *';
    const values = [passwordHash, email];
    try {
        const result = await client.query(query, values);
        return result.rows[0];
    } catch (err) {
        throw new Error('Error updating password: ' + err.message);
    }
}

export const saveEmailVerificationToken = async (userId, token, expiresAt, client = pool) => {
    const tokenHash = hashToken(token);
    const query = 'INSERT INTO email_verification_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3) RETURNING *';
    const values = [userId, tokenHash, expiresAt];
    try {
        const result = await client.query(query, values);
        return result.rows[0];
    } catch (err) {
        throw new Error('Error saving email verification token: ' + err.message);
    }
}

export const getEmailVerificationToken = async (token, client = pool) => {
    const tokenHash = hashToken(token);
    const query = `SELECT evt.*, u.email FROM email_verification_tokens evt JOIN users u ON u.id = evt.user_id WHERE evt.token_hash = $1 AND evt.expires_at > NOW() AND evt.used = FALSE`;
    const values = [tokenHash];
    try {
        const result = await client.query(query, values);
        return result.rows[0] || null;
    } catch (err) {
        throw new Error('Error fetching email verification token: ' + err.message);
    }
}

export const markEmailVerificationTokenUsed = async (token, client = pool) => {
    const tokenHash = hashToken(token);
    const query = 'UPDATE email_verification_tokens SET used = TRUE WHERE token_hash = $1 RETURNING *';
    const values = [tokenHash];
    try {
        const result = await client.query(query, values);
        return result.rows[0];
    } catch (err) {
        throw new Error('Error marking email verification token as used: ' + err.message);
    }
}

export const verifyUserEmail = async (userId, client = pool) => {
    const query = 'UPDATE users SET email_verified = TRUE, updated_at = NOW() WHERE id = $1 RETURNING *';
    const values = [userId];
    try {
        const result = await client.query(query, values);
        return result.rows[0];
    } catch (err) {
        throw new Error('Error verifying user email: ' + err.message);
    }
}
