import {
  IsOptional,
  IsEnum,
  IsInt,
  Min,
  Max,
  IsArray,
  IsString,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  Gender,
  MaritalStatus,
  Sect,
  SubSect,
  Diet,
  IncomeRange,
  EducationLevel,
  OccupationType,
  FamilyType,
} from '../../common/enums/matrimony.enum.js';

export class UpsertPartnerPreferencesDto {
  @ApiPropertyOptional({ enum: Gender, enumName: 'Gender' })
  @IsOptional()
  @IsEnum(Gender)
  preferredGender?: Gender;

  @ApiPropertyOptional({ example: 22, minimum: 18, maximum: 80 })
  @IsOptional()
  @IsInt()
  @Min(18)
  @Max(80)
  minAge?: number;

  @ApiPropertyOptional({ example: 28, minimum: 18, maximum: 80 })
  @IsOptional()
  @IsInt()
  @Min(18)
  @Max(80)
  maxAge?: number;

  @ApiPropertyOptional({
    enum: MaritalStatus,
    isArray: true,
    enumName: 'MaritalStatus',
    example: [MaritalStatus.NEVER_MARRIED],
  })
  @IsOptional()
  @IsArray()
  @IsEnum(MaritalStatus, { each: true })
  preferredMaritalStatuses?: MaritalStatus[];

  @ApiPropertyOptional({
    enum: Sect,
    isArray: true,
    enumName: 'Sect',
    example: [Sect.MURTIPUJAK],
  })
  @IsOptional()
  @IsArray()
  @IsEnum(Sect, { each: true })
  preferredSects?: Sect[];

  @ApiPropertyOptional({
    enum: SubSect,
    isArray: true,
    enumName: 'SubSect',
    example: [SubSect.OSWAL, SubSect.VISA_OSWAL],
  })
  @IsOptional()
  @IsArray()
  @IsEnum(SubSect, { each: true })
  preferredSubSects?: SubSect[];

  @ApiPropertyOptional({
    enum: Diet,
    isArray: true,
    enumName: 'Diet',
    example: [Diet.STRICT_JAIN, Diet.CHOVIHAR_JAIN],
  })
  @IsOptional()
  @IsArray()
  @IsEnum(Diet, { each: true })
  preferredDiets?: Diet[];

  @ApiPropertyOptional({
    enum: EducationLevel,
    isArray: true,
    enumName: 'EducationLevel',
    example: [EducationLevel.BACHELORS, EducationLevel.MASTERS],
  })
  @IsOptional()
  @IsArray()
  @IsEnum(EducationLevel, { each: true })
  preferredEducationLevels?: EducationLevel[];

  @ApiPropertyOptional({
    enum: OccupationType,
    isArray: true,
    enumName: 'OccupationType',
    example: [OccupationType.CA_FINANCE, OccupationType.SOFTWARE_IT],
  })
  @IsOptional()
  @IsArray()
  @IsEnum(OccupationType, { each: true })
  preferredOccupations?: OccupationType[];

  @ApiPropertyOptional({ enum: IncomeRange, enumName: 'IncomeRange' })
  @IsOptional()
  @IsEnum(IncomeRange)
  minIncome?: IncomeRange;

  @ApiPropertyOptional({
    enum: FamilyType,
    isArray: true,
    enumName: 'FamilyType',
    example: [FamilyType.NUCLEAR, FamilyType.JOINT],
  })
  @IsOptional()
  @IsArray()
  @IsEnum(FamilyType, { each: true })
  preferredFamilyTypes?: FamilyType[];

  @ApiPropertyOptional({
    type: [String],
    example: ['Mumbai', 'Ahmedabad', 'Pune', 'Surat'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  preferredCities?: string[];

  @ApiPropertyOptional({
    type: [String],
    example: ['Maharashtra', 'Gujarat', 'Rajasthan'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  preferredStates?: string[];
}
