import { Injectable, ForbiddenException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import argon2 from 'argon2';
import { UsersService } from '../users/users.service.js';
import { VerifyOtpResponseDto, TokensResponseDto } from './dto/auth.dto.js';
import { UserRole } from '../common/enums/matrimony.enum.js';
import { WhatsAppService } from './services/whatsapp.service.js';
import { OtpService } from './services/otp.service.js';

@Injectable()
export class AuthService {
  private readonly jwtSecret =
    process.env.JWT_SECRET || 'super-secret-jain-matrimony-key';
  private readonly jwtRefreshSecret =
    process.env.JWT_REFRESH_SECRET || 'super-secret-jain-refresh-key';

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly whatsAppService: WhatsAppService,
    private readonly otpService: OtpService,
  ) {}

  /**
   * Generates a 6-digit OTP and delivers it live to the user via WhatsApp Cloud API.
   * If user doesn't exist yet, pre-registers a base record.
   */
  async sendOtp(phoneNumber: string): Promise<{ message: string }> {
    const user = await this.usersService.findByPhoneNumber(phoneNumber);

    if (!user) {
      await this.usersService.create({ phoneNumber, fullName: 'New Jain User' });
    }

    // Generate secure OTP & enforce rate-limiting
    const otp = await this.otpService.generateAndStoreOtp(phoneNumber);

    // Send via WhatsApp Cloud API
    await this.whatsAppService.sendOtp(phoneNumber, otp);

    return { message: 'OTP sent successfully via WhatsApp' };
  }

  /**
   * Verifies the OTP, clears used OTP, and issues short-lived access token + rotating refresh token.
   */
  async verifyOtp(
    phoneNumber: string,
    otp: string,
  ): Promise<VerifyOtpResponseDto> {
    // Verify OTP code (checks expiration, attempt counter, dev mode fallback)
    await this.otpService.verifyOtp(phoneNumber, otp);

    let user = await this.usersService.findByPhoneNumber(phoneNumber);
    let isNewUser = false;

    if (!user) {
      user = await this.usersService.create({
        phoneNumber,
        fullName: 'New Jain User',
      });
      isNewUser = true;
    } else {
      isNewUser = Boolean(!user.gender && !user.dateOfBirth);
    }

    const isProfileComplete = Boolean(
      user.gender &&
        user.dateOfBirth &&
        user.maritalStatus &&
        user.sect &&
        user.diet,
    );

    const payload = { sub: user.id, role: user.role || UserRole.USER };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.jwtSecret,
      expiresIn: '15m',
    });

    const refreshToken = this.jwtService.sign(
      { ...payload, tokenType: 'refresh' },
      {
        secret: this.jwtRefreshSecret,
        expiresIn: '7d',
      },
    );

    // Hash refresh token with Argon2 and store in database
    const hashedRefreshToken = await argon2.hash(refreshToken);
    await this.usersService.updateRefreshTokenHash(user.id, hashedRefreshToken);

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        isNewUser,
        isProfileComplete,
      },
    };
  }

  /**
   * Rotates access and refresh tokens after verifying the provided raw refresh token against the stored Argon2 hash.
   */
  async refreshTokens(
    userId: string,
    rawRefreshToken: string,
  ): Promise<TokensResponseDto> {
    const user = await this.usersService.findUserWithRefreshToken(userId);

    if (!user || !user.hashedRefreshToken) {
      throw new ForbiddenException('Access Denied');
    }

    let isMatch = false;
    try {
      isMatch = await argon2.verify(user.hashedRefreshToken, rawRefreshToken);
    } catch {
      isMatch = false;
    }

    if (!isMatch) {
      throw new ForbiddenException('Invalid refresh token');
    }

    const payload = { sub: user.id, role: user.role || UserRole.USER };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.jwtSecret,
      expiresIn: '15m',
    });

    const refreshToken = this.jwtService.sign(
      { ...payload, tokenType: 'refresh' },
      {
        secret: this.jwtRefreshSecret,
        expiresIn: '7d',
      },
    );

    const hashedRefreshToken = await argon2.hash(refreshToken);
    await this.usersService.updateRefreshTokenHash(user.id, hashedRefreshToken);

    return {
      accessToken,
      refreshToken,
    };
  }

  /**
   * Logs out the user by wiping their stored hashed refresh token.
   */
  async logout(userId: string): Promise<void> {
    await this.usersService.updateRefreshTokenHash(userId, null);
  }
}