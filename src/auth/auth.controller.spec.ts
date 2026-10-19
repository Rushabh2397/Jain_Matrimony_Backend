import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { ActiveUserData } from '../common/decorators/current-user.decorator.js';

describe('AuthController', () => {
  let controller: AuthController;
  let mockAuthService: Partial<Record<keyof AuthService, ReturnType<typeof vi.fn>>>;
  let mockJwtService: Partial<Record<keyof JwtService, ReturnType<typeof vi.fn>>>;

  const mockActiveUser: ActiveUserData = {
    userId: 'user-uuid-1',
  };

  beforeEach(() => {
    mockAuthService = {
      sendOtp: vi.fn(),
      verifyOtp: vi.fn(),
      refreshTokens: vi.fn(),
      logout: vi.fn(),
    };

    mockJwtService = {
      verifyAsync: vi.fn(),
    };

    controller = new AuthController(
      mockAuthService as unknown as AuthService,
      mockJwtService as unknown as JwtService,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('sendOtp (POST /auth/send-otp)', () => {
    it('should call authService.sendOtp with phone number', async () => {
      mockAuthService.sendOtp!.mockResolvedValue({
        message: 'OTP sent successfully via WhatsApp',
      });

      const result = await controller.sendOtp({ phoneNumber: '+919876543210' });

      expect(mockAuthService.sendOtp).toHaveBeenCalledWith('+919876543210');
      expect(result).toEqual({ message: 'OTP sent successfully via WhatsApp' });
    });
  });

  describe('verifyOtp (POST /auth/verify-otp)', () => {
    it('should call authService.verifyOtp with phone number and otp', async () => {
      const mockResponse = {
        accessToken: 'access-jwt',
        refreshToken: 'refresh-jwt',
        user: { id: 'u1', isNewUser: true, isProfileComplete: false },
      };
      mockAuthService.verifyOtp!.mockResolvedValue(mockResponse);

      const result = await controller.verifyOtp({
        phoneNumber: '+919876543210',
        otp: '123456',
      });

      expect(mockAuthService.verifyOtp).toHaveBeenCalledWith(
        '+919876543210',
        '123456',
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe('refreshTokens (POST /auth/refresh)', () => {
    const refreshToken = 'valid-refresh-jwt';

    it('should throw UnauthorizedException if JWT verification fails', async () => {
      mockJwtService.verifyAsync!.mockRejectedValue(new Error('JWT Expired'));

      await expect(
        controller.refreshTokens({ refreshToken }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if payload.sub is missing', async () => {
      mockJwtService.verifyAsync!.mockResolvedValue({ role: 'User' });

      await expect(
        controller.refreshTokens({ refreshToken }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should verify JWT and call authService.refreshTokens with user sub and raw token', async () => {
      mockJwtService.verifyAsync!.mockResolvedValue({
        sub: 'user-uuid-1',
        role: 'User',
      });
      const rotatedTokens = {
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      };
      mockAuthService.refreshTokens!.mockResolvedValue(rotatedTokens);

      const result = await controller.refreshTokens({ refreshToken });

      expect(mockJwtService.verifyAsync).toHaveBeenCalledWith(
        refreshToken,
        expect.objectContaining({
          secret: expect.any(String),
        }),
      );
      expect(mockAuthService.refreshTokens).toHaveBeenCalledWith(
        'user-uuid-1',
        refreshToken,
      );
      expect(result).toEqual(rotatedTokens);
    });
  });

  describe('logout (POST /auth/logout)', () => {
    it('should call authService.logout with current active user id', async () => {
      mockAuthService.logout!.mockResolvedValue(undefined);

      const result = await controller.logout(mockActiveUser);

      expect(mockAuthService.logout).toHaveBeenCalledWith('user-uuid-1');
      expect(result).toEqual({ message: 'Logged out successfully' });
    });
  });
});
