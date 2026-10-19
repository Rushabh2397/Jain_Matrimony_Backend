import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Conversation } from './entities/conversation.entity.js';
import { Message } from './entities/message.entity.js';
import { User } from '../users/entities/user.entity.js';
import { NotificationsService } from '../notifications/notifications.service.js';

export interface SendMessageResult extends Message {
  recipientId: string;
}

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(Conversation)
    private readonly conversationRepo: Repository<Conversation>,
    @InjectRepository(Message)
    private readonly messageRepo: Repository<Message>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * Retrieves all conversations for the user, ordered by most recent message/activity.
   */
  async getUserConversations(userId: string): Promise<Conversation[]> {
    return await this.conversationRepo.find({
      where: [
        { userOne: { id: userId } },
        { userTwo: { id: userId } },
      ],
      relations: {
        userOne: true,
        userTwo: true,
      },
      select: {
        id: true,
        isActive: true,
        lastMessageAt: true,
        createdAt: true,
        updatedAt: true,
        userOne: {
          id: true,
          fullName: true,
          defaultPhotoUrl: true,
          city: true,
          occupation: true,
        },
        userTwo: {
          id: true,
          fullName: true,
          defaultPhotoUrl: true,
          city: true,
          occupation: true,
        },
      },
      order: {
        lastMessageAt: 'DESC',
        createdAt: 'DESC',
      },
    });
  }

  /**
   * Retrieves paginated messages for a conversation after verifying user participation.
   */
  async getConversationMessages(
    userId: string,
    conversationId: string,
    limit = 50,
    offset = 0,
  ): Promise<Message[]> {
    const conversation = await this.conversationRepo.findOne({
      where: { id: conversationId },
      relations: { userOne: true, userTwo: true },
    });

    if (!conversation) {
      throw new NotFoundException(`Conversation with ID ${conversationId} not found`);
    }

    if (conversation.userOne.id !== userId && conversation.userTwo.id !== userId) {
      throw new ForbiddenException('You are not authorized to view messages in this conversation');
    }

    return await this.messageRepo.find({
      where: { conversation: { id: conversationId } },
      relations: { sender: true },
      select: {
        id: true,
        content: true,
        isRead: true,
        createdAt: true,
        sender: {
          id: true,
          fullName: true,
          defaultPhotoUrl: true,
        },
      },
      order: { createdAt: 'DESC' },
      take: limit,
      skip: offset,
    });
  }

  /**
   * Sends a message within a conversation and notifies the recipient via push notification.
   */
  async sendMessage(
    senderId: string,
    conversationId: string,
    content: string,
  ): Promise<SendMessageResult> {
    const conversation = await this.conversationRepo.findOne({
      where: { id: conversationId },
      relations: { userOne: true, userTwo: true },
    });

    if (!conversation) {
      throw new NotFoundException(`Conversation with ID ${conversationId} not found`);
    }

    if (!conversation.isActive) {
      throw new BadRequestException('This conversation is no longer active');
    }

    if (conversation.userOne.id !== senderId && conversation.userTwo.id !== senderId) {
      throw new ForbiddenException('You are not a participant in this conversation');
    }

    const sender = await this.userRepo.findOne({ where: { id: senderId } });
    if (!sender) {
      throw new NotFoundException(`Sender user with ID ${senderId} not found`);
    }

    const message = this.messageRepo.create({
      conversation,
      sender,
      content,
      isRead: false,
    });
    const savedMessage = await this.messageRepo.save(message);

    // Update conversation timestamp
    conversation.lastMessageAt = new Date();
    await this.conversationRepo.save(conversation);

    // Determine recipient
    const recipient =
      conversation.userOne.id === senderId
        ? conversation.userTwo
        : conversation.userOne;

    // Trigger mobile push notification to recipient's devices
    await this.notificationsService.sendPushToUser(
      recipient.fcmTokens,
      `New message from ${sender.fullName || 'Match'}`,
      content,
      {
        type: 'NEW_MESSAGE',
        conversationId,
        messageId: savedMessage.id,
      },
    );

    return Object.assign(savedMessage, { recipientId: recipient.id });
  }

  /**
   * Marks unread messages in a conversation as read.
   */
  async markMessagesAsRead(
    userId: string,
    conversationId: string,
  ): Promise<void> {
    const conversation = await this.conversationRepo.findOne({
      where: { id: conversationId },
      relations: { userOne: true, userTwo: true },
    });

    if (!conversation) {
      throw new NotFoundException(`Conversation with ID ${conversationId} not found`);
    }

    if (conversation.userOne.id !== userId && conversation.userTwo.id !== userId) {
      throw new ForbiddenException('You do not belong to this conversation');
    }

    await this.messageRepo
      .createQueryBuilder()
      .update(Message)
      .set({ isRead: true })
      .where('"conversationId" = :conversationId', { conversationId })
      .andWhere('"senderId" != :userId', { userId })
      .andWhere('"isRead" = false')
      .execute();
  }
}

