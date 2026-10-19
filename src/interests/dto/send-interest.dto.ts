import { IsOptional, IsString, MaxLength, IsBoolean } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class SendInterestDto {
  @ApiPropertyOptional({
    example: 'Jai Jinendra! I found your profile culturally aligned with our family values.',
    description: 'Optional warm icebreaker or personal introductory note (max 300 chars)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  icebreakerNote?: string;

  @ApiPropertyOptional({
    example: true,
    description: 'Whether to proactively grant photo access to the recipient upon sending',
  })
  @IsOptional()
  @IsBoolean()
  grantPhotoAccess?: boolean;
}

