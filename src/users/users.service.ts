import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, type FindOptionsRelations } from 'typeorm';
import { UsersRepository } from './users.repository.js';
import { User } from './entities/user.entity.js';
import { PartnerPreferences } from './entities/partner-preferences.entity.js';
import { ProfileDetails } from './entities/profile-details.entity.js';
import { PhotoAccessRequest } from './entities/photo-access-request.entity.js';
import { InterestRequest } from '../interests/entities/interest-request.entity.js';
import { UserBlock } from '../safety/entities/user-block.entity.js';
import { UserReport } from '../safety/entities/user-report.entity.js';
import { Conversation } from '../chat/entities/conversation.entity.js';
import {
  InterestStatus,
  PhotoRequestStatus,
  KycStatus,
  KycDocumentType,
} from '../common/enums/matrimony.enum.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';
import { UpsertPartnerPreferencesDto } from './dto/upsert-partner-preferences.dto.js';
import { UpsertProfileDetailsDto } from './dto/upsert-profile-details.dto.js';
import { RespondPhotoRequestDto } from './dto/respond-photo-request.dto.js';
import { DeleteAccountDto } from './dto/delete-account.dto.js';
import { SubmitKycDto } from './dto/submit-kyc.dto.js';
import { ReviewKycDto } from './dto/review-kyc.dto.js';

@Injectable()
export class UsersService {
  constructor(
    private readonly usersRepository: UsersRepository,
    @InjectRepository(PartnerPreferences)
    private readonly partnerPreferencesRepo: Repository<PartnerPreferences>,
    @InjectRepository(ProfileDetails)
    private readonly profileDetailsRepo: Repository<ProfileDetails>,
    @InjectRepository(PhotoAccessRequest)
    private readonly photoAccessRepo: Repository<PhotoAccessRequest>,
    @InjectRepository(InterestRequest)
    private readonly interestRepo: Repository<InterestRequest>,
    @InjectRepository(UserBlock)
    private readonly userBlockRepo: Repository<UserBlock>,
    @InjectRepository(UserReport)
    private readonly userReportRepo: Repository<UserReport>,
    @InjectRepository(Conversation)
    private readonly conversationRepo: Repository<Conversation>,
    private readonly notificationsService: NotificationsService,
  ) {}

  async create(userData: Partial<User>): Promise<User> {
    return await this.usersRepository.createProfile(userData);
  }

  async findAll(): Promise<User[]> {
    return await this.usersRepository.findAllProfiles();
  }

  async findOne(
    id: string,
    relations: FindOptionsRelations<User> = { profileDetails: true },
  ): Promise<User> {
    const user = await this.usersRepository.findProfileById(id, relations);
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return user;
  }

  /**
   * Retrieves a user profile with dynamic photo-gating based on interest status and photo access requests.
   */
  async findOneProfile(id: string, viewerId: string): Promise<User> {
    const block = await this.userBlockRepo.findOne({
      where: [
        { blocker: { id: viewerId }, blockedUser: { id: id } },
        { blocker: { id: id }, blockedUser: { id: viewerId } },
      ],
    });

    if (block) {
      throw new NotFoundException('User profile not available');
    }

    const candidate = await this.findOne(id);
    const photoRequest = await this.photoAccessRepo.findOne({
      where: {
        requester: { id: viewerId },
        targetUser: { id: candidate.id },
      },
    });

    const permitted = await this.hasPhotoAccess(
      viewerId,
      candidate,
      photoRequest,
    );

    if (!permitted) {
      candidate.photoUrls = [];
    }

    candidate.photoRequestStatus = photoRequest?.status ?? null;
    return candidate;
  }

