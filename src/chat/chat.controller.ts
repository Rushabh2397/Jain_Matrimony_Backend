import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { ChatService, SendMessageResult } from './chat.service.js';
import { SendMessageDto } from './dto/send-message.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import {
  CurrentUser,
  type ActiveUserData,
} from '../common/decorators/current-user.decorator.js';
import { Conversation } from './entities/conversation.entity.js';
import { Message } from './entities/message.entity.js';

@ApiTags('Chat & Messaging')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get('conversations')
  @ApiOperation({ summary: 'Get all active chat conversations for the authenticated user' })
  @ApiResponse({ status: 200, description: 'List of conversations returned' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getConversations(
    @CurrentUser() user: ActiveUserData,
  ): Promise<Conversation[]> {
    return await this.chatService.getUserConversations(user.userId);
  }

  @Get('conversations/:id/messages')
  @ApiOperation({ summary: 'Get paginated message history for a conversation' })
  @ApiParam({ name: 'id', description: 'Conversation UUID' })
  @ApiQuery({ name: 'limit', required: false, example: 50 })
  @ApiQuery({ name: 'offset', required: false, example: 0 })
  @ApiResponse({ status: 200, description: 'Message history returned' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden: User is not a participant' })
  @ApiResponse({ status: 404, description: 'Conversation not found' })
  async getMessages(
    @CurrentUser() user: ActiveUserData,
    @Param('id', ParseUUIDPipe) id: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ): Promise<Message[]> {
    const parsedLimit = limit ? Math.min(100, Math.max(1, parseInt(limit, 10))) : 50;
    const parsedOffset = offset ? Math.max(0, parseInt(offset, 10)) : 0;
    return await this.chatService.getConversationMessages(
      user.userId,
      id,
      parsedLimit,
      parsedOffset,
    );
  }

  @Post('messages')
  @ApiOperation({ summary: 'REST fallback endpoint for sending a message in a conversation' })
  @ApiResponse({ status: 201, description: 'Message sent and push notification triggered' })
  @ApiResponse({ status: 400, description: 'Conversation inactive' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden: User is not a participant' })
  @ApiResponse({ status: 404, description: 'Conversation or user not found' })
  async sendMessage(
    @CurrentUser() user: ActiveUserData,
    @Body() dto: SendMessageDto,
  ): Promise<SendMessageResult> {
    return await this.chatService.sendMessage(
      user.userId,
      dto.conversationId,
      dto.content,
    );
  }

  @Patch('conversations/:id/read')
  @ApiOperation({ summary: 'Mark all unread incoming messages in a conversation as read' })
  @ApiParam({ name: 'id', description: 'Conversation UUID' })
  @ApiResponse({ status: 200, description: 'Messages marked as read' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden: User is not a participant' })
  @ApiResponse({ status: 404, description: 'Conversation not found' })
  async markAsRead(
    @CurrentUser() user: ActiveUserData,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ success: boolean }> {
    await this.chatService.markMessagesAsRead(user.userId, id);
    return { success: true };
  }
}

