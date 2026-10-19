import {
  IsOptional,
  IsString,
  MaxLength,
  IsArray,
  IsInt,
  Min,
  Max,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpsertProfileDetailsDto {
  // --- Bio & Lifestyle ---
  @ApiPropertyOptional({
    description: 'About Me / Partner Expectations note',
    maxLength: 1500,
    example:
      'Born and raised in Mumbai with strong Jain values. Looking for an understanding partner who values family traditions and vegetarian lifestyle.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1500)
  bio?: string;

  @ApiPropertyOptional({
    type: [String],
    description: 'Array of hobbies or interests (comma-free strings)',
    example: ['Travelling', 'Reading', 'Garba', 'Yoga'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Matches(/^[^,]+$/, {
    each: true,
    message: 'Individual hobby strings cannot contain commas',
  })
  hobbies?: string[];

  @ApiPropertyOptional({
    example: 175,
    minimum: 120,
    maximum: 230,
    description: 'Height in centimeters',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(120)
  @Max(230)
  heightCm?: number;

  @ApiPropertyOptional({
    type: [String],
    description: 'Languages known (comma-free strings)',
    example: ['Gujarati', 'Hindi', 'English', 'Marwari'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Matches(/^[^,]+$/, {
    each: true,
    message: 'Language names cannot contain commas',
  })
  languagesKnown?: string[];

  // --- Shwetambar Jain Cultural & Family Details ---
  @ApiPropertyOptional({
    example: 'Kashyap',
    maxLength: 120,
    description: 'Clan / Gotra',
  })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  gotra?: string;

  @ApiPropertyOptional({
    example: 'Patan',
    maxLength: 120,
    description: 'Vatan / Ancestral hometown',
  })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  nativePlace?: string;

  @ApiPropertyOptional({
    example: 'Kothari / Surat',
    maxLength: 120,
    description: 'Maternal family surname / native place (Mosal)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  mosal?: string;

  @ApiPropertyOptional({
    example: 'Ramesh Shah',
    maxLength: 120,
    description: "Father's full name",
  })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  fatherName?: string;

  @ApiPropertyOptional({
    example: 'Textile Business Owner',
    maxLength: 120,
    description: "Father's occupation",
  })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  fatherOccupation?: string;

  @ApiPropertyOptional({
    example: 'Sarita Shah',
    maxLength: 120,
    description: "Mother's full name",
  })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  motherName?: string;

  @ApiPropertyOptional({
    example: 'Homemaker',
    maxLength: 120,
    description: "Mother's occupation",
  })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  motherOccupation?: string;

  @ApiPropertyOptional({
    example: 1,
    minimum: 0,
    maximum: 15,
    description: 'Total number of brothers',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(15)
  brothersCount?: number;

  @ApiPropertyOptional({
    example: 0,
    minimum: 0,
    maximum: 15,
    description: 'Number of married brothers',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(15)
  marriedBrothersCount?: number;

  @ApiPropertyOptional({
    example: 1,
    minimum: 0,
    maximum: 15,
    description: 'Total number of sisters',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(15)
  sistersCount?: number;

  @ApiPropertyOptional({
    example: 1,
    minimum: 0,
    maximum: 15,
    description: 'Number of married sisters',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(15)
  marriedSistersCount?: number;

  // --- Astrology / Kundli Details (Optional) ---
  @ApiPropertyOptional({
    example: '14:30',
    maxLength: 120,
    description: 'Time of birth (e.g. 14:30)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  timeOfBirth?: string;

  @ApiPropertyOptional({
    example: 'Ahmedabad',
    maxLength: 120,
    description: 'Place of birth',
  })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  placeOfBirth?: string;
}

