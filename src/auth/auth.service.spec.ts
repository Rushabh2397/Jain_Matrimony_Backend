import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { UsersService } from '../users/users.service.js';
import { JwtService } from '@nestjs/jwt';
import { User } from '../users/entities/user.entity.js';
import argon2 from 'argon2';
import {
  Gender,
  MaritalStatus,
  Sect,
  Diet,
} from '../common/enums/matrimony.enum.js';
import { WhatsAppService } from './services/whatsapp.service.js';
import { OtpService } from './services/otp.service.js';

describe('AuthService', () => {
  let service: AuthService;
  let mockUsersService: Partial<Record<keyof UsersService, ReturnType<typeof vi.fn>>>;
  let mockJwtService: Partial<Record<keyof JwtService, ReturnType<typeof vi.fn>>>;
  let mockWhatsAppService: Partial<Record<keyof WhatsAppService, ReturnType<typeof vi.fn>>>;
  let mockOtpService: Partial<Record<keyof OtpService, ReturnType<typeof vi.fn>>>;

  beforeEach(() => {
    mockUsersService = {
      findByPhoneNumber: vi.fn(),
      create: vi.fn(),
      updateRefreshTokenHash: vi.fn().mockResolvedValue(undefined),
      findUserWithRefreshToken: vi.fn(),
    };
    mockJwtService = {
      sign: vi.fn().mockReturnValue('mock-jwt-token'),
    };
    mockWhatsAppService = {
      sendOtp: vi.fn().mockResolvedValue({ success: true, messageId: 'wa-123' }),
    };
    mockOtpService = {
      generateAndStoreOtp: vi.fn().mockResolvedValue('654321'),
      verifyOtp: vi.fn().mockResolvedValue(true),
    };

    service = new AuthService(
      mockUsersService as unknown as UsersService,
      mockJwtService as unknown as JwtService,
      mockWhatsAppService as unknown as WhatsAppService,
      mockOtpService as unknown as OtpService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('sendOtp', () => {
    const phoneNumber = '+919876543210';

    it('should pre-register new user, generate OTP, and dispatch via WhatsApp', async () => {
      mockUsersService.findByPhoneNumber!.mockResolvedValue(null);

      const result = await service.sendOtp(phoneNumber);

      expect(mockUsersService.create).toHaveBeenCalledWith({
        phoneNumber,
        fullName: 'New Jain User',
      });
      expect(mockOtpService.generateAndStoreOtp).toHaveBeenCalledWith(phoneNumber);
      expect(mockWhatsAppService.sendOtp).toHaveBeenCalledWith(phoneNumber, '654321');
      expect(result).toEqual({ message: 'OTP sent successfully via WhatsApp' });
    });

    it('should not recreate user if already registered', async () => {
      mockUsersService.findByPhoneNumber!.mockResolvedValue({
        id: 'u1',
        phoneNumber,
      } as User);

      const result = await service.sendOtp(phoneNumber);

      expect(mockUsersService.create).not.toHaveBeenCalled();
      expect(mockOtpService.generateAndStoreOtp).toHaveBeenCalledWith(phoneNumber);
      expect(mockWhatsAppService.sendOtp).toHaveBeenCalledWith(phoneNumber, '654321');
      expect(result).toEqual({ message: 'OTP sent successfully via WhatsApp' });
    });
  });

  describe('verifyOtp', () => {
    it('should delegate verification to otpService and throw if invalid', async () => {
      mockOtpService.verifyOtp!.mockRejectedValue(
        new UnauthorizedException('Invalid OTP'),
      );

      await expect(
        service.verifyOtp('+919876543210', '000000'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should issue accessToken + refreshToken, hash refreshToken with Argon2, and return onboarding flags', async () => {
      mockOtpService.verifyOtp!.mockResolvedValue(true);
      const mockUser = {
        id: 'user-uuid-1',
        phoneNumber: '+919876543210',
        fullName: 'New Jain User',
      } as User;

      mockUsersService.findByPhoneNumber!.mockResolvedValue(mockUser);

      const result = await service.verifyOtp('+919876543210', '654321');

      expect(mockOtpService.verifyOtp).toHaveBeenCalledWith('+919876543210', '654321');
      expect(mockUsersService.updateRefreshTokenHash).toHaveBeenCalledWith(
        'user-uuid-1',
        expect.any(String),
      );
      expect(result).toEqual({
        accessToken: 'mock-jwt-token',
        refreshToken: 'mock-jwt-token',
        user: {
          id: 'user-uuid-1',
          isNewUser: true,
          isProfileComplete: false,
        },
      });
    });

    it('should return isNewUser: false and isProfileComplete: true when profile details exist', async () => {
      mockOtpService.verifyOtp!.mockResolvedValue(true);
      const mockUser = {
        id: 'user-uuid-2',
        phoneNumber: '+919876543210',
        fullName: 'Aarav Shah',
        gender: Gender.MALE,
        dateOfBirth: new Date('1995-01-01'),
        maritalStatus: MaritalStatus.NEVER_MARRIED,
        sect: Sect.MURTIPUJAK,
        diet: Diet.STRICT_JAIN,
      } as User;

      mockUsersService.findByPhoneNumber!.mockResolvedValue(mockUser);

      const result = await service.verifyOtp('+919876543210', '654321');

      expect(result.user.isNewUser).toBe(false);
      expect(result.user.isProfileComplete).toBe(true);
    });
  });

  describe('refreshTokens', () => {
    const userId = 'user-uuid-10';
    const rawRefreshToken = 'valid-refresh-token';

    it('should throw ForbiddenException if user or hashedRefreshToken not found', async () => {
      mockUsersService.findUserWithRefreshToken!.mockResolvedValue(null);

      await expect(
        service.refreshTokens(userId, rawRefreshToken),
      ).rejects.toThrow(new ForbiddenException('Access Denied'));

      mockUsersService.findUserWithRefreshToken!.mockResolvedValue({
        id: userId,
        hashedRefreshToken: null,
      } as User);

      await expect(
        service.refreshTokens(userId, rawRefreshToken),
      ).rejects.toThrow(new ForbiddenException('Access Denied'));
    });

    it('should throw ForbiddenException if Argon2 verification fails', async () => {
      const wrongHash = await argon2.hash('different-token');
      mockUsersService.findUserWithRefreshToken!.mockResolvedValue({
        id: userId,
        hashedRefreshToken: wrongHash,
      } as User);

      await expect(
        service.refreshTokens(userId, rawRefreshToken),
      ).rejects.toThrow(new ForbiddenException('Invalid refresh token'));
    });

    it('should rotate access and refresh tokens when refresh token matches hash', async () => {
      const correctHash = await argon2.hash(rawRefreshToken);
      mockUsersService.findUserWithRefreshToken!.mockResolvedValue({
        id: userId,
        hashedRefreshToken: correctHash,
      } as User);

      const result = await service.refreshTokens(userId, rawRefreshToken);

      expect(mockUsersService.updateRefreshTokenHash).toHaveBeenCalledWith(
        userId,
        expect.any(String),
      );
      expect(result).toEqual({
        accessToken: 'mock-jwt-token',
        refreshToken: 'mock-jwt-token',
      });
    });
  });

  describe('logout', () => {
    it('should nullify the user hashedRefreshToken in database', async () => {
      const userId = 'user-uuid-20';

      await service.logout(userId);

      expect(mockUsersService.updateRefreshTokenHash).toHaveBeenCalledWith(
        userId,
        null,
      );
    });
  });
});
