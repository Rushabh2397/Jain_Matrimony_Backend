import { IsNotEmpty, IsString, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SendOtpDto {
  @ApiProperty({
    example: '+919876543210',
    description: 'User mobile number with country code in E.164 format',
  })
  @IsNotEmpty()
  @IsString()
  @Matches(/^\+[1-9]\d{1,14}$/, {
    message:
      'Phone number must be in valid international format (e.g., +919876543210)',
  })
  phoneNumber: string;
}

export class VerifyOtpDto {
  @ApiProperty({
    example: '+919876543210',
    description: 'User mobile number with country code in E.164 format',
  })
  @IsNotEmpty()
  @IsString()
  phoneNumber: string;

  @ApiProperty({
    example: '123456',
    description: '6-digit OTP code received via SMS/WhatsApp (use 123456 for dev)',
  })
  @IsNotEmpty()
  @IsString()
  otp: string; // In production, this is verified against SMS/WhatsApp gateway
}

export class AuthUserSummaryDto {
  @ApiProperty({ example: 'fd8ee954-1483-4116-a4bf-ebc4d01beba2' })
  id: string;

  @ApiProperty({ example: true, description: 'True if profile has not yet been set up' })
  isNewUser: boolean;

  @ApiProperty({ example: false, description: 'True if essential matrimonial profile fields are complete' })
  isProfileComplete: boolean;
}

export class VerifyOtpResponseDto {
  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'JWT Bearer access token',
  })
  accessToken: string;

  @ApiProperty({ type: AuthUserSummaryDto })
  user: AuthUserSummaryDto;
}