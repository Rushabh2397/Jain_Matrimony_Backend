import {
  Controller,
  Get,
  Query,
  Param,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { MatchesService } from './matches.service.js';
import { MatchFeedQueryDto } from './dto/match-feed-query.dto.js';
import {
  MatchFeedResponse,
  MatchDetailResponse,
} from './interfaces/match-response.interface.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import {
  CurrentUser,
  type ActiveUserData,
} from '../common/decorators/current-user.decorator.js';

@ApiTags('SoulSync Matches & Discovery')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('matches')
export class MatchesController {
  constructor(private readonly matchesService: MatchesService) {}

  @Get()
  @ApiOperation({
    summary: 'Get SoulSync discovery feed of compatible matrimonial profiles',
    description:
      'Calculates compatibility score based on Sect, Sub-Sect, Diet, Age, and Location. Automatically excludes self, same-gender, and incompatible marital statuses.',
  })
  @ApiResponse({
    status: 200,
    description: 'Discovery feed returned successfully ordered by compatibility score',
  })
  @ApiResponse({ status: 400, description: 'Profile incomplete (gender/dateOfBirth missing)' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getDiscoveryFeed(
    @CurrentUser() user: ActiveUserData,
    @Query() query: MatchFeedQueryDto,
  ): Promise<MatchFeedResponse> {
    return await this.matchesService.getDiscoveryFeed(user.userId, query);
  }

  @Get(':id/score')
  @ApiOperation({
    summary: 'Get detailed SoulSync compatibility score breakdown with a specific candidate',
  })
  @ApiParam({ name: 'id', description: 'Candidate user UUID' })
  @ApiResponse({
    status: 200,
    description: 'Detailed compatibility score breakdown calculated',
  })
  @ApiResponse({ status: 400, description: 'Cannot calculate score with yourself' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Candidate profile not found' })
  async getMatchScore(
    @CurrentUser() user: ActiveUserData,
    @Param('id', ParseUUIDPipe) candidateId: string,
  ): Promise<MatchDetailResponse> {
    return await this.matchesService.getMatchScore(user.userId, candidateId);
  }
}

