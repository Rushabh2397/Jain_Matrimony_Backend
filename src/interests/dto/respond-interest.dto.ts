import { IsEnum, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { InterestStatus } from '../../common/enums/matrimony.enum.js';

export class RespondInterestDto {
  @ApiProperty({
    enum: [InterestStatus.ACCEPTED, InterestStatus.DECLINED],
    example: InterestStatus.ACCEPTED,
    description: 'Decision status: Accepted (unlocks conversation) or Declined',
  })
  @IsEnum(InterestStatus)
  status: InterestStatus;

  @ApiPropertyOptional({
    example: true,
    description: 'Whether to reciprocally grant photo access to the sender',
  })
  @IsOptional()
  @IsBoolean()
  grantPhotoAccess?: boolean;
}

