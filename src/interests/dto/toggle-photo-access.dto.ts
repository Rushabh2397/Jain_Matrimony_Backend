import { IsBoolean, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class TogglePhotoAccessDto {
  @ApiProperty({
    example: true,
    description: 'Toggle grant photo access flag on interest request',
  })
  @IsBoolean()
  @IsNotEmpty()
  grantPhotoAccess: boolean;
}

