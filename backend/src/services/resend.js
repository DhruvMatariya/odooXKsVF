import { Resend } from "resend";
import env from "../config/env.js";

const resend = new Resend(env.RESEND_API_KEY);

export const sendMail = async (to, subject, token, type = 'reset') => {
    const resend_email = env.RESEND_EMAIL;
    let html = '';
    if (type === 'reset') {
        html = `
            <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
                <h2>Password Reset Request</h2>
                <p>You requested a password reset. Use the token below to reset your password:</p>
                <p style="font-size: 18px; font-weight: bold; text-align: center; padding: 12px; background: #f3f4f6; border-radius: 5px;">${token}</p>
                <p style="margin-top: 20px; font-size: 12px; color: #666;">This token expires in 15 minutes. If you didn't request this, ignore this email.</p>
            </div>
        `;
    } else if (type === 'verification') {
        html = `
            <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
                <h2>Verify Your Email</h2>
                <p>Thank you for registering. Use the token below to verify your email address:</p>
                <p style="font-size: 18px; font-weight: bold; text-align: center; padding: 12px; background: #f3f4f6; border-radius: 5px;">${token}</p>
                <p style="margin-top: 20px; font-size: 12px; color: #666;">This token expires in 24 hours.</p>
            </div>
        `;
    }
    try {
        const { data, error } = await resend.emails.send({
            from: resend_email,
            to,
            subject,
            html
        });
        if (error) {
            throw new Error(error.message);
        }
        return data;
    } catch (err) {
        throw new Error('Error sending email: ' + err.message);
    }
}
