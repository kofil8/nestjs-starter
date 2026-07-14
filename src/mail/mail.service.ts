import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly resend: Resend | null = null;
  private readonly from: string;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('RESEND_API_KEY');
    this.from = this.configService.get<string>('RESEND_FROM', 'noreply@yourapp.com');

    if (apiKey) {
      this.resend = new Resend(apiKey);
    } else {
      this.logger.warn(
        '⚠️  RESEND_API_KEY not configured. Emails will be logged only.',
      );
    }
  }

  async sendPasswordResetEmail(to: string, resetToken: string): Promise<void> {
    const resetUrl = `${this.configService.get<string>('APP_URL', 'http://localhost:3000')}/auth/reset-password?token=${resetToken}`;

    if (this.resend) {
      await this.resend.emails.send({
        from: this.from,
        to,
        subject: 'Password Reset Request',
        html: `
          <h1>Password Reset</h1>
          <p>Click the link below to reset your password:</p>
          <a href="${resetUrl}" style="display:inline-block;padding:12px 24px;background:#6366f1;color:#fff;text-decoration:none;border-radius:6px;">Reset Password</a>
          <p>This link expires in 1 hour.</p>
          <p>If you didn't request this, please ignore this email.</p>
        `,
      });
      this.logger.log(`✉️ Password reset email sent to ${to}`);
    } else {
      this.logger.log(`✉️ Password reset email would be sent to ${to}`);
      this.logger.log(`🔗 Reset URL: ${resetUrl}`);
    }
  }

  async sendWelcomeEmail(to: string, name: string): Promise<void> {
    if (this.resend) {
      await this.resend.emails.send({
        from: this.from,
        to,
        subject: 'Welcome to Our App!',
        html: `
          <h1>Welcome, ${name}!</h1>
          <p>Thank you for joining us. We're excited to have you on board.</p>
          <p>If you have any questions, feel free to reach out to our support team.</p>
        `,
      });
      this.logger.log(`✉️ Welcome email sent to ${to}`);
    } else {
      this.logger.log(`✉️ Welcome email would be sent to ${to}`);
    }
  }
}
