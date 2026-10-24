import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { MediaUploadType } from '../common/enums/matrimony.enum.js';
import { GenerateUploadUrlDto } from './dto/generate-upload-url.dto.js';

export interface PresignedUrlResponse {
  uploadUrl: string;
  fileUrl: string;
  key: string;
  expiresInSeconds: number;
}

@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);
  private readonly s3Client: S3Client | null = null;
  private readonly bucketName: string;
  private readonly cdnBaseUrl: string;

  constructor() {
    const region = process.env.S3_REGION || 'auto';
    const endpoint = process.env.S3_ENDPOINT;
    const accessKeyId = process.env.S3_ACCESS_KEY_ID;
    const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;
    this.bucketName = process.env.S3_BUCKET_NAME || 'jain-matrimony-media';
    const defaultBaseUrl = endpoint
      ? `${endpoint.replace(/\/$/, '')}/${this.bucketName}`
      : `https://${this.bucketName}.s3.${region}.amazonaws.com`;
    this.cdnBaseUrl = (
      process.env.CDN_BASE_URL || defaultBaseUrl
    ).replace(/\/$/, '');

    if (accessKeyId && secretAccessKey) {
      this.s3Client = new S3Client({
        region,
        ...(endpoint ? { endpoint } : {}),
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
      });
      this.logger.log(
        `Initialized S3Client with bucket "${this.bucketName}" (endpoint: ${endpoint || 'AWS Default'})`,
      );
    } else {
      this.logger.warn(
        '[DEV MODE] S3 credentials (S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY) not found. Running MediaService in mock presigned URL mode.',
      );
    }
  }

  /**
   * Generates a secure presigned upload URL for direct-to-storage client uploads.
   * Compatible with AWS S3, Cloudflare R2, and MinIO.
   */
  async generatePresignedUploadUrl(
    userId: string,
    dto: GenerateUploadUrlDto,
  ): Promise<PresignedUrlResponse> {
    if (
      dto.fileType !== MediaUploadType.KYC_DOCUMENT &&
      dto.contentType === 'application/pdf'
    ) {
      throw new BadRequestException(
        'PDF format is only permitted for KYC document verification',
      );
    }

    const extensionMap: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
      'application/pdf': 'pdf',
    };

    const ext = extensionMap[dto.contentType] || 'jpg';
    const timestamp = Date.now();

    let key: string;
    switch (dto.fileType) {
      case MediaUploadType.PROFILE_PHOTO:
        key = `users/${userId}/avatar-${timestamp}.${ext}`;
        break;
      case MediaUploadType.GALLERY_PHOTO:
        key = `users/${userId}/gallery-${timestamp}.${ext}`;
        break;
      case MediaUploadType.KYC_DOCUMENT:
        key = `kyc/${userId}/doc-${timestamp}.${ext}`;
        break;
      default:
        throw new BadRequestException('Unsupported media upload type');
    }

    const expiresInSeconds = 300; // 5 minutes validity
    const fileUrl = `${this.cdnBaseUrl}/${key}`;

    if (this.s3Client) {
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        ContentType: dto.contentType,
      });

      const uploadUrl = await getSignedUrl(this.s3Client, command, {
        expiresIn: expiresInSeconds,
      });

      return {
        uploadUrl,
        fileUrl,
        key,
        expiresInSeconds,
      };
    }

    // Dev/Mock fallback when AWS credentials are not configured
    const mockUploadUrl = `https://mock-s3.local/${this.bucketName}/${key}?expires=${expiresInSeconds}`;
    return {
      uploadUrl: mockUploadUrl,
      fileUrl,
      key,
      expiresInSeconds,
    };
  }
}

