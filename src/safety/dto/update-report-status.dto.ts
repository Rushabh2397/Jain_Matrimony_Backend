import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ReportStatus } from '../../common/enums/matrimony.enum.js';

export class UpdateReportStatusDto {
  @ApiProperty({
    enum: ReportStatus,
    example: ReportStatus.RESOLVED,
    description: 'Updated review status for the report',
  })
  @IsEnum(ReportStatus)
  status: ReportStatus;

  @ApiPropertyOptional({
    example: 'Account flagged for review and photos taken down.',
    description: 'Internal admin moderation notes',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  adminNotes?: string;
}

