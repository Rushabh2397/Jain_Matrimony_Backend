import { IsOptional, IsInt, Min, Max, IsEnum, IsString, IsBoolean } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Sect, SubSect, Diet } from '../../common/enums/matrimony.enum.js';

export class MatchFeedQueryDto {
  @ApiPropertyOptional({ example: 1, default: 1, description: 'Page number' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 10, default: 10, description: 'Items per page (max 50)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 10;

  @ApiPropertyOptional({ example: 50, description: 'Minimum compatibility score percentage (0-100)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  minScore?: number;

  @ApiPropertyOptional({ enum: Sect, enumName: 'Sect', description: 'Filter candidates by Sect' })
  @IsOptional()
  @IsEnum(Sect)
  sect?: Sect;

  @ApiPropertyOptional({ enum: SubSect, enumName: 'SubSect', description: 'Filter candidates by Sub-Sect' })
  @IsOptional()
  @IsEnum(SubSect)
  subSect?: SubSect;

  @ApiPropertyOptional({ enum: Diet, enumName: 'Diet', description: 'Filter candidates by Dietary preference' })
  @IsOptional()
  @IsEnum(Diet)
  diet?: Diet;

  @ApiPropertyOptional({ example: 'Mumbai', description: 'Filter candidates by City' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({
    example: false,
    default: false,
    description: 'Whether to include profiles with whom an interest request already exists',
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  includeInteracted?: boolean = false;
}

