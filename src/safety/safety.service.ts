import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserBlock } from './entities/user-block.entity.js';
import { UserReport } from './entities/user-report.entity.js';
import { User } from '../users/entities/user.entity.js';
import { Conversation } from '../chat/entities/conversation.entity.js';
import { InterestRequest } from '../interests/entities/interest-request.entity.js';
import { BlockUserDto } from './dto/block-user.dto.js';
import { ReportUserDto } from './dto/report-user.dto.js';
import { UpdateReportStatusDto } from './dto/update-report-status.dto.js';
import {
  ReportStatus,
  InterestStatus,
} from '../common/enums/matrimony.enum.js';

@Injectable()
export class SafetyService {
  constructor(
    @InjectRepository(UserBlock)
    private readonly userBlockRepo: Repository<UserBlock>,
    @InjectRepository(UserReport)
    private readonly userReportRepo: Repository<UserReport>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Conversation)
    private readonly conversationRepo: Repository<Conversation>,
    @InjectRepository(InterestRequest)
    private readonly interestRepo: Repository<InterestRequest>,
  ) {}

  /**
   * Blocks a user, deactivates ongoing conversations, and cancels active/pending interest requests.
   */
  async blockUser(
    blockerId: string,
    targetUserId: string,
    dto?: BlockUserDto,
  ): Promise<UserBlock> {
    if (blockerId === targetUserId) {
      throw new BadRequestException('Cannot block yourself');
    }

    const targetUser = await this.userRepo.findOne({
      where: { id: targetUserId },
    });
    if (!targetUser) {
      throw new NotFoundException(`User with ID ${targetUserId} not found`);
    }

    const blocker = await this.userRepo.findOne({
      where: { id: blockerId },
    });

    const existingBlock = await this.userBlockRepo.findOne({
      where: {
        blocker: { id: blockerId },
        blockedUser: { id: targetUserId },
      },
    });

    if (existingBlock) {
      throw new ConflictException('User is already blocked');
    }

    const block = this.userBlockRepo.create({
      blocker: blocker || ({ id: blockerId } as User),
      blockedUser: targetUser,
      reason: dto?.reason || null,
    });

    const savedBlock = await this.userBlockRepo.save(block);

    // Side effect 1: Deactivate active Conversations between both users
    const conversations = await this.conversationRepo.find({
      where: [
        {
          userOne: { id: blockerId },
          userTwo: { id: targetUserId },
          isActive: true,
        },
        {
          userOne: { id: targetUserId },
          userTwo: { id: blockerId },
          isActive: true,
        },
      ],
    });
    for (const conv of conversations) {
      conv.isActive = false;
      await this.conversationRepo.save(conv);
    }

    // Side effect 2: Cancel/decline pending or accepted InterestRequests
    const interests = await this.interestRepo.find({
      where: [
        { sender: { id: blockerId }, receiver: { id: targetUserId } },
        { sender: { id: targetUserId }, receiver: { id: blockerId } },
      ],
    });
    for (const interest of interests) {
      if (
        interest.status === InterestStatus.PENDING ||
        interest.status === InterestStatus.ACCEPTED
      ) {
        interest.status = InterestStatus.CANCELLED;
        await this.interestRepo.save(interest);
      }
    }

    return savedBlock;
  }

  /**
   * Unblocks a previously blocked user.
   */
  async unblockUser(blockerId: string, targetUserId: string): Promise<void> {
    const block = await this.userBlockRepo.findOne({
      where: {
        blocker: { id: blockerId },
        blockedUser: { id: targetUserId },
      },
    });

    if (!block) {
      throw new NotFoundException('Block relationship not found');
    }

    await this.userBlockRepo.remove(block);
  }

  /**
   * Retrieves all users blocked by the given user.
   */
  async getBlockedUsers(userId: string): Promise<UserBlock[]> {
    return await this.userBlockRepo.find({
      where: { blocker: { id: userId } },
      relations: { blockedUser: true },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Checks if either user has blocked the other.
   */
  async isBlockedEitherWay(userAId: string, userBId: string): Promise<boolean> {
    const block = await this.userBlockRepo.findOne({
      where: [
        { blocker: { id: userAId }, blockedUser: { id: userBId } },
        { blocker: { id: userBId }, blockedUser: { id: userAId } },
      ],
    });
    return Boolean(block);
  }

  /**
   * Submits a safety report against a profile and optionally auto-blocks the reported user.
   */
  async reportUser(
    reporterId: string,
    targetUserId: string,
    dto: ReportUserDto,
  ): Promise<UserReport> {
    if (reporterId === targetUserId) {
      throw new BadRequestException('Cannot report yourself');
    }

    const [reporter, targetUser] = await Promise.all([
      this.userRepo.findOne({ where: { id: reporterId } }),
      this.userRepo.findOne({ where: { id: targetUserId } }),
    ]);

    if (!targetUser) {
      throw new NotFoundException(`User with ID ${targetUserId} not found`);
    }

    const report = this.userReportRepo.create({
      reporter: reporter || ({ id: reporterId } as User),
      reportedUser: targetUser,
      reason: dto.reason,
      description: dto.description || null,
      status: ReportStatus.PENDING,
    });

    const savedReport = await this.userReportRepo.save(report);

    // Auto-block unless explicitly opted out
    if (dto.alsoBlock !== false) {
      try {
        await this.blockUser(reporterId, targetUserId, {
          reason: `Reported: ${dto.reason}`,
        });
      } catch (err) {
        if (!(err instanceof ConflictException)) {
          throw err;
        }
      }
    }

    return savedReport;
  }

  /**
   * Admin: Retrieves all safety reports, optionally filtered by review status.
   */
  async getAllReports(status?: ReportStatus): Promise<UserReport[]> {
    const whereClause = status ? { status } : {};
    return await this.userReportRepo.find({
      where: whereClause,
      relations: { reporter: true, reportedUser: true },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Admin: Updates moderation status and internal notes on a report.
   */
  async updateReportStatus(
    reportId: string,
    dto: UpdateReportStatusDto,
  ): Promise<UserReport> {
    const report = await this.userReportRepo.findOne({
      where: { id: reportId },
      relations: { reporter: true, reportedUser: true },
    });

    if (!report) {
      throw new NotFoundException(`Report with ID ${reportId} not found`);
    }

    report.status = dto.status;
    if (dto.adminNotes !== undefined) {
      report.adminNotes = dto.adminNotes;
    }

    return await this.userReportRepo.save(report);
  }
}

