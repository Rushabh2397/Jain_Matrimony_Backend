import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UnauthorizedException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OtpService } from './otp.service.js';

describe('OtpService', () => {
  let service: OtpService;
  let mockConfigService: Partial<Record<keyof ConfigService, ReturnType<typeof vi.fn>>>;

  beforeEach(() => {
    mockConfigService = {
      get: vi.fn(),
    };

    service = new OtpService(mockConfigService as unknown as ConfigService);
  });

  describe('generateRandomOtp', () => {
    it('should generate a 6-digit numeric string', () => {
      const otp = service.generateRandomOtp();
      expect(otp).toMatch(/^\d{6}$/);
      const num = parseInt(otp, 10);
      expect(num).toBeGreaterThanOrEqual(100000);
      expect(num).toBeLessThan(1000000);
    });
  });

  describe('generateAndStoreOtp', () => {
    const phone = '+919876543210';

    it('should generate and securely hash-store an OTP with Argon2', async () => {
      const otp = await service.generateAndStoreOtp(phone);
      expect(otp).toHaveLength(6);
      const isValid = await service.verifyOtp(phone, otp);
      expect(isValid).toBe(true);
    });

    it('should throw 429 Too Many Requests if re-requested within cooldown', async () => {
      await service.generateAndStoreOtp(phone);

      await expect(service.generateAndStoreOtp(phone)).rejects.toThrow(
        expect.objectContaining({
          status: HttpStatus.TOO_MANY_REQUESTS,
        }),
      );
    });
  });

  describe('verifyOtp', () => {
    const phone = '+919999999999';

    it('should allow dev bypass OTP (123456) when in non-production mode', async () => {
      mockConfigService.get!.mockImplementation((key: string) => {
        if (key === 'NODE_ENV') return 'development';
        return undefined;
      });

      const isValid = await service.verifyOtp(phone, '123456');
      expect(isValid).toBe(true);
    });

    it('should throw UnauthorizedException if OTP was never requested', async () => {
      mockConfigService.get!.mockReturnValue('production');

      await expect(service.verifyOtp('+910000000000', '999999')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException if OTP has expired', async () => {
      mockConfigService.get!.mockReturnValue('production');

      // Set TTL to -1ms (already expired)
      const otp = await service.generateAndStoreOtp(phone, -1);

      await expect(service.verifyOtp(phone, otp)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should increment attempt count and lock out after 3 failed attempts', async () => {
      mockConfigService.get!.mockReturnValue('production');

      const realOtp = await service.generateAndStoreOtp(phone);

      // Attempt 1
      await expect(service.verifyOtp(phone, '000000')).rejects.toThrow(/2 attempt\(s\) remaining/);

      // Attempt 2
      await expect(service.verifyOtp(phone, '000000')).rejects.toThrow(/1 attempt\(s\) remaining/);

      // Attempt 3 -> Locked out & deleted
      await expect(service.verifyOtp(phone, '000000')).rejects.toThrow(/Too many failed attempts/);

      // Attempt 4 with correct OTP still fails because record was deleted
      await expect(service.verifyOtp(phone, realOtp)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should delete OTP once verified (preventing replay attack)', async () => {
      mockConfigService.get!.mockReturnValue('production');

      const otp = await service.generateAndStoreOtp(phone);
      expect(await service.verifyOtp(phone, otp)).toBe(true);

      // Second attempt with same OTP fails
      await expect(service.verifyOtp(phone, otp)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
