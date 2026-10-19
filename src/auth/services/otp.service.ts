import {
  Injectable,
  UnauthorizedException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomInt } from 'node:crypto';
import argon2 from 'argon2';

interface StoredOtp {
  otpHash: string;
  expiresAt: number;
  attempts: number;
  lastSentAt: number;
}

@Injectable()
export class OtpService {
  // In-memory store for OTPs (keyed by normalized phone number)
  private readonly otpStore = new Map<string, StoredOtp>();

  // Cooldown between resend requests (in milliseconds)
  private readonly RESEND_COOLDOWN_MS = 30 * 1000; // 30 seconds

  // Default validity duration (in milliseconds)
  private readonly DEFAULT_TTL_MS = 5 * 60 * 1000; // 5 minutes

  // Maximum verification attempts before invalidating OTP
  private readonly MAX_ATTEMPTS = 3;

  constructor(private readonly configService: ConfigService) {}

  /**
   * Generates a secure, cryptographically random 6-digit OTP code.
   */
  generateRandomOtp(): string {
    return randomInt(100000, 1000000).toString();
  }

  /**
   * Generates, checks cooldown, and stores an Argon2-hashed OTP for a given phone number.
   */
  async generateAndStoreOtp(
    phoneNumber: string,
    ttlMs: number = this.DEFAULT_TTL_MS,
  ): Promise<string> {
    const now = Date.now();
    const existing = this.otpStore.get(phoneNumber);

    if (existing && now - existing.lastSentAt < this.RESEND_COOLDOWN_MS) {
      const waitSeconds = Math.ceil(
        (this.RESEND_COOLDOWN_MS - (now - existing.lastSentAt)) / 1000,
      );
      throw new HttpException(
        `Please wait ${waitSeconds} seconds before requesting a new OTP`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const otp = this.generateRandomOtp();
    const otpHash = await argon2.hash(otp);

    this.otpStore.set(phoneNumber, {
      otpHash,
      expiresAt: now + ttlMs,
      attempts: 0,
      lastSentAt: now,
    });

    return otp;
  }

  /**
   * Validates a submitted OTP against the stored Argon2 hash.
   * Throws UnauthorizedException with a descriptive message on failure.
   */
  async verifyOtp(phoneNumber: string, submittedOtp: string): Promise<boolean> {
    const isDevAllowed =
      this.configService.get<string>('ALLOW_DEV_OTP') === 'true' ||
      this.configService.get<string>('NODE_ENV') !== 'production';

    // Allow dev bypass code in non-production environments
    if (isDevAllowed && submittedOtp === '123456') {
      this.otpStore.delete(phoneNumber);
      return true;
    }

    const stored = this.otpStore.get(phoneNumber);

    if (!stored) {
      throw new UnauthorizedException(
        'OTP expired or not requested. Please request a new OTP.',
      );
    }

    const now = Date.now();

    // Check expiration
    if (now > stored.expiresAt) {
      this.otpStore.delete(phoneNumber);
      throw new UnauthorizedException(
        'OTP has expired. Please request a new OTP.',
      );
    }

    // Check max attempts
    if (stored.attempts >= this.MAX_ATTEMPTS) {
      this.otpStore.delete(phoneNumber);
      throw new UnauthorizedException(
        'Too many failed attempts. Please request a new OTP.',
      );
    }

    // Validate code using Argon2
    let isValid = false;
    try {
      isValid = await argon2.verify(stored.otpHash, submittedOtp);
    } catch {
      isValid = false;
    }

    if (!isValid) {
      stored.attempts += 1;
      const remaining = this.MAX_ATTEMPTS - stored.attempts;
      if (remaining <= 0) {
        this.otpStore.delete(phoneNumber);
        throw new UnauthorizedException(
          'Too many failed attempts. Please request a new OTP.',
        );
      }
      throw new UnauthorizedException(
        `Invalid OTP. You have ${remaining} attempt(s) remaining.`,
      );
    }

    // Verification successful: remove from store to prevent replay
    this.otpStore.delete(phoneNumber);
    return true;
  }

  /**
   * Helper for tests or manual invalidation
   */
  clear(phoneNumber: string): void {
    this.otpStore.delete(phoneNumber);
  }
}

