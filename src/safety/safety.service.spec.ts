import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { Repository } from 'typeorm';
import { SafetyService } from './safety.service.js';
import { UserBlock } from './entities/user-block.entity.js';
import { UserReport } from './entities/user-report.entity.js';
import { User } from '../users/entities/user.entity.js';
import { Conversation } from '../chat/entities/conversation.entity.js';
import { InterestRequest } from '../interests/entities/interest-request.entity.js';
import {
  ReportReason,
  ReportStatus,
  InterestStatus,
} from '../common/enums/matrimony.enum.js';

describe('SafetyService', () => {
  let service: SafetyService;
  let mockUserBlockRepo: Partial<Record<keyof Repository<UserBlock>, ReturnType<typeof vi.fn>>>;
  let mockUserReportRepo: Partial<Record<keyof Repository<UserReport>, ReturnType<typeof vi.fn>>>;
  let mockUserRepo: Partial<Record<keyof Repository<User>, ReturnType<typeof vi.fn>>>;
  let mockConversationRepo: Partial<Record<keyof Repository<Conversation>, ReturnType<typeof vi.fn>>>;
  let mockInterestRepo: Partial<Record<keyof Repository<InterestRequest>, ReturnType<typeof vi.fn>>>;

  beforeEach(() => {
    mockUserBlockRepo = {
      findOne: vi.fn(),
      find: vi.fn(),
      create: vi.fn(),
      save: vi.fn(),
      remove: vi.fn(),
    };

    mockUserReportRepo = {
      findOne: vi.fn(),
      find: vi.fn(),
      create: vi.fn(),
      save: vi.fn(),
    };

    mockUserRepo = {
      findOne: vi.fn(),
    };

    mockConversationRepo = {
      find: vi.fn().mockResolvedValue([]),
      save: vi.fn(),
    };

    mockInterestRepo = {
      find: vi.fn().mockResolvedValue([]),
      save: vi.fn(),
    };

    service = new SafetyService(
      mockUserBlockRepo as unknown as Repository<UserBlock>,
      mockUserReportRepo as unknown as Repository<UserReport>,
      mockUserRepo as unknown as Repository<User>,
      mockConversationRepo as unknown as Repository<Conversation>,
      mockInterestRepo as unknown as Repository<InterestRequest>,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('blockUser', () => {
    const blockerId = 'user-blocker';
    const targetUserId = 'user-target';

    it('should throw BadRequestException when trying to block oneself', async () => {
      await expect(
        service.blockUser(blockerId, blockerId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if target user does not exist', async () => {
      mockUserRepo.findOne!.mockResolvedValue(null);

      await expect(
        service.blockUser(blockerId, targetUserId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException if user is already blocked', async () => {
      mockUserRepo.findOne!
        .mockResolvedValueOnce({ id: targetUserId } as User)
        .mockResolvedValueOnce({ id: blockerId } as User);
      mockUserBlockRepo.findOne!.mockResolvedValue({ id: 'ub-1' } as UserBlock);

      await expect(
        service.blockUser(blockerId, targetUserId),
      ).rejects.toThrow(ConflictException);
    });

    it('should create block, deactivate conversations, and cancel interest requests', async () => {
      const targetUser = { id: targetUserId, fullName: 'Target' } as User;
      const blocker = { id: blockerId, fullName: 'Blocker' } as User;
      const createdBlock = {
        id: 'ub-new',
        blocker,
        blockedUser: targetUser,
        reason: 'Harassment',
      } as UserBlock;

      mockUserRepo.findOne!
        .mockResolvedValueOnce(targetUser)
        .mockResolvedValueOnce(blocker);
      mockUserBlockRepo.findOne!.mockResolvedValue(null);
      mockUserBlockRepo.create!.mockReturnValue(createdBlock);
      mockUserBlockRepo.save!.mockResolvedValue(createdBlock);

      const activeConv = { id: 'c-1', isActive: true } as Conversation;
      mockConversationRepo.find!.mockResolvedValue([activeConv]);

      const pendingInterest = {
        id: 'ir-1',
        status: InterestStatus.PENDING,
      } as InterestRequest;
      mockInterestRepo.find!.mockResolvedValue([pendingInterest]);

      const result = await service.blockUser(blockerId, targetUserId, {
        reason: 'Harassment',
      });

      expect(mockUserBlockRepo.create).toHaveBeenCalledWith({
        blocker,
        blockedUser: targetUser,
        reason: 'Harassment',
      });
      expect(mockUserBlockRepo.save).toHaveBeenCalledWith(createdBlock);
      expect(activeConv.isActive).toBe(false);
      expect(mockConversationRepo.save).toHaveBeenCalledWith(activeConv);
      expect(pendingInterest.status).toBe(InterestStatus.CANCELLED);
      expect(mockInterestRepo.save).toHaveBeenCalledWith(pendingInterest);
      expect(result).toEqual(createdBlock);
    });
  });

  describe('unblockUser', () => {
    it('should throw NotFoundException if block does not exist', async () => {
      mockUserBlockRepo.findOne!.mockResolvedValue(null);

      await expect(
        service.unblockUser('u1', 'u2'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should remove the block relationship when found', async () => {
      const block = { id: 'ub-1' } as UserBlock;
      mockUserBlockRepo.findOne!.mockResolvedValue(block);
      mockUserBlockRepo.remove!.mockResolvedValue(block);

      await service.unblockUser('u1', 'u2');

      expect(mockUserBlockRepo.remove).toHaveBeenCalledWith(block);
    });
  });

  describe('getBlockedUsers', () => {
    it('should query userBlockRepo for all users blocked by blockerId', async () => {
      const blocks = [{ id: 'ub-1' }] as UserBlock[];
      mockUserBlockRepo.find!.mockResolvedValue(blocks);

      const result = await service.getBlockedUsers('u1');

      expect(mockUserBlockRepo.find).toHaveBeenCalledWith({
        where: { blocker: { id: 'u1' } },
        relations: { blockedUser: true },
        order: { createdAt: 'DESC' },
      });
      expect(result).toEqual(blocks);
    });
  });

  describe('isBlockedEitherWay', () => {
    it('should return true if a block exists in either direction', async () => {
      mockUserBlockRepo.findOne!.mockResolvedValue({ id: 'ub-1' } as UserBlock);

      const result = await service.isBlockedEitherWay('u1', 'u2');
      expect(result).toBe(true);
    });

    it('should return false if no block exists', async () => {
      mockUserBlockRepo.findOne!.mockResolvedValue(null);

      const result = await service.isBlockedEitherWay('u1', 'u2');
      expect(result).toBe(false);
    });
  });

  describe('reportUser', () => {
    const reporterId = 'user-reporter';
    const targetUserId = 'user-target';

    it('should throw BadRequestException if reporting oneself', async () => {
      await expect(
        service.reportUser(reporterId, reporterId, {
          reason: ReportReason.FAKE_PROFILE,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if target user does not exist', async () => {
      mockUserRepo.findOne!
        .mockResolvedValueOnce({ id: reporterId } as User)
        .mockResolvedValueOnce(null);

      await expect(
        service.reportUser(reporterId, targetUserId, {
          reason: ReportReason.FAKE_PROFILE,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should create and save UserReport with PENDING status and auto-block target user', async () => {
      const reporter = { id: reporterId } as User;
      const targetUser = { id: targetUserId } as User;
      const createdReport = {
        id: 'rep-1',
        reporter,
        reportedUser: targetUser,
        reason: ReportReason.FAKE_PROFILE,
        status: ReportStatus.PENDING,
      } as UserReport;

      mockUserRepo.findOne!
        .mockResolvedValueOnce(reporter)
        .mockResolvedValueOnce(targetUser);
      mockUserReportRepo.create!.mockReturnValue(createdReport);
      mockUserReportRepo.save!.mockResolvedValue(createdReport);

      // Spy on blockUser
      const blockUserSpy = vi.spyOn(service, 'blockUser').mockResolvedValue({} as UserBlock);

      const result = await service.reportUser(reporterId, targetUserId, {
        reason: ReportReason.FAKE_PROFILE,
        description: 'Suspicious photos',
        alsoBlock: true,
      });

      expect(mockUserReportRepo.create).toHaveBeenCalledWith({
        reporter,
        reportedUser: targetUser,
        reason: ReportReason.FAKE_PROFILE,
        description: 'Suspicious photos',
        status: ReportStatus.PENDING,
      });
      expect(mockUserReportRepo.save).toHaveBeenCalledWith(createdReport);
      expect(blockUserSpy).toHaveBeenCalledWith(reporterId, targetUserId, {
        reason: `Reported: ${ReportReason.FAKE_PROFILE}`,
      });
      expect(result).toEqual(createdReport);
    });

    it('should not throw if auto-blocking encounters a ConflictException', async () => {
      const reporter = { id: reporterId } as User;
      const targetUser = { id: targetUserId } as User;
      const createdReport = { id: 'rep-2' } as UserReport;

      mockUserRepo.findOne!
        .mockResolvedValueOnce(reporter)
        .mockResolvedValueOnce(targetUser);
      mockUserReportRepo.create!.mockReturnValue(createdReport);
      mockUserReportRepo.save!.mockResolvedValue(createdReport);

      vi.spyOn(service, 'blockUser').mockRejectedValue(
        new ConflictException('User is already blocked'),
      );

      const result = await service.reportUser(reporterId, targetUserId, {
        reason: ReportReason.INAPPROPRIATE_CONTENT,
        alsoBlock: true,
      });

      expect(result).toEqual(createdReport);
    });

    it('should not call blockUser if alsoBlock is false', async () => {
      const reporter = { id: reporterId } as User;
      const targetUser = { id: targetUserId } as User;
      const createdReport = { id: 'rep-3' } as UserReport;

      mockUserRepo.findOne!
        .mockResolvedValueOnce(reporter)
        .mockResolvedValueOnce(targetUser);
      mockUserReportRepo.create!.mockReturnValue(createdReport);
      mockUserReportRepo.save!.mockResolvedValue(createdReport);

      const blockUserSpy = vi.spyOn(service, 'blockUser');

      const result = await service.reportUser(reporterId, targetUserId, {
        reason: ReportReason.OTHER,
        alsoBlock: false,
      });

      expect(blockUserSpy).not.toHaveBeenCalled();
      expect(result).toEqual(createdReport);
    });
  });

  describe('getAllReports (Admin)', () => {
    it('should retrieve all reports ordered by createdAt DESC', async () => {
      const reports = [{ id: 'rep-1' }] as UserReport[];
      mockUserReportRepo.find!.mockResolvedValue(reports);

      const result = await service.getAllReports(ReportStatus.PENDING);

      expect(mockUserReportRepo.find).toHaveBeenCalledWith({
        where: { status: ReportStatus.PENDING },
        relations: { reporter: true, reportedUser: true },
        order: { createdAt: 'DESC' },
      });
      expect(result).toEqual(reports);
    });
  });

  describe('updateReportStatus (Admin)', () => {
    it('should throw NotFoundException if report does not exist', async () => {
      mockUserReportRepo.findOne!.mockResolvedValue(null);

      await expect(
        service.updateReportStatus('rep-999', {
          status: ReportStatus.RESOLVED,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should update status and adminNotes and save', async () => {
      const report = {
        id: 'rep-1',
        status: ReportStatus.PENDING,
        adminNotes: null,
      } as UserReport;
      mockUserReportRepo.findOne!.mockResolvedValue(report);
      mockUserReportRepo.save!.mockImplementation(async (r) => r);

      const result = await service.updateReportStatus('rep-1', {
        status: ReportStatus.RESOLVED,
        adminNotes: 'User banned from platform',
      });

      expect(result.status).toBe(ReportStatus.RESOLVED);
      expect(result.adminNotes).toBe('User banned from platform');
      expect(mockUserReportRepo.save).toHaveBeenCalledWith(report);
    });
  });
});

