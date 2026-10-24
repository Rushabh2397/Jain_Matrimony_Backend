import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsIn, IsNotEmpty, IsString } from 'class-validator';
import { MediaUploadType } from '../../common/enums/matrimony.enum.js';

export const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
] as const;

export class GenerateUploadUrlDto {
  @ApiProperty({
    enum: MediaUploadType,
    description: 'Target category of media upload',
    example: MediaUploadType.PROFILE_PHOTO,
  })
  @IsEnum(MediaUploadType)
  fileType: MediaUploadType;

  @ApiProperty({
    description: 'MIME content type of the file to be uploaded',
    example: 'image/jpeg',
    enum: ALLOWED_MIME_TYPES,
  })
  @IsString()
  @IsNotEmpty()
  @IsIn(ALLOWED_MIME_TYPES, {
    message: `contentType must be one of: ${ALLOWED_MIME_TYPES.join(', ')}`,
  })
  contentType: string;

  @ApiProperty({
    description: 'Original name of the file to be uploaded',
    example: 'my-avatar.jpg',
  })
  @IsString()
  @IsNotEmpty()
  fileName: string;
}

