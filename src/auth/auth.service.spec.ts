import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { UsersService } from '../users/users.service.js';
import { JwtService } from '@nestjs/jwt';
import { User } from '../users/entities/user.entity.js';
import {
  Gender,
  MaritalStatus,
  Sect,
  Diet,
} from '../common/enums/matrimony.enum.js';

describe('AuthService', () => {
  let service: AuthService;
  let mockUsersService: Partial<Record<keyof UsersService, ReturnType<typeof vi.fn>>>;
  let mockJwtService: Partial<Record<keyof JwtService, ReturnType<typeof vi.fn>>>;

  beforeEach(() => {
    mockUsersService = {
      findByPhoneNumber: vi.fn(),
      create: vi.fn(),
    };
    mockJwtService = {
      sign: vi.fn().mockReturnValue('mock-jwt-token'),
    };

    service = new AuthService(
      mockUsersService as unknown as UsersService,
      mockJwtService as unknown as JwtService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('verifyOtp', () => {
    it('should throw UnauthorizedException on wrong OTP', async () => {
      await expect(
        service.verifyOtp('+919876543210', '000000'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should return isNewUser: true and isProfileComplete: false for minimal profile', async () => {
      const mockUser = {
        id: 'user-uuid-1',
        phoneNumber: '+919876543210',
        fullName: 'New Jain User',
      } as User;

      mockUsersService.findByPhoneNumber!.mockResolvedValue(mockUser);

      const result = await service.verifyOtp('+919876543210', '123456');

      expect(result).toEqual({
        accessToken: 'mock-jwt-token',
        user: {
          id: 'user-uuid-1',
          isNewUser: true,
          isProfileComplete: false,
        },
      });
    });

    it('should return isNewUser: false and isProfileComplete: true when profile details exist', async () => {
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

      const result = await service.verifyOtp('+919876543210', '123456');

      expect(result.user.isNewUser).toBe(false);
      expect(result.user.isProfileComplete).toBe(true);
    });
  });
});
