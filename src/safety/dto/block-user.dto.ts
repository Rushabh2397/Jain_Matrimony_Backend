import { IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class BlockUserDto {
  @ApiPropertyOptional({
    example: 'Incompatible values and harassment',
    description: 'Optional reason for blocking user',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  reason?: string;
}