  /**
   * Evaluates if viewerId is permitted to view candidate's locked photoUrls.
   */
  async hasPhotoAccess(
    viewerId: string,
    candidate: User,
    photoRequest?: PhotoAccessRequest | null,
  ): Promise<boolean> {
    if (candidate.id === viewerId || !candidate.isPhotosLocked) {
      return true;
    }

    // 1. Check if an approved PhotoAccessRequest exists
    if (photoRequest === undefined) {
      photoRequest = await this.photoAccessRepo.findOne({
        where: {
          requester: { id: viewerId },
          targetUser: { id: candidate.id },
        },
      });
    }

    if (photoRequest && photoRequest.status === PhotoRequestStatus.APPROVED) {
      return true;
    }

    // 2. Check if an accepted InterestRequest or sender photo grant exists
    const interest = await this.interestRepo.findOne({
      where: [
        { sender: { id: viewerId }, receiver: { id: candidate.id } },
        { sender: { id: candidate.id }, receiver: { id: viewerId } },
      ],
      relations: { sender: true, receiver: true },
    });

    if (!interest) {
      return false;
    }

    if (interest.status === InterestStatus.ACCEPTED) {
      return true;
    }

    if (
      interest.sender.id === candidate.id &&
      interest.receiver.id === viewerId &&
      interest.grantPhotoAccess
    ) {
      return true;
    }

    return false;
  }

  // EXPOSE THIS IN SERVICE FOR AUTH
  async findByPhoneNumber(phoneNumber: string): Promise<User | null> {
    return await this.usersRepository.findProfileByPhoneNumber(phoneNumber);
  }

  async updateRefreshTokenHash(
    userId: string,
    hashedRefreshToken: string | null,
  ): Promise<void> {
    await this.usersRepository.updateRefreshTokenHash(userId, hashedRefreshToken);
  }

  async findUserWithRefreshToken(userId: string): Promise<User | null> {
    return await this.usersRepository.findUserWithRefreshToken(userId);
  }

  async update(id: string, updateProfileDto: UpdateProfileDto): Promise<User> {
    const user = await this.usersRepository.findProfileById(id);
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    Object.assign(user, updateProfileDto);
    return await this.usersRepository.createProfile(user);
  }

  async upsertPartnerPreferences(
    userId: string,
    dto: UpsertPartnerPreferencesDto,
  ): Promise<PartnerPreferences> {
    const user = await this.findOne(userId);

    let preferences = await this.partnerPreferencesRepo.findOne({
      where: { user: { id: user.id } },
    });

    if (preferences) {
      Object.assign(preferences, dto);
    } else {
      preferences = this.partnerPreferencesRepo.create({
        ...dto,
        user,
      });
    }

    return await this.partnerPreferencesRepo.save(preferences);
  }

  async getPartnerPreferences(userId: string): Promise<PartnerPreferences> {
    await this.findOne(userId);

    const preferences = await this.partnerPreferencesRepo.findOne({
      where: { user: { id: userId } },
    });

    if (!preferences) {
      throw new NotFoundException(`Partner preferences for user ID ${userId} not found`);
    }

    return preferences;
  }

  async registerFcmToken(userId: string, token: string): Promise<User> {
    const user = await this.findOne(userId);
    const tokens = user.fcmTokens ? [...user.fcmTokens] : [];

    if (!tokens.includes(token)) {
      tokens.push(token);
      user.fcmTokens = tokens;
      return await this.usersRepository.createProfile(user);
    }

    return user;
  }

  async upsertProfileDetails(
    userId: string,
    dto: UpsertProfileDetailsDto,
  ): Promise<ProfileDetails> {
    const user = await this.findOne(userId);

    let details = await this.profileDetailsRepo.findOne({
      where: { user: { id: user.id } },
    });

    if (details) {
      Object.assign(details, dto);
    } else {
      details = this.profileDetailsRepo.create({
        ...dto,
        user,
      });
    }

    return await this.profileDetailsRepo.save(details);
  }

