import nodemailer from "nodemailer";
import { config } from "../config/constants";

export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: config.email.host,
      port: config.email.port,
      secure: config.email.secure,
      auth: {
        user: config.email.user,
        pass: config.email.password,
      },
    });
  }

  async sendOTPEmail(to: string, otp: string, userName: string): Promise<void> {
    const mailOptions = {
      from: `"AI Idea API" <${config.email.user}>`,
      to,
      subject: "Password Reset OTP - AI Idea API",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Password Reset Request</h2>
          <p>Hello ${userName},</p>
          <p>You have requested to reset your password. Use the OTP code below to proceed:</p>
          <div style="background-color: #f4f4f4; padding: 20px; text-align: center; margin: 20px 0;">
            <h1 style="color: #007bff; letter-spacing: 5px; margin: 0;">${otp}</h1>
          </div>
          <p><strong>This OTP will expire in ${config.otp.expiresInMinutes} minutes.</strong></p>
          <p>If you did not request this password reset, please ignore this email.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="color: #666; font-size: 12px;">This is an automated email. Please do not reply.</p>
        </div>
      `,
    };

    await this.transporter.sendMail(mailOptions);
  }
}
