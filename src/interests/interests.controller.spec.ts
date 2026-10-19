import { describe, it, expect, vi, beforeEach } from 'vitest';
import { InterestsController } from './interests.controller.js';
import { InterestsService } from './interests.service.js';
import { ActiveUserData } from '../common/decorators/current-user.decorator.js';
import { InterestStatus } from '../common/enums/matrimony.enum.js';
import { InterestRequest } from './entities/interest-request.entity.js';
import { Conversation } from '../chat/entities/conversation.entity.js';

describe('InterestsController', () => {
  let controller: InterestsController;
  let mockInterestsService: Partial<Record<keyof InterestsService, ReturnType<typeof vi.fn>>>;

  const mockActiveUser: ActiveUserData = {
    userId: '11111111-1111-1111-1111-111111111111',
  };

  beforeEach(() => {
    mockInterestsService = {
      sendInterest: vi.fn(),
      respondToInterest: vi.fn(),
      getReceivedInterests: vi.fn(),
      getSentInterests: vi.fn(),
      togglePhotoAccess: vi.fn(),
    };

    controller = new InterestsController(
      mockInterestsService as unknown as InterestsService,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getReceived (GET /interests/received)', () => {
    it('should return received interests for current user', async () => {
      const mockResult = [{ id: 'req-1' } as InterestRequest];
      mockInterestsService.getReceivedInterests!.mockResolvedValue(mockResult);

      const result = await controller.getReceived(mockActiveUser);

      expect(mockInterestsService.getReceivedInterests).toHaveBeenCalledWith(
        mockActiveUser.userId,
      );
      expect(result).toEqual(mockResult);
    });
  });

  describe('getSent (GET /interests/sent)', () => {
    it('should return sent interests for current user', async () => {
      const mockResult = [{ id: 'req-2' } as InterestRequest];
      mockInterestsService.getSentInterests!.mockResolvedValue(mockResult);

      const result = await controller.getSent(mockActiveUser);

      expect(mockInterestsService.getSentInterests).toHaveBeenCalledWith(
        mockActiveUser.userId,
      );
      expect(result).toEqual(mockResult);
    });
  });

  describe('sendInterest (POST /interests/:receiverId)', () => {
    it('should send interest to receiver', async () => {
      const receiverId = '22222222-2222-2222-2222-222222222222';
      const dto = { icebreakerNote: 'Hello', grantPhotoAccess: true };
      const mockCreated = { id: 'req-new', status: InterestStatus.PENDING } as InterestRequest;

      mockInterestsService.sendInterest!.mockResolvedValue(mockCreated);

      const result = await controller.sendInterest(mockActiveUser, receiverId, dto);

      expect(mockInterestsService.sendInterest).toHaveBeenCalledWith(
        mockActiveUser.userId,
        receiverId,
        dto,
      );
      expect(result).toEqual(mockCreated);
    });
  });

  describe('respondToInterest (PATCH /interests/:requestId/respond)', () => {
    it('should respond to interest request', async () => {
      const requestId = 'req-abc';
      const dto = { status: InterestStatus.ACCEPTED, grantPhotoAccess: true };
      const mockResponse = {
        request: { id: requestId, status: InterestStatus.ACCEPTED } as InterestRequest,
        conversation: { id: 'conv-1' } as Conversation,
      };

      mockInterestsService.respondToInterest!.mockResolvedValue(mockResponse);

      const result = await controller.respondToInterest(mockActiveUser, requestId, dto);

      expect(mockInterestsService.respondToInterest).toHaveBeenCalledWith(
        mockActiveUser.userId,
        requestId,
        dto,
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe('togglePhotoAccess (PATCH /interests/:requestId/photo-access)', () => {
    it('should call interestsService.togglePhotoAccess', async () => {
      const requestId = 'req-xyz';
      const dto = { grantPhotoAccess: true };
      const mockResult = { id: requestId, grantPhotoAccess: true } as InterestRequest;

      mockInterestsService.togglePhotoAccess!.mockResolvedValue(mockResult);

      const result = await controller.togglePhotoAccess(mockActiveUser, requestId, dto);

      expect(mockInterestsService.togglePhotoAccess).toHaveBeenCalledWith(
        mockActiveUser.userId,
        requestId,
        dto,
      );
      expect(result).toEqual(mockResult);
    });
  });
});

