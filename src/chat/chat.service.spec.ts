import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { Repository } from 'typeorm';
import { ChatService } from './chat.service.js';
import { Conversation } from './entities/conversation.entity.js';
import { Message } from './entities/message.entity.js';
import { User } from '../users/entities/user.entity.js';
import { NotificationsService } from '../notifications/notifications.service.js';

describe('ChatService', () => {
  let service: ChatService;
  let mockConversationRepo: Partial<Record<keyof Repository<Conversation>, ReturnType<typeof vi.fn>>>;
  let mockMessageRepo: Partial<Record<keyof Repository<Message>, ReturnType<typeof vi.fn>>>;
  let mockUserRepo: Partial<Record<keyof Repository<User>, ReturnType<typeof vi.fn>>>;
  let mockNotificationsService: Partial<Record<keyof NotificationsService, ReturnType<typeof vi.fn>>>;

  const userOneId = '11111111-1111-1111-1111-111111111111';
  const userTwoId = '22222222-2222-2222-2222-222222222222';
  const convId = 'cccccccc-cccc-cccc-cccc-cccccccccccc';

  const mockUserOne = { id: userOneId, fullName: 'Paras Shah', fcmTokens: ['token-1'] } as User;
  const mockUserTwo = { id: userTwoId, fullName: 'Pooja Mehta', fcmTokens: ['token-2'] } as User;

  const mockConversation = {
    id: convId,
    userOne: mockUserOne,
    userTwo: mockUserTwo,
    isActive: true,
    lastMessageAt: new Date(),
  } as Conversation;

  beforeEach(() => {
    mockConversationRepo = {
      find: vi.fn(),
      findOne: vi.fn(),
      save: vi.fn().mockImplementation(async (c) => c),
    };

    mockMessageRepo = {
      find: vi.fn(),
      create: vi.fn(),
      save: vi.fn(),
      createQueryBuilder: vi.fn().mockReturnValue({
        update: vi.fn().mockReturnThis(),
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        andWhere: vi.fn().mockReturnThis(),
        execute: vi.fn().mockResolvedValue({ affected: 1 }),
      }),
    };

    mockUserRepo = {
      findOne: vi.fn(),
    };

    mockNotificationsService = {
      sendPushToUser: vi.fn().mockResolvedValue(undefined),
    };

    service = new ChatService(
      mockConversationRepo as unknown as Repository<Conversation>,
      mockMessageRepo as unknown as Repository<Message>,
      mockUserRepo as unknown as Repository<User>,
      mockNotificationsService as unknown as NotificationsService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getUserConversations', () => {
    it('should query conversations where user is userOne or userTwo', async () => {
      const mockList = [mockConversation];
      mockConversationRepo.find!.mockResolvedValue(mockList);

      const result = await service.getUserConversations(userOneId);

      expect(mockConversationRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: [{ userOne: { id: userOneId } }, { userTwo: { id: userOneId } }],
        }),
      );
      expect(result).toEqual(mockList);
    });
  });

  describe('getConversationMessages', () => {
    it('should throw NotFoundException if conversation not found', async () => {
      mockConversationRepo.findOne!.mockResolvedValue(null);

      await expect(
        service.getConversationMessages(userOneId, convId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user is not in the conversation', async () => {
      mockConversationRepo.findOne!.mockResolvedValue(mockConversation);

      await expect(
        service.getConversationMessages('stranger-id', convId),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should return paginated messages when authorized', async () => {
      mockConversationRepo.findOne!.mockResolvedValue(mockConversation);
      const mockMessages = [{ id: 'm1', content: 'Jai Jinendra' } as Message];
      mockMessageRepo.find!.mockResolvedValue(mockMessages);

      const result = await service.getConversationMessages(userOneId, convId, 20, 0);

      expect(mockMessageRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { conversation: { id: convId } },
          take: 20,
          skip: 0,
        }),
      );
      expect(result).toEqual(mockMessages);
    });
  });

  describe('sendMessage', () => {
    it('should throw NotFoundException if conversation not found', async () => {
      mockConversationRepo.findOne!.mockResolvedValue(null);

      await expect(
        service.sendMessage(userOneId, convId, 'Hello'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if conversation is inactive', async () => {
      mockConversationRepo.findOne!.mockResolvedValue({
        ...mockConversation,
        isActive: false,
      } as Conversation);

      await expect(
        service.sendMessage(userOneId, convId, 'Hello'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ForbiddenException if sender not in conversation', async () => {
      mockConversationRepo.findOne!.mockResolvedValue(mockConversation);

      await expect(
        service.sendMessage('stranger-id', convId, 'Hello'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should save message, update lastMessageAt, and send push notification to recipient', async () => {
      mockConversationRepo.findOne!.mockResolvedValue(mockConversation);
      mockUserRepo.findOne!.mockResolvedValue(mockUserOne);

      const createdMessage = {
        id: 'msg-1',
        conversation: mockConversation,
        sender: mockUserOne,
        content: 'Pranam!',
        isRead: false,
      } as Message;

      mockMessageRepo.create!.mockReturnValue(createdMessage);
      mockMessageRepo.save!.mockResolvedValue(createdMessage);

      const result = await service.sendMessage(userOneId, convId, 'Pranam!');

      expect(mockMessageRepo.save).toHaveBeenCalled();
      expect(mockConversationRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ id: convId }),
      );
      expect(mockNotificationsService.sendPushToUser).toHaveBeenCalledWith(
        mockUserTwo.fcmTokens,
        'New message from Paras Shah',
        'Pranam!',
        {
          type: 'NEW_MESSAGE',
          conversationId: convId,
          messageId: 'msg-1',
        },
      );
      expect(result.recipientId).toBe(userTwoId);
    });
  });

  describe('markMessagesAsRead', () => {
    it('should throw NotFoundException if conversation not found', async () => {
      mockConversationRepo.findOne!.mockResolvedValue(null);

      await expect(
        service.markMessagesAsRead(userOneId, convId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user not in conversation', async () => {
      mockConversationRepo.findOne!.mockResolvedValue(mockConversation);

      await expect(
        service.markMessagesAsRead('stranger-id', convId),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should execute update for unread messages where sender is not user', async () => {
      mockConversationRepo.findOne!.mockResolvedValue(mockConversation);

      await service.markMessagesAsRead(userOneId, convId);

      expect(mockMessageRepo.createQueryBuilder).toHaveBeenCalled();
    });
  });
});

