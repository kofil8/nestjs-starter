import {
  Body,
  Controller,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import type { JwtPayload } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { AuthService } from './auth.service';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginUserDto } from './dto/login-user.dto';
import { RegisterUserDto } from './dto/register-user.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Public()
  @Post('register')
  async register(@Body() registerDto: RegisterUserDto) {
    return this.authService.register(registerDto);
  }

  @Public()
  @Post('login')
  async login(
    @Body() loginDto: LoginUserDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const { user, tokens } = await this.authService.login(loginDto);

    const isProduction =
      this.configService.get<string>('app.nodeEnv') === 'production';
    response.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return { user, accessToken: tokens.accessToken };
  }

  @Public()
  @Post('refresh')
  async refresh(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const refreshToken = request.cookies?.refreshToken as string | undefined;
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token missing from cookies.');
    }

    const tokens = await this.authService.refreshToken(refreshToken);

    const isProduction =
      this.configService.get<string>('app.nodeEnv') === 'production';
    response.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return { accessToken: tokens.accessToken };
  }

  @Public()
  @Post('forgot-password')
  async forgotPassword(@Body() forgotDto: ForgotPasswordDto) {
    return this.authService.forgotPassword(forgotDto);
  }

  @Public()
  @Post('reset-password')
  async resetPassword(@Body() resetDto: ResetPasswordDto) {
    return this.authService.resetPassword(resetDto);
  }

  @Post('logout')
  async logout(
    @Req() req: Request & { user?: JwtPayload },
    @Res({ passthrough: true }) response: Response,
  ) {
    const userId = req.user?.sub;
    if (userId) await this.authService.logout(userId);

    const isProduction =
      this.configService.get<string>('app.nodeEnv') === 'production';
    response.clearCookie('refreshToken', {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
    });
    return { message: 'Logged out successfully' };
  }
}
