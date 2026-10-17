import { IsEnum, IsOptional, IsString, IsDateString, IsBoolean, IsArray } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { 
  Gender, 
  MaritalStatus, 
  IncomeRange, 
  Sect, 
  SubSect, 
  Diet,
  EducationLevel,
  OccupationType,
  FamilyType,
} from '../../common/enums/matrimony.enum.js';

export class UpdateProfileDto {
  @ApiPropertyOptional({ example: 'Rushabh Sancheti' })
  @IsOptional()
  @IsString()
  fullName?: string;

  @ApiPropertyOptional({ example: '1998-05-15', description: 'YYYY-MM-DD format' })
  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @ApiPropertyOptional({ enum: Gender, enumName: 'Gender' })
  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  @ApiPropertyOptional({ enum: MaritalStatus, enumName: 'MaritalStatus' })
  @IsOptional()
  @IsEnum(MaritalStatus)
  maritalStatus?: MaritalStatus;

  // --- Shwetambar Jain Cultural & Religious Fields ---
  @ApiPropertyOptional({ enum: Sect, enumName: 'Sect' })
  @IsOptional()
  @IsEnum(Sect)
  sect?: Sect;

  @ApiPropertyOptional({ enum: SubSect, enumName: 'SubSect' })
  @IsOptional()
  @IsEnum(SubSect)
  subSect?: SubSect;

  @ApiPropertyOptional({ enum: Diet, enumName: 'Diet' })
  @IsOptional()
  @IsEnum(Diet)
  diet?: Diet;

  // --- Professional & Education Details ---
  @ApiPropertyOptional({ enum: EducationLevel, enumName: 'EducationLevel' })
  @IsOptional()
  @IsEnum(EducationLevel)
  highestEducation?: EducationLevel;

  @ApiPropertyOptional({ enum: OccupationType, enumName: 'OccupationType' })
  @IsOptional()
  @IsEnum(OccupationType)
  occupation?: OccupationType;

  @ApiPropertyOptional({ example: 'Google / Self-Employed' })
  @IsOptional()
  @IsString()
  organizationName?: string;

  @ApiPropertyOptional({ enum: IncomeRange, enumName: 'IncomeRange' })
  @IsOptional()
  @IsEnum(IncomeRange)
  annualIncome?: IncomeRange;

  // --- Family Details ---
  @ApiPropertyOptional({ enum: FamilyType, enumName: 'FamilyType' })
  @IsOptional()
  @IsEnum(FamilyType)
  familyType?: FamilyType;

  // --- Location Details ---
  @ApiPropertyOptional({ example: 'Mumbai' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ example: 'Maharashtra' })
  @IsOptional()
  @IsString()
  state?: string;

  @ApiPropertyOptional({ example: 'India' })
  @IsOptional()
  @IsString()
  country?: string;

  // --- Photos & Privacy Control ---
  @ApiPropertyOptional({ example: 'https://cdn.jainmatrimony.app/defaults/placeholder-avatar.png' })
  @IsOptional()
  @IsString()
  defaultPhotoUrl?: string;

  @ApiPropertyOptional({ type: [String], example: ['https://cdn.jainmatrimony.app/photos/p1.jpg'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  photoUrls?: string[];

  @ApiPropertyOptional({ example: true, description: 'True requires ask-to-view permission' })
  @IsOptional()
  @IsBoolean()
  isPhotosLocked?: boolean;
}