import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsString, IsUrl } from 'class-validator';
import { KycDocumentType } from '../../common/enums/matrimony.enum.js';

export class SubmitKycDto {
  @ApiProperty({
    enum: KycDocumentType,
    description: 'Type of government identification document',
    example: KycDocumentType.AADHAAR,
  })
  @IsEnum(KycDocumentType)
  documentType: KycDocumentType;

  @ApiProperty({
    description: 'Secure URL of uploaded identity document proof',
    example: 'https://storage.jainmatrimony.app/kyc/user-aadhaar-doc.pdf',
  })
  @IsString()
  @IsNotEmpty()
  @IsUrl()
  documentUrl: string;
}

