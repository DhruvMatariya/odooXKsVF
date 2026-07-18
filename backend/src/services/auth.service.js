import { HTTP_STATUS } from "../config/constant.js";
import { MESSAGES } from "../config/messages.js";
import ApiResponse from "../utils/ApiResponse.js";
import ApiError from "../utils/ApiError.js";
import { logger } from "../utils/logger.js";
import {
  createUser,
  getUserByEmail,
  getUserById,
  saveRefreshToken,
  findRefreshToken,
  deleteRefreshToken,
  deleteUserRefreshTokens,
  savePasswordResetToken,
  getPasswordResetToken,
  markPasswordResetTokenUsed,
  updatePassword,
  saveEmailVerificationToken,
  getEmailVerificationToken,
  markEmailVerificationTokenUsed,
  verifyUserEmail,
} from "../models/user.model.js";
import bcrypt from "bcryptjs";
import { generateToken } from "../services/jwt.js";
import { sendMail } from "../services/resend.js";
import crypto from "crypto";
import env from "../config/env.js";
import pool from "../config/db.js";

export const createUserService = async (userData) => {
  const { email, password, full_name, role } = userData;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const existingUser = await getUserByEmail(email, client);
    if (existingUser) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        MESSAGES.AUTH.EMAIL_ALREADY_REGISTERED,
      );
    }

    const passwordHash = await bcrypt.hash(password, env.BCRYPT_SALT_ROUNDS);
    const user = await createUser(
      { email, password_hash: passwordHash, full_name, role },
      client,
    );

    const verificationToken = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await saveEmailVerificationToken(
      user.id,
      verificationToken,
      expiresAt,
      client,
    );
    await sendMail(
      email,
      "Verify your email",
      verificationToken,
      "verification",
    );
    await client.query("COMMIT");

    const { password_hash, ...userData } = user;
    logger.info(MESSAGES.AUTH.USER_CREATED, { userId: user.id, email });
    return new ApiResponse(
      HTTP_STATUS.CREATED,
      MESSAGES.AUTH.USER_CREATED,
      userData,
    );
  } catch (err) {
    await client.query("ROLLBACK");
    logger.error("Error creating user", { error: err.message, email });
    if (err instanceof ApiError) throw err;
    throw new ApiError(
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      MESSAGES.SERVER.INTERNAL_ERROR,
    );
  } finally {
    client.release();
  }
};

export const loginUserService = async (email, password) => {
  try {
    const user = await getUserByEmail(email);
    if (!user) {
      logger.warn("Login attempt with non-existent email", { email });
      throw new ApiError(
        HTTP_STATUS.UNAUTHORIZED,
        MESSAGES.AUTH.INVALID_CREDENTIALS,
      );
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      logger.warn("Failed login attempt - invalid password", {
        userId: user.id,
      });
      throw new ApiError(
        HTTP_STATUS.UNAUTHORIZED,
        MESSAGES.AUTH.INVALID_CREDENTIALS,
      );
    }
    if (!user.email_verified) {
      throw new ApiError(
        HTTP_STATUS.FORBIDDEN,
        MESSAGES.AUTH.EMAIL_NOT_VERIFIED,
      );
    }
    const accessToken = generateToken({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    const refreshToken = crypto.randomBytes(32).toString("hex");
    const hashedRefreshToken = crypto
      .createHash("sha256")
      .update(refreshToken)
      .digest("hex");
    const refreshExpiresAt = new Date(
      Date.now() + env.REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000,
    );
    await saveRefreshToken(user.id, hashedRefreshToken, refreshExpiresAt);
    logger.info(MESSAGES.AUTH.LOGIN_SUCCESS, { userId: user.id });
    return new ApiResponse(HTTP_STATUS.OK, MESSAGES.AUTH.LOGIN_SUCCESS, {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
      },
    });
  } catch (err) {
    logger.error("Error logging in", { error: err.message, email });
    if (err instanceof ApiError) throw err;
    throw new ApiError(
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      MESSAGES.SERVER.INTERNAL_ERROR,
    );
  }
};

export const logoutService = async (refreshToken) => {
  try {
    const hashedRefreshToken = crypto
      .createHash("sha256")
      .update(refreshToken)
      .digest("hex");
    await deleteRefreshToken(hashedRefreshToken);
    logger.info(MESSAGES.AUTH.LOGOUT_SUCCESS);
    return new ApiResponse(HTTP_STATUS.OK, MESSAGES.AUTH.LOGOUT_SUCCESS);
  } catch (err) {
    logger.error("Error logging out", { error: err.message });
    if (err instanceof ApiError) throw err;
    throw new ApiError(
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      MESSAGES.SERVER.INTERNAL_ERROR,
    );
  }
};

export const refreshTokenService = async (refreshToken) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const hashedRefreshToken = crypto
      .createHash("sha256")
      .update(refreshToken)
      .digest("hex");
    const storedToken = await findRefreshToken(hashedRefreshToken);
    if (!storedToken) {
      throw new ApiError(
        HTTP_STATUS.UNAUTHORIZED,
        MESSAGES.AUTH.INVALID_REFRESH_TOKEN,
      );
    }

    const user = await getUserById(storedToken.user_id, client);
    if (!user) {
      throw new ApiError(
        HTTP_STATUS.UNAUTHORIZED,
        MESSAGES.AUTH.USER_NOT_FOUND,
      );
    }

    const accessToken = generateToken({
      id: user.id,
      email: user.email,
      role: user.role,
    });
    await deleteRefreshToken(hashedRefreshToken, client);

    const newRefreshToken = crypto.randomBytes(32).toString("hex");
    const hashedNewRefreshToken = crypto
      .createHash("sha256")
      .update(newRefreshToken)
      .digest("hex");
    const refreshExpiresAt = new Date(
      Date.now() + env.REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000,
    );
    await saveRefreshToken(
      user.id,
      hashedNewRefreshToken,
      refreshExpiresAt,
      client,
    );
    await client.query("COMMIT");

    logger.info(MESSAGES.AUTH.TOKEN_REFRESHED, { userId: user.id });
    return new ApiResponse(HTTP_STATUS.OK, MESSAGES.AUTH.TOKEN_REFRESHED, {
      accessToken,
      refreshToken: newRefreshToken,
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
      },
    });
  } catch (err) {
    await client.query("ROLLBACK");
    logger.error("Error refreshing token", { error: err.message });
    if (err instanceof ApiError) throw err;
    throw new ApiError(
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      MESSAGES.SERVER.INTERNAL_ERROR,
    );
  } finally {
    client.release();
  }
};

