import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class DeleteAccountDto {
  @ApiPropertyOptional({
    description: 'Optional feedback or reason for deleting the account',
    example: 'Found a partner through family connections',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

