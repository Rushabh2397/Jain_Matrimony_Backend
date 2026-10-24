import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { MediaService } from './media.service.js';
import { MediaUploadType } from '../common/enums/matrimony.enum.js';
import { GenerateUploadUrlDto } from './dto/generate-upload-url.dto.js';

// Mock @aws-sdk/s3-request-presigner
vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: vi
    .fn()
    .mockResolvedValue('https://s3.amazonaws.com/test-bucket/signed-url?token=123'),
}));

describe('MediaService', () => {
  const originalEnv = process.env;
  const userId = 'user-123-uuid';

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
    delete process.env.S3_ACCESS_KEY_ID;
    delete process.env.S3_SECRET_ACCESS_KEY;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('Dev / Mock mode (without S3 credentials)', () => {
    let service: MediaService;

    beforeEach(() => {
      service = new MediaService();
    });

    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should generate a mock presigned URL for PROFILE_PHOTO', async () => {
      const dto: GenerateUploadUrlDto = {
        fileType: MediaUploadType.PROFILE_PHOTO,
        contentType: 'image/jpeg',
        fileName: 'avatar.jpg',
      };

      const result = await service.generatePresignedUploadUrl(userId, dto);

      expect(result).toBeDefined();
      expect(result.uploadUrl).toContain('https://mock-s3.local');
      expect(result.fileUrl).toContain(`users/${userId}/avatar-`);
      expect(result.fileUrl).toMatch(/\.jpg$/);
      expect(result.key).toMatch(new RegExp(`^users/${userId}/avatar-\\d+\\.jpg$`));
      expect(result.expiresInSeconds).toBe(300);
    });

    it('should generate a mock presigned URL for GALLERY_PHOTO', async () => {
      const dto: GenerateUploadUrlDto = {
        fileType: MediaUploadType.GALLERY_PHOTO,
        contentType: 'image/png',
        fileName: 'vacation.png',
      };

      const result = await service.generatePresignedUploadUrl(userId, dto);

      expect(result.uploadUrl).toContain('https://mock-s3.local');
      expect(result.fileUrl).toContain(`users/${userId}/gallery-`);
      expect(result.fileUrl).toMatch(/\.png$/);
      expect(result.key).toMatch(new RegExp(`^users/${userId}/gallery-\\d+\\.png$`));
    });

    it('should generate a mock presigned URL for KYC_DOCUMENT with PDF format', async () => {
      const dto: GenerateUploadUrlDto = {
        fileType: MediaUploadType.KYC_DOCUMENT,
        contentType: 'application/pdf',
        fileName: 'aadhaar-card.pdf',
      };

      const result = await service.generatePresignedUploadUrl(userId, dto);

      expect(result.uploadUrl).toContain('https://mock-s3.local');
      expect(result.fileUrl).toContain(`kyc/${userId}/doc-`);
      expect(result.fileUrl).toMatch(/\.pdf$/);
      expect(result.key).toMatch(new RegExp(`^kyc/${userId}/doc-\\d+\\.pdf$`));
    });

    it('should throw BadRequestException if PDF is provided for PROFILE_PHOTO', async () => {
      const dto: GenerateUploadUrlDto = {
        fileType: MediaUploadType.PROFILE_PHOTO,
        contentType: 'application/pdf',
        fileName: 'avatar.pdf',
      };

      await expect(service.generatePresignedUploadUrl(userId, dto)).rejects.toThrow(
        new BadRequestException('PDF format is only permitted for KYC document verification'),
      );
    });

    it('should throw BadRequestException if PDF is provided for GALLERY_PHOTO', async () => {
      const dto: GenerateUploadUrlDto = {
        fileType: MediaUploadType.GALLERY_PHOTO,
        contentType: 'application/pdf',
        fileName: 'gallery.pdf',
      };

      await expect(service.generatePresignedUploadUrl(userId, dto)).rejects.toThrow(
        new BadRequestException('PDF format is only permitted for KYC document verification'),
      );
    });
  });

  describe('Production S3 mode (with S3 credentials)', () => {
    let service: MediaService;

    beforeEach(() => {
      process.env.S3_REGION = 'us-east-1';
      process.env.S3_ACCESS_KEY_ID = 'test-key-id';
      process.env.S3_SECRET_ACCESS_KEY = 'test-secret-key';
      process.env.S3_BUCKET_NAME = 'custom-jain-bucket';
      process.env.CDN_BASE_URL = 'https://media.jainmatrimony.app';

      service = new MediaService();
    });

    it('should generate presigned URL via AWS SDK getSignedUrl', async () => {
      const dto: GenerateUploadUrlDto = {
        fileType: MediaUploadType.PROFILE_PHOTO,
        contentType: 'image/webp',
        fileName: 'photo.webp',
      };

      const result = await service.generatePresignedUploadUrl(userId, dto);

      expect(result.uploadUrl).toBe(
        'https://s3.amazonaws.com/test-bucket/signed-url?token=123',
      );
      expect(result.fileUrl).toContain('https://media.jainmatrimony.app/users/');
      expect(result.key).toMatch(new RegExp(`^users/${userId}/avatar-\\d+\\.webp$`));
      expect(result.expiresInSeconds).toBe(300);
    });
  });
});

