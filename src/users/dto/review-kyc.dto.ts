import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { KycStatus } from '../../common/enums/matrimony.enum.js';

export class ReviewKycDto {
  @ApiProperty({
    enum: [KycStatus.APPROVED, KycStatus.REJECTED],
    description: 'Admin review decision (Approved or Rejected)',
    example: KycStatus.APPROVED,
  })
  @IsEnum(KycStatus)
  status: KycStatus;

  @ApiPropertyOptional({
    description: 'Reason for rejecting KYC (required if status is Rejected)',
    example: 'Uploaded document is blurred or name does not match profile name',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  rejectionReason?: string;
}

