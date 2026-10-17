import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service.js';
import { VerifyOtpResponseDto } from './dto/auth.dto.js';
import { UserRole } from '../common/enums/matrimony.enum.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  // Mock OTP trigger (In production, integrate Twilio/MSG91/WhatsApp API here)
  async sendOtp(phoneNumber: string): Promise<{ message: string }> {
    const user = await this.usersService.findByPhoneNumber(phoneNumber);

    // If user doesn't exist yet, pre-register a minimal profile
    if (!user) {
      await this.usersService.create({ phoneNumber, fullName: 'New Jain User' });
    }

    // For development, we mock sending OTP. In production, send via SMS gateway.
    console.log(`[DEV MODE] OTP for ${phoneNumber}: 123456`);
    return { message: 'OTP sent successfully' };
  }

  // Verify OTP and issue JWT access token with concise onboarding flags
  async verifyOtp(
    phoneNumber: string,
    otp: string,
  ): Promise<VerifyOtpResponseDto> {
    // In production, validate OTP from Redis/Cache. For dev, accept '123456'.
    if (otp !== '123456') {
      throw new UnauthorizedException('Invalid OTP');
    }

    let user = await this.usersService.findByPhoneNumber(phoneNumber);
    let isNewUser = false;

    if (!user) {
      user = await this.usersService.create({
        phoneNumber,
        fullName: 'New Jain User',
      });
      isNewUser = true;
    } else {
      // If basic profile details (gender & DOB) are not yet populated, user is still in onboarding
      isNewUser = Boolean(!user.gender && !user.dateOfBirth);
    }

    // Check if essential matrimonial profile fields are complete
    const isProfileComplete = Boolean(
      user.gender &&
        user.dateOfBirth &&
        user.maritalStatus &&
        user.sect &&
        user.diet,
    );

    // Generate JWT Payload
    const payload = { sub: user.id, role: user.role || UserRole.USER };
    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      user: {
        id: user.id,
        isNewUser,
        isProfileComplete,
      },
    };
  }
}