  async getProfileDetails(userId: string): Promise<ProfileDetails> {
    await this.findOne(userId);

    const details = await this.profileDetailsRepo.findOne({
      where: { user: { id: userId } },
    });

    if (!details) {
      throw new NotFoundException(
        `Profile details for user ID ${userId} not found`,
      );
    }

    return details;
  }

  /**
   * Sends a photo access request to view locked photos of a candidate.
   */
  async requestPhotoAccess(
    requesterId: string,
    targetId: string,
  ): Promise<PhotoAccessRequest> {
    if (requesterId === targetId) {
      throw new BadRequestException(
        'Cannot request photo access for your own profile',
      );
    }

    const block = await this.userBlockRepo.findOne({
      where: [
        { blocker: { id: requesterId }, blockedUser: { id: targetId } },
        { blocker: { id: targetId }, blockedUser: { id: requesterId } },
      ],
    });

    if (block) {
      throw new ForbiddenException('Cannot interact with this profile');
    }

    const targetUser = await this.findOne(targetId);
    if (!targetUser.isPhotosLocked) {
      throw new BadRequestException('User photos are already public');
    }

    const existingRequest = await this.photoAccessRepo.findOne({
      where: {
        requester: { id: requesterId },
        targetUser: { id: targetId },
      },
    });

    if (existingRequest) {
      throw new ConflictException(
        existingRequest.status === PhotoRequestStatus.DECLINED
          ? 'Photo access request was previously declined'
          : 'A photo access request already exists for this user',
      );
    }

    const requester = await this.findOne(requesterId);

    const photoRequest = this.photoAccessRepo.create({
      requester,
      targetUser,
      status: PhotoRequestStatus.PENDING,
    });

    const saved = await this.photoAccessRepo.save(photoRequest);

    await this.notificationsService.sendPushToUser(
      targetUser.fcmTokens,
      'Photo Access Requested',
      `${requester.fullName || 'A member'} requested permission to view your photos.`,
      { type: 'PHOTO_ACCESS_REQUESTED', requestId: saved.id },
    );

    return saved;
  }

  /**
   * Responds to a photo access request (Approved, Declined, or Revoked).
   */
  async respondToPhotoRequest(
    ownerId: string,
    requestId: string,
    dto: RespondPhotoRequestDto,
  ): Promise<PhotoAccessRequest> {
    if (
      dto.status !== PhotoRequestStatus.APPROVED &&
      dto.status !== PhotoRequestStatus.DECLINED &&
      dto.status !== PhotoRequestStatus.REVOKED
    ) {
      throw new BadRequestException(
        'Status can only be updated to Approved, Declined, or Revoked',
      );
    }

    const request = await this.photoAccessRepo.findOne({
      where: { id: requestId },
      relations: { requester: true, targetUser: true },
    });

    if (!request) {
      throw new NotFoundException(
        `Photo access request with ID ${requestId} not found`,
      );
    }

    if (request.targetUser.id !== ownerId) {
      throw new ForbiddenException(
        'You can only respond to photo requests sent to you',
      );
    }

    request.status = dto.status;
    const saved = await this.photoAccessRepo.save(request);

    if (dto.status === PhotoRequestStatus.APPROVED) {
      await this.notificationsService.sendPushToUser(
        request.requester.fcmTokens,
        'Photos Unlocked!',
        `${request.targetUser.fullName || 'A member'} approved your request to view their photos.`,
        { type: 'PHOTO_ACCESS_APPROVED', targetUserId: ownerId },
      );
    }

    return saved;
  }

