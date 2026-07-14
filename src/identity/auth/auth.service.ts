import {
  ConflictException,
  Inject,
  Injectable,
  UnauthorizedException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JsonWebTokenError, JwtService, TokenExpiredError } from '@nestjs/jwt';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import Redis from 'ioredis';
import { PrismaService } from '../../core/prisma/prisma.service';
import { LoginUserDto } from './dto/login-user.dto';
import { RegisterUserDto } from './dto/register-user.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

// ─── Types ────────────────────────────────────────────
interface SafeUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  createdAt: Date;
  updatedAt: Date;
}

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly resetTokenExpiryMs = 60 * 60 * 1000; // 1 hour

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @Inject('REDIS_CLIENT') private readonly redis: Redis,
  ) {}

  async register(data: RegisterUserDto) {
    await this.ensureUserDoesNotExist(data.email);
    const hashedPassword = await this.hashPassword(data.password);

    const user = await this.prisma.user.create({
      data: {
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        password: hashedPassword,
        role: Role.USER,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return { user, message: 'User registered successfully' };
  }

  async login(data: LoginUserDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: data.email },
    });

    if (!user || !(await this.verifyPassword(data.password, user.password))) {
      throw new UnauthorizedException('Invalid credentials.');
    }

    const tokens = await this.generateTokens(user);
    await this.redis.setex(
      `refresh_token:${user.id}`,
      this.sevenDaysInSeconds,
      tokens.refreshToken,
    );

    const safeUser = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    return { user: safeUser, tokens };
  }

  async refreshToken(refreshToken: string) {
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token is required.');
    }

    let payload: { sub: string };
    try {
      payload = await this.jwtService.verifyAsync(refreshToken, {
        secret: this.configService.get<string>('REFRESH_SECRET'),
      });
    } catch (error) {
      if (
        error instanceof TokenExpiredError ||
        error instanceof JsonWebTokenError
      ) {
        throw new UnauthorizedException('Invalid refresh token.');
      }
      throw error;
    }

    const cachedToken = await this.redis.get(`refresh_token:${payload.sub}`);
    if (cachedToken !== refreshToken) {
      throw new UnauthorizedException('Invalid or expired refresh token.');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });
    if (!user) {
      throw new UnauthorizedException('User no longer exists.');
    }

    const tokens = await this.generateTokens(user);
    await this.redis.setex(
      `refresh_token:${user.id}`,
      this.sevenDaysInSeconds,
      tokens.refreshToken,
    );

    return tokens;
  }

  async forgotPassword(data: ForgotPasswordDto): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({
      where: { email: data.email },
    });

    // Always return success to prevent email enumeration
    if (!user) {
      return { message: 'If that email exists, a reset link has been sent.' };
    }

    const resetToken = randomUUID();
    const expiry = new Date(Date.now() + this.resetTokenExpiryMs);

    // Store reset token in Redis for faster lookup and auto-expiry
    await this.redis.setex(
      `reset_token:${resetToken}`,
      this.resetTokenExpiryMs / 1000,
      user.id,
    );

    // Also store in DB as fallback
    await this.prisma.user.update({
      where: { id: user.id },
      data: { resetToken, resetTokenExpiry: expiry },
    });

    this.logger.log(`Password reset requested for ${data.email}`);

    // TODO: Queue email via BullMQ
    // await this.emailQueue.add('password-reset', {
    //   to: user.email,
    //   resetToken,
    // });

    return { message: 'If that email exists, a reset link has been sent.' };
  }

  async resetPassword(data: ResetPasswordDto): Promise<{ message: string }> {
    // Try Redis first
    const userId = await this.redis.get(`reset_token:${data.token}`);
    if (!userId) {
      throw new BadRequestException('Invalid or expired reset token.');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      throw new BadRequestException('User no longer exists.');
    }

    // Verify token expiry (Redis handles TTL, but double-check)
    if (user.resetTokenExpiry && new Date() > user.resetTokenExpiry) {
      throw new BadRequestException('Reset token has expired.');
    }

    const hashedPassword = await this.hashPassword(data.password);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetTokenExpiry: null,
      },
    });

    // Invalidate all refresh tokens for this user
    await this.redis.del(`refresh_token:${user.id}`);
    await this.redis.del(`reset_token:${data.token}`);

    this.logger.log(`Password reset completed for ${user.email}`);

    return { message: 'Password has been reset successfully.' };
  }

  async logout(userId: string): Promise<void> {
    await this.redis.del(`refresh_token:${userId}`);
  }

  private async ensureUserDoesNotExist(email: string) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });
    if (existingUser) {
      throw new ConflictException(`User with email ${email} already exists.`);
    }
  }

  private async hashPassword(password: string): Promise<string> {
    const salt = await bcrypt.genSalt();
    return bcrypt.hash(password, salt);
  }

  private async verifyPassword(
    password: string,
    hashedPassword: string,
  ): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword);
  }

  private async generateTokens(user: { id: string; email: string; role: string }) {
    const [accessToken, refreshToken] = await Promise.all([
      this.generateAccessToken(user),
      this.generateRefreshToken(user),
    ]);
    return { accessToken, refreshToken };
  }

  private async generateAccessToken(user: { id: string; email: string; role: string }) {
    const payload = { email: user.email, sub: user.id, role: user.role };
    return this.jwtService.signAsync(payload, {
      secret: this.configService.get<string>('JWT_SECRET'),
      expiresIn: '15m',
    });
  }

  private async generateRefreshToken(user: { id: string; email: string; role: string }) {
    return this.jwtService.signAsync(
      { sub: user.id },
      {
        secret: this.configService.get<string>('REFRESH_SECRET'),
        expiresIn: '7d',
      },
    );
  }

  private sevenDaysInSeconds = 7 * 24 * 60 * 60;
}
