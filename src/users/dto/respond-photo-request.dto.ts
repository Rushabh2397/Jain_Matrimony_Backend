import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PhotoRequestStatus } from '../../common/enums/matrimony.enum.js';

export class RespondPhotoRequestDto {
  @ApiProperty({
    enum: [
      PhotoRequestStatus.APPROVED,
      PhotoRequestStatus.DECLINED,
      PhotoRequestStatus.REVOKED,
    ],
    example: PhotoRequestStatus.APPROVED,
    description: 'Response status: Approved, Declined, or Revoked',
  })
  @IsEnum(PhotoRequestStatus)
  status: PhotoRequestStatus;
}