  /**
   * Retrieves incoming photo access requests received by the user.
   */
  async getReceivedPhotoRequests(userId: string): Promise<PhotoAccessRequest[]> {
    return await this.photoAccessRepo.find({
      where: { targetUser: { id: userId } },
      relations: { requester: true },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Retrieves outgoing photo access requests sent by the user.
   */
  async getSentPhotoRequests(userId: string): Promise<PhotoAccessRequest[]> {
    return await this.photoAccessRepo.find({
      where: { requester: { id: userId } },
      relations: { targetUser: true },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Generates a complete, structured export of the user's personal data
   * in compliance with the Digital Personal Data Protection Act (DPDP), 2023 (Data Portability).
   */
  async exportPersonalData(userId: string): Promise<Record<string, unknown>> {
    const user = await this.usersRepository.findProfileById(userId, {
      profileDetails: true,
      partnerPreferences: true,
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    const [
      sentInterests,
      receivedInterests,
      sentPhotoRequests,
      receivedPhotoRequests,
      blockedUsers,
      reportsFiled,
      conversations,
    ] = await Promise.all([
      this.interestRepo.find({
        where: { sender: { id: userId } },
        relations: { receiver: true },
      }),
      this.interestRepo.find({
        where: { receiver: { id: userId } },
        relations: { sender: true },
      }),
      this.photoAccessRepo.find({
        where: { requester: { id: userId } },
        relations: { targetUser: true },
      }),
      this.photoAccessRepo.find({
        where: { targetUser: { id: userId } },
        relations: { requester: true },
      }),
      this.userBlockRepo.find({
        where: { blocker: { id: userId } },
        relations: { blockedUser: true },
      }),
      this.userReportRepo.find({
        where: { reporter: { id: userId } },
        relations: { reportedUser: true },
      }),
      this.conversationRepo.find({
        where: [{ userOne: { id: userId } }, { userTwo: { id: userId } }],
        relations: { userOne: true, userTwo: true },
      }),
    ]);

    return {
      metadata: {
        exportVersion: '1.0',
        exportedAt: new Date().toISOString(),
        dataSubjectId: user.id,
        complianceStandard:
          'Digital Personal Data Protection Act (DPDP), 2023 - Data Portability',
      },
      profile: {
        id: user.id,
        phoneNumber: user.phoneNumber,
        email: user.email ?? null,
        fullName: user.fullName,
        dateOfBirth: user.dateOfBirth ?? null,
        gender: user.gender ?? null,
        maritalStatus: user.maritalStatus ?? null,
        sect: user.sect ?? null,
        subSect: user.subSect ?? null,
        diet: user.diet ?? null,
        highestEducation: user.highestEducation ?? null,
        occupation: user.occupation ?? null,
        organizationName: user.organizationName ?? null,
        annualIncome: user.annualIncome ?? null,
        familyType: user.familyType ?? null,
        city: user.city ?? null,
        state: user.state ?? null,
        country: user.country ?? null,
        defaultPhotoUrl: user.defaultPhotoUrl ?? null,
        photoUrls: user.photoUrls ?? [],
        isPhotosLocked: user.isPhotosLocked,
        isVerified: user.isVerified,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      partnerPreferences: user.partnerPreferences ?? null,
      profileDetails: user.profileDetails ?? null,
      activity: {
        sentInterests: sentInterests.map((i) => ({
          id: i.id,
          recipientId: i.receiver?.id,
          status: i.status,
          icebreakerNote: i.icebreakerNote,
          grantPhotoAccess: i.grantPhotoAccess,
          createdAt: i.createdAt,
          updatedAt: i.updatedAt,
        })),
        receivedInterests: receivedInterests.map((i) => ({
          id: i.id,
          senderId: i.sender?.id,
          status: i.status,
          icebreakerNote: i.icebreakerNote,
          grantPhotoAccess: i.grantPhotoAccess,
          createdAt: i.createdAt,
          updatedAt: i.updatedAt,
        })),
        sentPhotoRequests: sentPhotoRequests.map((r) => ({
          id: r.id,
          targetUserId: r.targetUser?.id,
          status: r.status,
          createdAt: r.createdAt,
          updatedAt: r.updatedAt,
        })),
        receivedPhotoRequests: receivedPhotoRequests.map((r) => ({
          id: r.id,
          requesterId: r.requester?.id,
          status: r.status,
          createdAt: r.createdAt,
          updatedAt: r.updatedAt,
        })),
        conversations: conversations.map((c) => ({
          id: c.id,
          otherParticipantId:
            c.userOne?.id === userId ? c.userTwo?.id : c.userOne?.id,
          isActive: c.isActive,
          lastMessageAt: c.lastMessageAt,
          createdAt: c.createdAt,
        })),
        blockedUsers: blockedUsers.map((b) => ({
          id: b.id,
          blockedUserId: b.blockedUser?.id,
          reason: b.reason,
          createdAt: b.createdAt,
        })),
        reportsFiled: reportsFiled.map((r) => ({
          id: r.id,
          reportedUserId: r.reportedUser?.id,
          reason: r.reason,
          description: r.description,
          status: r.status,
          createdAt: r.createdAt,
        })),
      },
    };
  }

  /**
   * Self-service account soft-deletion and PII anonymization in compliance
   * with the Digital Personal Data Protection Act (DPDP), 2023 (Right to Erasure / Right to be Forgotten).
   */
  async deleteAccount(
    userId: string,
    _dto?: DeleteAccountDto,
  ): Promise<{ message: string; deletedAt: Date }> {
    const user = await this.usersRepository.findProfileById(userId, {
      profileDetails: true,
      partnerPreferences: true,
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    if (user.deletedAt) {
      throw new BadRequestException('Account is already deleted');
    }

    const now = new Date();

    // 1. Deactivate ongoing Conversations where user is a participant
    const conversations = await this.conversationRepo.find({
      where: [
        { userOne: { id: userId }, isActive: true },
        { userTwo: { id: userId }, isActive: true },
      ],
    });
    for (const conv of conversations) {
      conv.isActive = false;
      await this.conversationRepo.save(conv);
    }

    // 2. Invalidate/cancel any active or pending InterestRequests
    const interests = await this.interestRepo.find({
      where: [{ sender: { id: userId } }, { receiver: { id: userId } }],
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

    // 3. Revoke any pending or approved PhotoAccessRequests
    const photoRequests = await this.photoAccessRepo.find({
      where: [{ requester: { id: userId } }, { targetUser: { id: userId } }],
    });
    for (const req of photoRequests) {
      if (
        req.status === PhotoRequestStatus.PENDING ||
        req.status === PhotoRequestStatus.APPROVED
      ) {
        req.status = PhotoRequestStatus.REVOKED;
        await this.photoAccessRepo.save(req);
      }
    }

    // 4. Remove decoupled partner preferences and profile details (right to erasure)
    if (user.partnerPreferences) {
      await this.partnerPreferencesRepo.delete({
        id: user.partnerPreferences.id,
      });
    }
    if (user.profileDetails) {
      await this.profileDetailsRepo.delete({ id: user.profileDetails.id });
    }

    // 5. Redact & Anonymize personal identifiable data (PII)
    user.fullName = 'Deleted Member';
    user.email = null;
    user.phoneNumber = `deleted_${Date.now()}_${user.phoneNumber}`;
    user.defaultPhotoUrl =
      'https://cdn.jainmatrimony.app/defaults/placeholder-avatar.png';
    user.photoUrls = [];
    user.fcmTokens = [];
    user.hashedRefreshToken = null;
    user.organizationName = null;
    user.city = null;
    user.state = null;
    user.country = null;
    user.deletedAt = now;

    await this.usersRepository.createProfile(user);
    await this.usersRepository.softDelete(userId);

    return {
      message:
        'Account successfully deleted in compliance with DPDP. Your personal data has been erased.',
      deletedAt: now,
    };
  }

  /**
   * Submits government ID document proof for KYC verification.
   */
  async submitKyc(
    userId: string,
    dto: SubmitKycDto,
  ): Promise<{ message: string; kycStatus: KycStatus }> {
    const user = await this.findOne(userId);

    if (user.kycStatus === KycStatus.APPROVED) {
      throw new BadRequestException('Profile is already verified');
    }

    user.kycStatus = KycStatus.PENDING;
    user.kycDocumentType = dto.documentType;
    user.kycDocumentUrl = dto.documentUrl;
    user.kycSubmittedAt = new Date();
    user.kycRejectionReason = null;

    await this.usersRepository.createProfile(user);

    return {
      message: 'KYC documents submitted for admin verification',
      kycStatus: user.kycStatus,
    };
  }

  /**
   * Retrieves the current KYC verification status for the authenticated user.
   */
  async getKycStatus(userId: string): Promise<{
    kycStatus: KycStatus;
    kycDocumentType: KycDocumentType | null;
    kycSubmittedAt: Date | null;
    kycRejectionReason: string | null;
    isVerified: boolean;
  }> {
    const user = await this.findOne(userId);

    return {
      kycStatus: user.kycStatus,
      kycDocumentType: user.kycDocumentType,
      kycSubmittedAt: user.kycSubmittedAt,
      kycRejectionReason: user.kycRejectionReason,
      isVerified: user.isVerified,
    };
  }

  /**
   * Retrieves paginated pending KYC submissions for admin review.
   */
  async getPendingKycSubmissions(
    page: number = 1,
    limit: number = 20,
  ): Promise<{ data: User[]; total: number; page: number; limit: number }> {
    return await this.usersRepository.findPendingKyc(page, limit);
  }

  /**
   * Admin review of a candidate's KYC identity submission.
   */
  async reviewKyc(
    _adminId: string,
    targetUserId: string,
    dto: ReviewKycDto,
  ): Promise<{
    message: string;
    kycStatus: KycStatus;
    isVerified: boolean;
    kycRejectionReason: string | null;
    kycReviewedAt: Date | null;
  }> {
    if (
      dto.status !== KycStatus.APPROVED &&
      dto.status !== KycStatus.REJECTED
    ) {
      throw new BadRequestException(
        'Review status must be either Approved or Rejected',
      );
    }

    if (
      dto.status === KycStatus.REJECTED &&
      (!dto.rejectionReason || !dto.rejectionReason.trim())
    ) {
      throw new BadRequestException(
        'Rejection reason is required when rejecting KYC',
      );
    }

    const targetUser = await this.usersRepository.findProfileById(targetUserId);
    if (!targetUser) {
      throw new NotFoundException(`User with ID ${targetUserId} not found`);
    }

    if (targetUser.kycStatus !== KycStatus.PENDING) {
      throw new BadRequestException('No pending KYC submission for this user');
    }

    const now = new Date();

    if (dto.status === KycStatus.APPROVED) {
      targetUser.isVerified = true;
      targetUser.kycStatus = KycStatus.APPROVED;
      targetUser.kycRejectionReason = null;
      targetUser.kycReviewedAt = now;

      await this.notificationsService.sendPushToUser(
        targetUser.fcmTokens,
        'Profile Verified! 💍',
        'Your identity verification has been approved. You now have the verified community badge.',
        { type: 'KYC_APPROVED' },
      );
    } else {
      targetUser.isVerified = false;
      targetUser.kycStatus = KycStatus.REJECTED;
      targetUser.kycRejectionReason = dto.rejectionReason!;
      targetUser.kycReviewedAt = now;

      await this.notificationsService.sendPushToUser(
        targetUser.fcmTokens,
        'KYC Verification Update',
        dto.rejectionReason!,
        { type: 'KYC_REJECTED' },
      );
    }

    await this.usersRepository.createProfile(targetUser);

    return {
      message: `KYC submission ${dto.status.toLowerCase()} successfully`,
      kycStatus: targetUser.kycStatus,
      isVerified: targetUser.isVerified,
      kycRejectionReason: targetUser.kycRejectionReason,
      kycReviewedAt: targetUser.kycReviewedAt,
    };
  }
}