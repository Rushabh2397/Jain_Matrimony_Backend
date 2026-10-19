import {
  IsEnum,
  IsOptional,
  IsString,
  IsBoolean,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ReportReason } from '../../common/enums/matrimony.enum.js';

export class ReportUserDto {
  @ApiProperty({
    enum: ReportReason,
    example: ReportReason.FAKE_PROFILE,
    description: 'Category / reason for reporting user',
  })
  @IsEnum(ReportReason)
  reason: ReportReason;

  @ApiPropertyOptional({
    example: 'Profile uses misleading pictures and asked for money',
    description: 'Detailed description of the incident / complaint',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional({
    example: true,
    description:
      'Whether to automatically block the reported user as well (defaults to true)',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  alsoBlock?: boolean;
}

