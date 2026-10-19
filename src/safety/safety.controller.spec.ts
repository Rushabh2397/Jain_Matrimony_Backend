import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SafetyController } from './safety.controller.js';
import { SafetyService } from './safety.service.js';
import { UserBlock } from './entities/user-block.entity.js';
import { UserReport } from './entities/user-report.entity.js';
import { BlockUserDto } from './dto/block-user.dto.js';
import { ReportUserDto } from './dto/report-user.dto.js';
import { UpdateReportStatusDto } from './dto/update-report-status.dto.js';
import {
  ReportReason,
  ReportStatus,
} from '../common/enums/matrimony.enum.js';
import { ActiveUserData } from '../common/decorators/current-user.decorator.js';

describe('SafetyController', () => {
  let controller: SafetyController;
  let mockSafetyService: Partial<Record<keyof SafetyService, ReturnType<typeof vi.fn>>>;

  const mockActiveUser: ActiveUserData = {
    userId: 'user-active-1',
  };

  beforeEach(() => {
    mockSafetyService = {
      blockUser: vi.fn(),
      unblockUser: vi.fn(),
      getBlockedUsers: vi.fn(),
      reportUser: vi.fn(),
      getAllReports: vi.fn(),
      updateReportStatus: vi.fn(),
    };

    controller = new SafetyController(
      mockSafetyService as unknown as SafetyService,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('blockUser (POST /safety/block/:targetUserId)', () => {
    it('should call safetyService.blockUser with active user id, target id, and dto', async () => {
      const targetUserId = 'user-target-1';
      const dto: BlockUserDto = { reason: 'Inappropriate behavior' };
      const mockBlock = { id: 'ub-1' } as UserBlock;

      mockSafetyService.blockUser!.mockResolvedValue(mockBlock);

      const result = await controller.blockUser(
        mockActiveUser,
        targetUserId,
        dto,
      );

      expect(mockSafetyService.blockUser).toHaveBeenCalledWith(
        mockActiveUser.userId,
        targetUserId,
        dto,
      );
      expect(result).toEqual(mockBlock);
    });
  });

  describe('unblockUser (DELETE /safety/block/:targetUserId)', () => {
    it('should call safetyService.unblockUser with active user id and target id', async () => {
      const targetUserId = 'user-target-1';
      mockSafetyService.unblockUser!.mockResolvedValue(undefined);

      const result = await controller.unblockUser(mockActiveUser, targetUserId);

      expect(mockSafetyService.unblockUser).toHaveBeenCalledWith(
        mockActiveUser.userId,
        targetUserId,
      );
      expect(result).toEqual({ message: 'User unblocked successfully' });
    });
  });

  describe('getBlockedUsers (GET /safety/blocked)', () => {
    it('should call safetyService.getBlockedUsers with active user id', async () => {
      const mockBlocks = [{ id: 'ub-1' }] as UserBlock[];
      mockSafetyService.getBlockedUsers!.mockResolvedValue(mockBlocks);

      const result = await controller.getBlockedUsers(mockActiveUser);

      expect(mockSafetyService.getBlockedUsers).toHaveBeenCalledWith(
        mockActiveUser.userId,
      );
      expect(result).toEqual(mockBlocks);
    });
  });

  describe('reportUser (POST /safety/report/:targetUserId)', () => {
    it('should call safetyService.reportUser with active user id, target id, and dto', async () => {
      const targetUserId = 'user-target-1';
      const dto: ReportUserDto = {
        reason: ReportReason.FAKE_PROFILE,
        description: 'Impersonating another person',
        alsoBlock: true,
      };
      const mockReport = { id: 'rep-1' } as UserReport;
      mockSafetyService.reportUser!.mockResolvedValue(mockReport);

      const result = await controller.reportUser(
        mockActiveUser,
        targetUserId,
        dto,
      );

      expect(mockSafetyService.reportUser).toHaveBeenCalledWith(
        mockActiveUser.userId,
        targetUserId,
        dto,
      );
      expect(result).toEqual(mockReport);
    });
  });

  describe('getAllReports (GET /safety/reports)', () => {
    it('should call safetyService.getAllReports with status filter', async () => {
      const mockReports = [{ id: 'rep-1' }] as UserReport[];
      mockSafetyService.getAllReports!.mockResolvedValue(mockReports);

      const result = await controller.getAllReports(ReportStatus.PENDING);

      expect(mockSafetyService.getAllReports).toHaveBeenCalledWith(
        ReportStatus.PENDING,
      );
      expect(result).toEqual(mockReports);
    });
  });

  describe('updateReportStatus (PATCH /safety/reports/:reportId)', () => {
    it('should call safetyService.updateReportStatus with report id and dto', async () => {
      const reportId = 'rep-123';
      const dto: UpdateReportStatusDto = {
        status: ReportStatus.RESOLVED,
        adminNotes: 'Account suspended',
      };
      const mockReport = { id: reportId, status: dto.status } as UserReport;
      mockSafetyService.updateReportStatus!.mockResolvedValue(mockReport);

      const result = await controller.updateReportStatus(reportId, dto);

      expect(mockSafetyService.updateReportStatus).toHaveBeenCalledWith(
        reportId,
        dto,
      );
      expect(result).toEqual(mockReport);
    });
  });
});

