import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { Repository } from 'typeorm';
import { InterestsService } from './interests.service.js';
import { InterestRequest } from './entities/interest-request.entity.js';
import { Conversation } from '../chat/entities/conversation.entity.js';
import { User } from '../users/entities/user.entity.js';
import { UserBlock } from '../safety/entities/user-block.entity.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { InterestStatus } from '../common/enums/matrimony.enum.js';

describe('InterestsService', () => {
  let service: InterestsService;
  let mockInterestRepo: Partial<Record<keyof Repository<InterestRequest>, ReturnType<typeof vi.fn>>>;
  let mockConversationRepo: Partial<Record<keyof Repository<Conversation>, ReturnType<typeof vi.fn>>>;
  let mockUserRepo: Partial<Record<keyof Repository<User>, ReturnType<typeof vi.fn>>>;
  let mockUserBlockRepo: Partial<Record<keyof Repository<UserBlock>, ReturnType<typeof vi.fn>>>;
  let mockNotificationsService: Partial<Record<keyof NotificationsService, ReturnType<typeof vi.fn>>>;

  const senderId = '11111111-1111-1111-1111-111111111111';
  const receiverId = '22222222-2222-2222-2222-222222222222';

  const mockSender = {
    id: senderId,
    fullName: 'Aarav Shah',
    fcmTokens: ['sender-fcm-token'],
  } as User;

  const mockReceiver = {
    id: receiverId,
    fullName: 'Pooja Mehta',
    fcmTokens: ['receiver-fcm-token'],
  } as User;

  beforeEach(() => {
    mockInterestRepo = {
      findOne: vi.fn(),
      find: vi.fn(),
      create: vi.fn(),
      save: vi.fn(),
    };

    mockConversationRepo = {
      findOne: vi.fn(),
      create: vi.fn(),
      save: vi.fn(),
    };

    mockUserRepo = {
      findOne: vi.fn(),
    };

    mockUserBlockRepo = {
      findOne: vi.fn().mockResolvedValue(null),
      find: vi.fn().mockResolvedValue([]),
    };

    mockNotificationsService = {
      sendPushToUser: vi.fn().mockResolvedValue(undefined),
    };

    service = new InterestsService(
      mockInterestRepo as unknown as Repository<InterestRequest>,
      mockConversationRepo as unknown as Repository<Conversation>,
      mockUserRepo as unknown as Repository<User>,
      mockUserBlockRepo as unknown as Repository<UserBlock>,
      mockNotificationsService as unknown as NotificationsService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('sendInterest', () => {
    it('should throw BadRequestException if sender is receiver (self)', async () => {
      await expect(
        service.sendInterest(senderId, senderId, {}),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ForbiddenException if receiver is blocked in either direction', async () => {
      mockUserBlockRepo.findOne!.mockResolvedValueOnce({ id: 'ub-1' } as UserBlock);
      await expect(
        service.sendInterest(senderId, receiverId, {}),
      ).rejects.toThrow(new ForbiddenException('Cannot interact with this profile'));
    });

    it('should throw NotFoundException if sender does not exist', async () => {
      mockUserRepo.findOne!.mockResolvedValueOnce(null);

      await expect(
        service.sendInterest(senderId, receiverId, {}),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if receiver does not exist', async () => {
      mockUserRepo.findOne!
        .mockResolvedValueOnce(mockSender)
        .mockResolvedValueOnce(null);

      await expect(
        service.sendInterest(senderId, receiverId, {}),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException if interest request already exists', async () => {
      mockUserRepo.findOne!
        .mockResolvedValueOnce(mockSender)
        .mockResolvedValueOnce(mockReceiver);

      mockInterestRepo.findOne!.mockResolvedValueOnce({ id: 'existing-id' } as InterestRequest);

      await expect(
        service.sendInterest(senderId, receiverId, {}),
      ).rejects.toThrow(ConflictException);
    });

    it('should create and save interest request and send push notification to receiver', async () => {
      mockUserRepo.findOne!
        .mockResolvedValueOnce(mockSender)
        .mockResolvedValueOnce(mockReceiver);

      mockInterestRepo.findOne!.mockResolvedValueOnce(null);

      const createdInterest = {
        id: 'request-1',
        sender: mockSender,
        receiver: mockReceiver,
        status: InterestStatus.PENDING,
        icebreakerNote: 'Hello!',
        grantPhotoAccess: true,
      } as InterestRequest;

      mockInterestRepo.create!.mockReturnValue(createdInterest);
      mockInterestRepo.save!.mockResolvedValue(createdInterest);

      const result = await service.sendInterest(senderId, receiverId, {
        icebreakerNote: 'Hello!',
        grantPhotoAccess: true,
      });

      expect(mockInterestRepo.create).toHaveBeenCalledWith({
        sender: mockSender,
        receiver: mockReceiver,
        status: InterestStatus.PENDING,
        icebreakerNote: 'Hello!',
        grantPhotoAccess: true,
      });
      expect(mockInterestRepo.save).toHaveBeenCalledWith(createdInterest);
      expect(mockNotificationsService.sendPushToUser).toHaveBeenCalledWith(
        mockReceiver.fcmTokens,
        'New Interest Received',
        'Aarav Shah sent you an interest request!',
        {
          type: 'INTEREST_RECEIVED',
          requestId: 'request-1',
        },
      );
      expect(result).toEqual(createdInterest);
    });
  });

  describe('respondToInterest', () => {
    const requestId = 'req-123';
    const mockRequest = {
      id: requestId,
      sender: mockSender,
      receiver: mockReceiver,
      status: InterestStatus.PENDING,
    } as InterestRequest;

    it('should throw NotFoundException if request not found', async () => {
      mockInterestRepo.findOne!.mockResolvedValueOnce(null);

      await expect(
        service.respondToInterest(receiverId, requestId, { status: InterestStatus.ACCEPTED }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user is not the receiver', async () => {
      mockInterestRepo.findOne!.mockResolvedValueOnce(mockRequest);

      await expect(
        service.respondToInterest('stranger-id', requestId, { status: InterestStatus.ACCEPTED }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException if request is not pending', async () => {
      const alreadyAccepted = { ...mockRequest, status: InterestStatus.ACCEPTED } as InterestRequest;
      mockInterestRepo.findOne!.mockResolvedValueOnce(alreadyAccepted);

      await expect(
        service.respondToInterest(receiverId, requestId, { status: InterestStatus.ACCEPTED }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException on invalid status response', async () => {
      mockInterestRepo.findOne!.mockResolvedValueOnce(mockRequest);

      await expect(
        service.respondToInterest(receiverId, requestId, { status: InterestStatus.CANCELLED }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should accept interest, unlock conversation, and fire push notification to sender', async () => {
      mockInterestRepo.findOne!.mockResolvedValueOnce({ ...mockRequest });
      mockInterestRepo.save!.mockImplementation(async (r) => r as InterestRequest);

      mockConversationRepo.findOne!.mockResolvedValueOnce(null);
      const newConversation = {
        id: 'conv-999',
        userOne: mockSender,
        userTwo: mockReceiver,
        isActive: true,
      } as Conversation;
      mockConversationRepo.create!.mockReturnValue(newConversation);
      mockConversationRepo.save!.mockResolvedValue(newConversation);

      const result = await service.respondToInterest(receiverId, requestId, {
        status: InterestStatus.ACCEPTED,
        grantPhotoAccess: true,
      });

      expect(result.request.status).toBe(InterestStatus.ACCEPTED);
      expect(result.request.grantPhotoAccess).toBe(true);
      expect(result.conversation).toEqual(newConversation);

      expect(mockConversationRepo.create).toHaveBeenCalledWith({
        userOne: mockSender,
        userTwo: mockReceiver,
        isActive: true,
      });

      expect(mockNotificationsService.sendPushToUser).toHaveBeenCalledWith(
        mockSender.fcmTokens,
        'Interest Accepted!',
        'Pooja Mehta accepted your interest. You can now start chatting!',
        {
          type: 'INTEREST_ACCEPTED',
          conversationId: 'conv-999',
          requestId,
        },
      );
    });

    it('should decline interest without creating a conversation', async () => {
      mockInterestRepo.findOne!.mockResolvedValueOnce({ ...mockRequest });
      mockInterestRepo.save!.mockImplementation(async (r) => r as InterestRequest);

      const result = await service.respondToInterest(receiverId, requestId, {
        status: InterestStatus.DECLINED,
      });

      expect(result.request.status).toBe(InterestStatus.DECLINED);
      expect(result.conversation).toBeNull();
      expect(mockConversationRepo.create).not.toHaveBeenCalled();
      expect(mockNotificationsService.sendPushToUser).not.toHaveBeenCalled();
    });
  });

  describe('getReceivedInterests & getSentInterests', () => {
    it('should query received interests for user', async () => {
      const mockList = [{ id: '1' } as InterestRequest];
      mockInterestRepo.find!.mockResolvedValue(mockList);

      const result = await service.getReceivedInterests(receiverId);

      expect(mockInterestRepo.find).toHaveBeenCalledWith({
        where: { receiver: { id: receiverId } },
        relations: { sender: true },
        order: { createdAt: 'DESC' },
      });
      expect(result).toEqual(mockList);
    });

    it('should query sent interests for user', async () => {
      const mockList = [{ id: '2' } as InterestRequest];
      mockInterestRepo.find!.mockResolvedValue(mockList);

      const result = await service.getSentInterests(senderId);

      expect(mockInterestRepo.find).toHaveBeenCalledWith({
        where: { sender: { id: senderId } },
        relations: { receiver: true },
        order: { createdAt: 'DESC' },
      });
      expect(result).toEqual(mockList);
    });
  });

  describe('togglePhotoAccess', () => {
    const requestId = 'req-123';

    it('should throw NotFoundException if request does not exist', async () => {
      mockInterestRepo.findOne!.mockResolvedValueOnce(null);

      await expect(
        service.togglePhotoAccess(senderId, requestId, { grantPhotoAccess: true }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user is not the sender', async () => {
      mockInterestRepo.findOne!.mockResolvedValueOnce({
        id: requestId,
        sender: { id: 'other-user' },
        receiver: { id: receiverId },
      } as InterestRequest);

      await expect(
        service.togglePhotoAccess(senderId, requestId, { grantPhotoAccess: true }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should update grantPhotoAccess and save request', async () => {
      const mockRequest = {
        id: requestId,
        sender: { id: senderId },
        receiver: { id: receiverId },
        grantPhotoAccess: false,
      } as InterestRequest;

      mockInterestRepo.findOne!.mockResolvedValueOnce(mockRequest);
      mockInterestRepo.save!.mockImplementation(async (r) => r as InterestRequest);

      const result = await service.togglePhotoAccess(senderId, requestId, {
        grantPhotoAccess: true,
      });

      expect(result.grantPhotoAccess).toBe(true);
      expect(mockInterestRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ grantPhotoAccess: true }),
      );
    });
  });
});

