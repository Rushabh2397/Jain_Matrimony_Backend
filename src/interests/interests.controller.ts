import {
  Controller,
  Post,
  Patch,
  Get,
  Param,
  Body,
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
import { InterestsService } from './interests.service.js';
import { SendInterestDto } from './dto/send-interest.dto.js';
import { RespondInterestDto } from './dto/respond-interest.dto.js';
import { TogglePhotoAccessDto } from './dto/toggle-photo-access.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import {
  CurrentUser,
  type ActiveUserData,
} from '../common/decorators/current-user.decorator.js';
import { InterestRequest } from './entities/interest-request.entity.js';
import { Conversation } from '../chat/entities/conversation.entity.js';

@ApiTags('Interests & Handshake')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('interests')
export class InterestsController {
  constructor(private readonly interestsService: InterestsService) {}

  @Get('received')
  @ApiOperation({ summary: 'Get all interest requests received by the authenticated user' })
  @ApiResponse({ status: 200, description: 'List of received interest requests returned' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getReceived(
    @CurrentUser() user: ActiveUserData,
  ): Promise<InterestRequest[]> {
    return await this.interestsService.getReceivedInterests(user.userId);
  }

  @Get('sent')
  @ApiOperation({ summary: 'Get all interest requests sent by the authenticated user' })
  @ApiResponse({ status: 200, description: 'List of sent interest requests returned' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getSent(
    @CurrentUser() user: ActiveUserData,
  ): Promise<InterestRequest[]> {
    return await this.interestsService.getSentInterests(user.userId);
  }

  @Post(':receiverId')
  @ApiOperation({ summary: 'Send an interest handshake request to another member' })
  @ApiParam({ name: 'receiverId', description: 'Target user UUID' })
  @ApiResponse({ status: 201, description: 'Interest request sent successfully' })
  @ApiResponse({ status: 400, description: 'Cannot send interest to yourself' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Target user not found' })
  @ApiResponse({ status: 409, description: 'Interest request already exists between users' })
  async sendInterest(
    @CurrentUser() user: ActiveUserData,
    @Param('receiverId', ParseUUIDPipe) receiverId: string,
    @Body() dto: SendInterestDto,
  ): Promise<InterestRequest> {
    return await this.interestsService.sendInterest(user.userId, receiverId, dto);
  }

  @Patch(':requestId/respond')
  @ApiOperation({
    summary: 'Respond to an interest request (Accept or Decline). Accepting unlocks chat room.',
  })
  @ApiParam({ name: 'requestId', description: 'Interest request UUID' })
  @ApiResponse({ status: 200, description: 'Interest responded successfully' })
  @ApiResponse({ status: 400, description: 'Invalid status or request no longer pending' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden: Only the receiver can respond' })
  @ApiResponse({ status: 404, description: 'Interest request not found' })
  async respondToInterest(
    @CurrentUser() user: ActiveUserData,
    @Param('requestId', ParseUUIDPipe) requestId: string,
    @Body() dto: RespondInterestDto,
  ): Promise<{ request: InterestRequest; conversation: Conversation | null }> {
    return await this.interestsService.respondToInterest(
      user.userId,
      requestId,
      dto,
    );
  }

  @Patch(':requestId/photo-access')
  @ApiOperation({
    summary: 'Sender toggle of grantPhotoAccess on an interest request',
  })
  @ApiParam({ name: 'requestId', description: 'Interest request UUID' })
  @ApiResponse({ status: 200, description: 'Photo access setting updated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden: Only the sender can toggle photo access' })
  @ApiResponse({ status: 404, description: 'Interest request not found' })
  async togglePhotoAccess(
    @CurrentUser() user: ActiveUserData,
    @Param('requestId', ParseUUIDPipe) requestId: string,
    @Body() dto: TogglePhotoAccessDto,
  ): Promise<InterestRequest> {
    return await this.interestsService.togglePhotoAccess(
      user.userId,
      requestId,
      dto,
    );
  }
}

