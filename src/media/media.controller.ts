import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { MediaService, PresignedUrlResponse } from './media.service.js';
import { GenerateUploadUrlDto } from './dto/generate-upload-url.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import {
  CurrentUser,
  type ActiveUserData,
} from '../common/decorators/current-user.decorator.js';

@ApiTags('Media & Storage')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('media')
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Post('presigned-url')
  @ApiOperation({
    summary:
      'Generate a short-lived presigned URL for direct S3/R2 client upload',
  })
  @ApiResponse({
    status: 201,
    description: 'Presigned upload URL generated successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid upload type, MIME type, or file parameters',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async generatePresignedUrl(
    @CurrentUser() user: ActiveUserData,
    @Body() dto: GenerateUploadUrlDto,
  ): Promise<PresignedUrlResponse> {
    return await this.mediaService.generatePresignedUploadUrl(
      user.userId,
      dto,
    );
  }
}