export const forgotPasswordService = async (email) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const user = await getUserByEmail(email, client);
    if (!user) {
      logger.info(MESSAGES.AUTH.RESET_LINK_SENT, { email });
      return new ApiResponse(HTTP_STATUS.OK, MESSAGES.AUTH.RESET_LINK_SENT);
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
    const hashedResetToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");
    await savePasswordResetToken(user.id, hashedResetToken, expiresAt, client);
    await sendMail(email, "Password Reset Request", resetToken, "reset");
    await client.query("COMMIT");

    logger.info(MESSAGES.AUTH.RESET_LINK_SENT, { email });
    return new ApiResponse(HTTP_STATUS.OK, MESSAGES.AUTH.RESET_LINK_SENT);
  } catch (err) {
    await client.query("ROLLBACK");
    logger.error("Error processing forgot password", {
      error: err.message,
      email,
    });
    if (err instanceof ApiError) throw err;
    throw new ApiError(
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      MESSAGES.SERVER.INTERNAL_ERROR,
    );
  } finally {
    client.release();
  }
};

export const resetPasswordService = async (token, password) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const tokenRecord = await getPasswordResetToken(token, client);
    const hashedResetToken = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");
    if (!tokenRecord) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        MESSAGES.AUTH.INVALID_RESET_TOKEN,
      );
    }

    const passwordHash = await bcrypt.hash(password, env.BCRYPT_SALT_ROUNDS);
    await updatePassword(tokenRecord.email, passwordHash, client);
    await markPasswordResetTokenUsed(hashedResetToken, client);
    await deleteUserRefreshTokens(tokenRecord.user_id, client);
    await client.query("COMMIT");

    logger.info(MESSAGES.AUTH.PASSWORD_RESET_SUCCESS, {
      userId: tokenRecord.user_id,
    });
    return new ApiResponse(
      HTTP_STATUS.OK,
      MESSAGES.AUTH.PASSWORD_RESET_SUCCESS,
    );
  } catch (err) {
    await client.query("ROLLBACK");
    logger.error("Error resetting password", { error: err.message });
    if (err instanceof ApiError) throw err;
    throw new ApiError(
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      MESSAGES.SERVER.INTERNAL_ERROR,
    );
  } finally {
    client.release();
  }
};

export const verifyEmailService = async (token) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const tokenRecord = await getEmailVerificationToken(token, client);
    if (!tokenRecord) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        MESSAGES.AUTH.INVALID_VERIFICATION_TOKEN,
      );
    }
    await verifyUserEmail(tokenRecord.user_id, client);
    const hashedVerificationToken = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");
    await markEmailVerificationTokenUsed(hashedVerificationToken, client);
    await client.query("COMMIT");

    logger.info(MESSAGES.AUTH.EMAIL_VERIFIED, { userId: tokenRecord.user_id });
    return new ApiResponse(HTTP_STATUS.OK, MESSAGES.AUTH.EMAIL_VERIFIED);
  } catch (err) {
    await client.query("ROLLBACK");
    logger.error("Error verifying email", { error: err.message });
    if (err instanceof ApiError) throw err;
    throw new ApiError(
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      MESSAGES.SERVER.INTERNAL_ERROR,
    );
  } finally {
    client.release();
  }
};

export const profileService = async (userId) => {
  try {
    const user = await getUserById(userId);
    if (!user) {
      throw new ApiError(
        HTTP_STATUS.NOT_FOUND,
        MESSAGES.AUTH.PROFILE_NOT_FOUND,
      );
    }
    logger.info(MESSAGES.AUTH.PROFILE_FETCHED, { userId });
    return new ApiResponse(HTTP_STATUS.OK, MESSAGES.AUTH.PROFILE_FETCHED, user);
  } catch (err) {
    logger.error("Error fetching profile", { error: err.message, userId });
    if (err instanceof ApiError) throw err;
    throw new ApiError(
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      MESSAGES.SERVER.INTERNAL_ERROR,
    );
  }
};
