import {
  Controller,
  Post,
  Body,
  UseGuards,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service.js';
import {
  SendOtpDto,
  VerifyOtpDto,
  VerifyOtpResponseDto,
  TokensResponseDto,
} from './dto/auth.dto.js';
import { RefreshTokenDto } from './dto/refresh-token.dto.js';
import { JwtAuthGuard } from './guards/jwt-auth.guard.js';
import {
  CurrentUser,
  type ActiveUserData,
} from '../common/decorators/current-user.decorator.js';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly jwtService: JwtService,
  ) {}

  @Post('send-otp')
  @ApiOperation({ summary: 'Send OTP for phone login or pre-registration' })
  @ApiResponse({ status: 200, description: 'OTP sent successfully' })
  async sendOtp(@Body() dto: SendOtpDto) {
    return await this.authService.sendOtp(dto.phoneNumber);
  }

  @Post('verify-otp')
  @ApiOperation({ summary: 'Verify OTP and receive JWT access token + refresh token' })
  @ApiResponse({
    status: 200,
    description: 'OTP verified successfully',
    type: VerifyOtpResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Invalid OTP' })
  async verifyOtp(@Body() dto: VerifyOtpDto): Promise<VerifyOtpResponseDto> {
    return await this.authService.verifyOtp(dto.phoneNumber, dto.otp);
  }

  @Post('refresh')
  @ApiOperation({
    summary:
      'Rotate and exchange a valid refresh token for fresh access and refresh tokens',
  })
  @ApiResponse({
    status: 200,
    description: 'Tokens rotated successfully',
    type: TokensResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Invalid or expired refresh token' })
  @ApiResponse({
    status: 403,
    description: 'Access Denied / Refresh token mismatch',
  })
  async refreshTokens(
    @Body() dto: RefreshTokenDto,
  ): Promise<TokensResponseDto> {
    let payload: { sub: string; role?: string; tokenType?: string };
    try {
      payload = await this.jwtService.verifyAsync(dto.refreshToken, {
        secret:
          process.env.JWT_REFRESH_SECRET || 'super-secret-jain-refresh-key',
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    if (!payload?.sub) {
      throw new UnauthorizedException('Invalid refresh token payload');
    }

    return await this.authService.refreshTokens(payload.sub, dto.refreshToken);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @Post('logout')
  @ApiOperation({ summary: 'Logout and revoke current refresh token session' })
  @ApiResponse({ status: 200, description: 'Logged out successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async logout(
    @CurrentUser() user: ActiveUserData,
  ): Promise<{ message: string }> {
    await this.authService.logout(user.userId);
    return { message: 'Logged out successfully' };
  }
}