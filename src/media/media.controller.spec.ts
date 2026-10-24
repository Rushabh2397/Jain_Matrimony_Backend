import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MediaController } from './media.controller.js';
import { MediaService, PresignedUrlResponse } from './media.service.js';
import { MediaUploadType } from '../common/enums/matrimony.enum.js';
import { GenerateUploadUrlDto } from './dto/generate-upload-url.dto.js';
import { ActiveUserData } from '../common/decorators/current-user.decorator.js';

describe('MediaController', () => {
  let controller: MediaController;
  let mockMediaService: Partial<Record<keyof MediaService, ReturnType<typeof vi.fn>>>;

  const mockActiveUser: ActiveUserData = {
    userId: '11111111-1111-1111-1111-111111111111',
  };

  beforeEach(() => {
    mockMediaService = {
      generatePresignedUploadUrl: vi.fn(),
    };

    controller = new MediaController(
      mockMediaService as unknown as MediaService,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('generatePresignedUrl (POST /media/presigned-url)', () => {
    it('should extract userId from ActiveUserData and delegate to mediaService', async () => {
      const dto: GenerateUploadUrlDto = {
        fileType: MediaUploadType.PROFILE_PHOTO,
        contentType: 'image/jpeg',
        fileName: 'selfie.jpg',
      };

      const mockResponse: PresignedUrlResponse = {
        uploadUrl: 'https://storage.example.com/upload-signed-url',
        fileUrl: 'https://cdn.jainmatrimony.app/users/11111111-1111-1111-1111-111111111111/avatar-123.jpg',
        key: 'users/11111111-1111-1111-1111-111111111111/avatar-123.jpg',
        expiresInSeconds: 300,
      };

      mockMediaService.generatePresignedUploadUrl!.mockResolvedValue(mockResponse);

      const result = await controller.generatePresignedUrl(mockActiveUser, dto);

      expect(mockMediaService.generatePresignedUploadUrl).toHaveBeenCalledWith(
        mockActiveUser.userId,
        dto,
      );
      expect(result).toEqual(mockResponse);
    });
  });
});

