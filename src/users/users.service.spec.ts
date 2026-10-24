import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Repository } from 'typeorm';
import { UsersService } from './users.service.js';
import { UsersRepository } from './users.repository.js';
import { User } from './entities/user.entity.js';
import { PartnerPreferences } from './entities/partner-preferences.entity.js';
import { ProfileDetails } from './entities/profile-details.entity.js';
import { PhotoAccessRequest } from './entities/photo-access-request.entity.js';
import { UserBlock } from '../safety/entities/user-block.entity.js';
import { UserReport } from '../safety/entities/user-report.entity.js';
import { Conversation } from '../chat/entities/conversation.entity.js';
import { InterestRequest } from '../interests/entities/interest-request.entity.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { UpsertPartnerPreferencesDto } from './dto/upsert-partner-preferences.dto.js';
import { UpsertProfileDetailsDto } from './dto/upsert-profile-details.dto.js';
import {
  Gender,
  MaritalStatus,
  Sect,
  Diet,
  InterestStatus,
  PhotoRequestStatus,
  KycStatus,
  KycDocumentType,
} from '../common/enums/matrimony.enum.js';

describe('UsersService', () => {
  let service: UsersService;
  let mockUsersRepository: Partial<Record<keyof UsersRepository, ReturnType<typeof vi.fn>>>;
  let mockPartnerPreferencesRepo: Partial<Record<keyof Repository<PartnerPreferences>, ReturnType<typeof vi.fn>>>;
  let mockProfileDetailsRepo: Partial<Record<keyof Repository<ProfileDetails>, ReturnType<typeof vi.fn>>>;
  let mockPhotoAccessRepo: Partial<Record<keyof Repository<PhotoAccessRequest>, ReturnType<typeof vi.fn>>>;
  let mockInterestRepo: Partial<Record<keyof Repository<InterestRequest>, ReturnType<typeof vi.fn>>>;
  let mockUserBlockRepo: Partial<Record<keyof Repository<UserBlock>, ReturnType<typeof vi.fn>>>;
  let mockUserReportRepo: Partial<Record<keyof Repository<UserReport>, ReturnType<typeof vi.fn>>>;
  let mockConversationRepo: Partial<Record<keyof Repository<Conversation>, ReturnType<typeof vi.fn>>>;
  let mockNotificationsService: Partial<Record<keyof NotificationsService, ReturnType<typeof vi.fn>>>;

  beforeEach(() => {
    mockUsersRepository = {
      createProfile: vi.fn(),
      findAllProfiles: vi.fn(),
      findProfileById: vi.fn(),
      findProfileByPhoneNumber: vi.fn(),
      updateRefreshTokenHash: vi.fn(),
      findUserWithRefreshToken: vi.fn(),
      softDelete: vi.fn(),
      findPendingKyc: vi.fn(),
      findUserWithKycDocument: vi.fn(),
    };

    mockPartnerPreferencesRepo = {
      findOne: vi.fn(),
      create: vi.fn(),
      save: vi.fn(),
      delete: vi.fn(),
    };

    mockProfileDetailsRepo = {
      findOne: vi.fn(),
      create: vi.fn(),
      save: vi.fn(),
      delete: vi.fn(),
    };

    mockPhotoAccessRepo = {
      findOne: vi.fn().mockResolvedValue(null),
      find: vi.fn().mockResolvedValue([]),
      create: vi.fn(),
      save: vi.fn(),
    };

    mockInterestRepo = {
      findOne: vi.fn().mockResolvedValue(null),
      find: vi.fn().mockResolvedValue([]),
      save: vi.fn(),
    };

    mockUserBlockRepo = {
      findOne: vi.fn().mockResolvedValue(null),
      find: vi.fn().mockResolvedValue([]),
    };

    mockUserReportRepo = {
      find: vi.fn().mockResolvedValue([]),
    };

    mockConversationRepo = {
      find: vi.fn().mockResolvedValue([]),
      save: vi.fn(),
    };

    mockNotificationsService = {
      sendPushToUser: vi.fn().mockResolvedValue(undefined),
    };

    service = new UsersService(
      mockUsersRepository as unknown as UsersRepository,
      mockPartnerPreferencesRepo as unknown as Repository<PartnerPreferences>,
      mockProfileDetailsRepo as unknown as Repository<ProfileDetails>,
      mockPhotoAccessRepo as unknown as Repository<PhotoAccessRequest>,
      mockInterestRepo as unknown as Repository<InterestRequest>,
      mockUserBlockRepo as unknown as Repository<UserBlock>,
      mockUserReportRepo as unknown as Repository<UserReport>,
      mockConversationRepo as unknown as Repository<Conversation>,
      mockNotificationsService as unknown as NotificationsService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('upsertPartnerPreferences', () => {
    const userId = '123e4567-e89b-12d3-a456-426614174000';
    const mockUser = { id: userId, fullName: 'Aarav Shah' } as User;
    const dto: UpsertPartnerPreferencesDto = {
      preferredGender: Gender.FEMALE,
      minAge: 24,
      maxAge: 30,
      preferredMaritalStatuses: [MaritalStatus.NEVER_MARRIED],
      preferredSects: [Sect.MURTIPUJAK],
      preferredDiets: [Diet.STRICT_JAIN],
    };

    it('should throw NotFoundException if user does not exist', async () => {
      mockUsersRepository.findProfileById!.mockResolvedValue(null);

      await expect(service.upsertPartnerPreferences(userId, dto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should create new preferences when none exist for user', async () => {
      mockUsersRepository.findProfileById!.mockResolvedValue(mockUser);
      mockPartnerPreferencesRepo.findOne!.mockResolvedValue(null);

      const createdPrefs = { id: 'pref-1', ...dto, user: mockUser } as unknown as PartnerPreferences;
      mockPartnerPreferencesRepo.create!.mockReturnValue(createdPrefs);
      mockPartnerPreferencesRepo.save!.mockResolvedValue(createdPrefs);

      const result = await service.upsertPartnerPreferences(userId, dto);

      expect(mockUsersRepository.findProfileById).toHaveBeenCalledWith(userId, {
        profileDetails: true,
      });
      expect(mockPartnerPreferencesRepo.findOne).toHaveBeenCalledWith({
        where: { user: { id: userId } },
      });
      expect(mockPartnerPreferencesRepo.create).toHaveBeenCalledWith({
        ...dto,
        user: mockUser,
      });
      expect(mockPartnerPreferencesRepo.save).toHaveBeenCalledWith(createdPrefs);
      expect(result).toEqual(createdPrefs);
    });

    it('should update existing preferences when already present', async () => {
      mockUsersRepository.findProfileById!.mockResolvedValue(mockUser);
      const existingPrefs = {
        id: 'pref-1',
        preferredGender: Gender.FEMALE,
        minAge: 22,
        user: mockUser,
      } as unknown as PartnerPreferences;
      mockPartnerPreferencesRepo.findOne!.mockResolvedValue(existingPrefs);
      mockPartnerPreferencesRepo.save!.mockImplementation(async (entity) => entity);

      const result = await service.upsertPartnerPreferences(userId, dto);

      expect(existingPrefs.minAge).toBe(24);
      expect(mockPartnerPreferencesRepo.create).not.toHaveBeenCalled();
      expect(result.id).toBe('pref-1');
    });
  });

  describe('getPartnerPreferences', () => {
    const userId = '123e4567-e89b-12d3-a456-426614174000';
    const mockUser = { id: userId } as User;

    it('should throw NotFoundException if user does not exist', async () => {
      mockUsersRepository.findProfileById!.mockResolvedValue(null);

      await expect(service.getPartnerPreferences(userId)).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if preferences do not exist for user', async () => {
      mockUsersRepository.findProfileById!.mockResolvedValue(mockUser);
      mockPartnerPreferencesRepo.findOne!.mockResolvedValue(null);

      await expect(service.getPartnerPreferences(userId)).rejects.toThrow(NotFoundException);
    });

    it('should return preferences when found', async () => {
      const mockPrefs = { id: 'pref-1', preferredGender: Gender.FEMALE } as PartnerPreferences;
      mockUsersRepository.findProfileById!.mockResolvedValue(mockUser);
      mockPartnerPreferencesRepo.findOne!.mockResolvedValue(mockPrefs);

      const result = await service.getPartnerPreferences(userId);

      expect(result).toEqual(mockPrefs);
    });
  });

  describe('upsertProfileDetails', () => {
    const userId = '123e4567-e89b-12d3-a456-426614174000';
    const mockUser = { id: userId, fullName: 'Aarav Shah' } as User;
    const dto: UpsertProfileDetailsDto = {
      bio: 'Looking for a compatible partner.',
      hobbies: ['Reading', 'Travelling'],
      heightCm: 175,
      languagesKnown: ['Gujarati', 'Hindi'],
      gotra: 'Kashyap',
      nativePlace: 'Patan',
      mosal: 'Surat',
      fatherName: 'Ramesh Shah',
      fatherOccupation: 'Business',
      motherName: 'Sarita Shah',
      motherOccupation: 'Homemaker',
      brothersCount: 1,
      marriedBrothersCount: 0,
      sistersCount: 1,
      marriedSistersCount: 1,
      timeOfBirth: '14:30',
      placeOfBirth: 'Ahmedabad',
    };

    it('should throw NotFoundException if user does not exist', async () => {
      mockUsersRepository.findProfileById!.mockResolvedValue(null);

      await expect(service.upsertProfileDetails(userId, dto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should create new profile details when none exist for user', async () => {
      mockUsersRepository.findProfileById!.mockResolvedValue(mockUser);
      mockProfileDetailsRepo.findOne!.mockResolvedValue(null);

      const createdDetails = {
        id: 'details-1',
        ...dto,
        user: mockUser,
      } as unknown as ProfileDetails;
      mockProfileDetailsRepo.create!.mockReturnValue(createdDetails);
      mockProfileDetailsRepo.save!.mockResolvedValue(createdDetails);

      const result = await service.upsertProfileDetails(userId, dto);

      expect(mockUsersRepository.findProfileById).toHaveBeenCalledWith(userId, {
        profileDetails: true,
      });
      expect(mockProfileDetailsRepo.findOne).toHaveBeenCalledWith({
        where: { user: { id: userId } },
      });
      expect(mockProfileDetailsRepo.create).toHaveBeenCalledWith({
        ...dto,
        user: mockUser,
      });
      expect(mockProfileDetailsRepo.save).toHaveBeenCalledWith(createdDetails);
      expect(result).toEqual(createdDetails);
    });

    it('should update existing profile details when already present', async () => {
      mockUsersRepository.findProfileById!.mockResolvedValue(mockUser);
      const existingDetails = {
        id: 'details-1',
        bio: 'Old bio',
        heightCm: 170,
        user: mockUser,
      } as unknown as ProfileDetails;
      mockProfileDetailsRepo.findOne!.mockResolvedValue(existingDetails);
      mockProfileDetailsRepo.save!.mockImplementation(async (entity) => entity);

      const result = await service.upsertProfileDetails(userId, dto);

      expect(existingDetails.bio).toBe('Looking for a compatible partner.');
      expect(existingDetails.heightCm).toBe(175);
      expect(mockProfileDetailsRepo.create).not.toHaveBeenCalled();
      expect(result.id).toBe('details-1');
    });
  });

  describe('getProfileDetails', () => {
    const userId = '123e4567-e89b-12d3-a456-426614174000';
    const mockUser = { id: userId } as User;

    it('should throw NotFoundException if user does not exist', async () => {
      mockUsersRepository.findProfileById!.mockResolvedValue(null);

      await expect(service.getProfileDetails(userId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException if profile details do not exist for user', async () => {
      mockUsersRepository.findProfileById!.mockResolvedValue(mockUser);
      mockProfileDetailsRepo.findOne!.mockResolvedValue(null);

      await expect(service.getProfileDetails(userId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should return profile details when found', async () => {
      const mockDetails = {
        id: 'details-1',
        bio: 'Hello world',
        gotra: 'Kashyap',
      } as ProfileDetails;
      mockUsersRepository.findProfileById!.mockResolvedValue(mockUser);
      mockProfileDetailsRepo.findOne!.mockResolvedValue(mockDetails);

      const result = await service.getProfileDetails(userId);

      expect(result).toEqual(mockDetails);
    });
  });

  describe('registerFcmToken', () => {
    const userId = '123e4567-e89b-12d3-a456-426614174000';

    it('should add new FCM token when user has no tokens and save', async () => {
      const mockUser = { id: userId, fcmTokens: null } as User;
      mockUsersRepository.findProfileById!.mockResolvedValue(mockUser);
      mockUsersRepository.createProfile!.mockImplementation(async (u) => u as User);

      const result = await service.registerFcmToken(userId, 'token-123');

      expect(mockUsersRepository.findProfileById).toHaveBeenCalledWith(userId, {
        profileDetails: true,
      });
      expect(mockUsersRepository.createProfile).toHaveBeenCalledWith(
        expect.objectContaining({ fcmTokens: ['token-123'] }),
      );
      expect(result.fcmTokens).toEqual(['token-123']);
    });

    it('should append token without duplicates if already present', async () => {
      const mockUser = { id: userId, fcmTokens: ['token-123'] } as User;
      mockUsersRepository.findProfileById!.mockResolvedValue(mockUser);

      const result = await service.registerFcmToken(userId, 'token-123');

      expect(mockUsersRepository.createProfile).not.toHaveBeenCalled();
      expect(result.fcmTokens).toEqual(['token-123']);
    });

    it('should append token when other tokens exist', async () => {
      const mockUser = { id: userId, fcmTokens: ['token-123'] } as User;
      mockUsersRepository.findProfileById!.mockResolvedValue(mockUser);
      mockUsersRepository.createProfile!.mockImplementation(async (u) => u as User);

      const result = await service.registerFcmToken(userId, 'token-456');

      expect(mockUsersRepository.createProfile).toHaveBeenCalledWith(
        expect.objectContaining({ fcmTokens: ['token-123', 'token-456'] }),
      );
      expect(result.fcmTokens).toEqual(['token-123', 'token-456']);
    });
  });

  describe('findOneProfile & hasPhotoAccess', () => {
    const viewerId = 'viewer-123';
    const candidateId = 'candidate-456';

    it('should allow full photo access when viewing own profile', async () => {
      const selfUser = {
        id: viewerId,
        photoUrls: ['https://example.com/me.jpg'],
        isPhotosLocked: true,
      } as User;

      mockUsersRepository.findProfileById!.mockResolvedValue(selfUser);

      const result = await service.findOneProfile(viewerId, viewerId);

      expect(result.photoUrls).toEqual(['https://example.com/me.jpg']);
    });

    it('should allow photo access when candidate photos are unlocked', async () => {
      const openUser = {
        id: candidateId,
        photoUrls: ['https://example.com/open.jpg'],
        isPhotosLocked: false,
      } as User;

      mockUsersRepository.findProfileById!.mockResolvedValue(openUser);

      const result = await service.findOneProfile(candidateId, viewerId);

      expect(result.photoUrls).toEqual(['https://example.com/open.jpg']);
    });

    it('should hide photoUrls when candidate photos are locked and no interest exists', async () => {
      const lockedUser = {
        id: candidateId,
        photoUrls: ['https://example.com/private.jpg'],
        isPhotosLocked: true,
      } as User;

      mockUsersRepository.findProfileById!.mockResolvedValue(lockedUser);
      mockInterestRepo.findOne!.mockResolvedValue(null);

      const result = await service.findOneProfile(candidateId, viewerId);

      expect(result.photoUrls).toEqual([]);
    });

    it('should unlock photoUrls when interest request is ACCEPTED', async () => {
      const lockedUser = {
        id: candidateId,
        photoUrls: ['https://example.com/private.jpg'],
        isPhotosLocked: true,
      } as User;

      mockUsersRepository.findProfileById!.mockResolvedValue(lockedUser);
      mockInterestRepo.findOne!.mockResolvedValue({
        id: 'ir-1',
        status: InterestStatus.ACCEPTED,
        sender: { id: viewerId },
        receiver: { id: candidateId },
      } as InterestRequest);

      const result = await service.findOneProfile(candidateId, viewerId);

      expect(result.photoUrls).toEqual(['https://example.com/private.jpg']);
    });

    it('should unlock photoUrls when candidate sent request with grantPhotoAccess', async () => {
      const lockedUser = {
        id: candidateId,
        photoUrls: ['https://example.com/private.jpg'],
        isPhotosLocked: true,
      } as User;

      mockUsersRepository.findProfileById!.mockResolvedValue(lockedUser);
      mockInterestRepo.findOne!.mockResolvedValue({
        id: 'ir-2',
        status: InterestStatus.PENDING,
        grantPhotoAccess: true,
        sender: { id: candidateId },
        receiver: { id: viewerId },
      } as InterestRequest);

      const result = await service.findOneProfile(candidateId, viewerId);

      expect(result.photoUrls).toEqual(['https://example.com/private.jpg']);
    });

    it('should not unlock photoUrls if viewer sent request with grantPhotoAccess but pending', async () => {
      const lockedUser = {
        id: candidateId,
        photoUrls: ['https://example.com/private.jpg'],
        isPhotosLocked: true,
      } as User;

      mockUsersRepository.findProfileById!.mockResolvedValue(lockedUser);
      mockInterestRepo.findOne!.mockResolvedValue({
        id: 'ir-3',
        status: InterestStatus.PENDING,
        grantPhotoAccess: true,
        sender: { id: viewerId },
        receiver: { id: candidateId },
      } as InterestRequest);

      const result = await service.findOneProfile(candidateId, viewerId);

      expect(result.photoUrls).toEqual([]);
    });

    it('should unlock photoUrls when PhotoAccessRequest is APPROVED', async () => {
      const lockedUser = {
        id: candidateId,
        photoUrls: ['https://example.com/private.jpg'],
        isPhotosLocked: true,
      } as User;

      mockUsersRepository.findProfileById!.mockResolvedValue(lockedUser);
      mockPhotoAccessRepo.findOne!.mockResolvedValue({
        id: 'par-1',
        status: PhotoRequestStatus.APPROVED,
        requester: { id: viewerId },
        targetUser: { id: candidateId },
      } as PhotoAccessRequest);

      const result = await service.findOneProfile(candidateId, viewerId);

      expect(result.photoUrls).toEqual(['https://example.com/private.jpg']);
      expect(result.photoRequestStatus).toBe(PhotoRequestStatus.APPROVED);
    });

    it('should hide photoUrls when PhotoAccessRequest is PENDING', async () => {
      const lockedUser = {
        id: candidateId,
        photoUrls: ['https://example.com/private.jpg'],
        isPhotosLocked: true,
      } as User;

      mockUsersRepository.findProfileById!.mockResolvedValue(lockedUser);
      mockPhotoAccessRepo.findOne!.mockResolvedValue({
        id: 'par-2',
        status: PhotoRequestStatus.PENDING,
        requester: { id: viewerId },
        targetUser: { id: candidateId },
      } as PhotoAccessRequest);
      mockInterestRepo.findOne!.mockResolvedValue(null);

      const result = await service.findOneProfile(candidateId, viewerId);

      expect(result.photoUrls).toEqual([]);
      expect(result.photoRequestStatus).toBe(PhotoRequestStatus.PENDING);
    });

    it('should throw NotFoundException if candidate is blocked in either direction', async () => {
      mockUserBlockRepo.findOne!.mockResolvedValueOnce({ id: 'ub-1' } as UserBlock);
      await expect(
        service.findOneProfile(candidateId, viewerId),
      ).rejects.toThrow(new NotFoundException('User profile not available'));
    });
  });

  describe('requestPhotoAccess', () => {
    const requesterId = 'requester-uuid';
    const targetId = 'target-uuid';

    it('should throw BadRequestException if requesterId === targetId', async () => {
      await expect(
        service.requestPhotoAccess(requesterId, requesterId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ForbiddenException if target user is blocked in either direction', async () => {
      mockUserBlockRepo.findOne!.mockResolvedValueOnce({ id: 'ub-2' } as UserBlock);
      await expect(
        service.requestPhotoAccess(requesterId, targetId),
      ).rejects.toThrow(new ForbiddenException('Cannot interact with this profile'));
    });

    it('should throw BadRequestException if target user photos are not locked', async () => {
      mockUsersRepository.findProfileById!.mockResolvedValue({
        id: targetId,
        isPhotosLocked: false,
      } as User);

      await expect(
        service.requestPhotoAccess(requesterId, targetId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ConflictException if request already exists', async () => {
      mockUsersRepository.findProfileById!.mockResolvedValue({
        id: targetId,
        isPhotosLocked: true,
      } as User);
      mockPhotoAccessRepo.findOne!.mockResolvedValue({
        id: 'req-1',
        status: PhotoRequestStatus.PENDING,
      } as PhotoAccessRequest);

      await expect(
        service.requestPhotoAccess(requesterId, targetId),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException with declined message if request was previously declined', async () => {
      mockUsersRepository.findProfileById!.mockResolvedValue({
        id: targetId,
        isPhotosLocked: true,
      } as User);
      mockPhotoAccessRepo.findOne!.mockResolvedValue({
        id: 'req-1',
        status: PhotoRequestStatus.DECLINED,
      } as PhotoAccessRequest);

      await expect(
        service.requestPhotoAccess(requesterId, targetId),
      ).rejects.toThrow('Photo access request was previously declined');
    });

    it('should create new PhotoAccessRequest, send push notification and save', async () => {
      const targetUser = {
        id: targetId,
        fullName: 'Target User',
        isPhotosLocked: true,
        fcmTokens: ['fcm-token-target'],
      } as User;
      const requester = {
        id: requesterId,
        fullName: 'Requester User',
      } as User;
      const createdRequest = {
        id: 'req-new',
        requester,
        targetUser,
        status: PhotoRequestStatus.PENDING,
      } as PhotoAccessRequest;

      mockUsersRepository.findProfileById!
        .mockResolvedValueOnce(targetUser)
        .mockResolvedValueOnce(requester);
      mockPhotoAccessRepo.findOne!.mockResolvedValue(null);
      mockPhotoAccessRepo.create!.mockReturnValue(createdRequest);
      mockPhotoAccessRepo.save!.mockResolvedValue(createdRequest);

      const result = await service.requestPhotoAccess(requesterId, targetId);

      expect(mockPhotoAccessRepo.create).toHaveBeenCalledWith({
        requester,
        targetUser,
        status: PhotoRequestStatus.PENDING,
      });
      expect(mockPhotoAccessRepo.save).toHaveBeenCalledWith(createdRequest);
      expect(mockNotificationsService.sendPushToUser).toHaveBeenCalledWith(
        targetUser.fcmTokens,
        'Photo Access Requested',
        'Requester User requested permission to view your photos.',
        { type: 'PHOTO_ACCESS_REQUESTED', requestId: 'req-new' },
      );
      expect(result).toEqual(createdRequest);
    });
  });

  describe('respondToPhotoRequest', () => {
    const ownerId = 'owner-uuid';
    const requestId = 'req-uuid';

    it('should throw BadRequestException if status is invalid', async () => {
      await expect(
        service.respondToPhotoRequest(ownerId, requestId, {
          status: 'Invalid' as unknown as PhotoRequestStatus,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if request not found', async () => {
      mockPhotoAccessRepo.findOne!.mockResolvedValue(null);

      await expect(
        service.respondToPhotoRequest(ownerId, requestId, {
          status: PhotoRequestStatus.APPROVED,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user is not targetUser', async () => {
      mockPhotoAccessRepo.findOne!.mockResolvedValue({
        id: requestId,
        targetUser: { id: 'other-user' },
        requester: { id: 'req-user' },
      } as PhotoAccessRequest);

      await expect(
        service.respondToPhotoRequest(ownerId, requestId, {
          status: PhotoRequestStatus.APPROVED,
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should approve request, send push notification and save', async () => {
      const existingRequest = {
        id: requestId,
        status: PhotoRequestStatus.PENDING,
        targetUser: { id: ownerId, fullName: 'Owner User' },
        requester: { id: 'requester-id', fcmTokens: ['token-req'] },
      } as PhotoAccessRequest;

      mockPhotoAccessRepo.findOne!.mockResolvedValue(existingRequest);
      mockPhotoAccessRepo.save!.mockImplementation(async (r) => r);

      const result = await service.respondToPhotoRequest(ownerId, requestId, {
        status: PhotoRequestStatus.APPROVED,
      });

      expect(result.status).toBe(PhotoRequestStatus.APPROVED);
      expect(mockNotificationsService.sendPushToUser).toHaveBeenCalledWith(
        ['token-req'],
        'Photos Unlocked!',
        'Owner User approved your request to view their photos.',
        { type: 'PHOTO_ACCESS_APPROVED', targetUserId: ownerId },
      );
    });

    it('should decline request without push notification', async () => {
      const existingRequest = {
        id: requestId,
        status: PhotoRequestStatus.PENDING,
        targetUser: { id: ownerId, fullName: 'Owner User' },
        requester: { id: 'requester-id', fcmTokens: ['token-req'] },
      } as PhotoAccessRequest;

      mockPhotoAccessRepo.findOne!.mockResolvedValue(existingRequest);
      mockPhotoAccessRepo.save!.mockImplementation(async (r) => r);

      const result = await service.respondToPhotoRequest(ownerId, requestId, {
        status: PhotoRequestStatus.DECLINED,
      });

      expect(result.status).toBe(PhotoRequestStatus.DECLINED);
      expect(mockNotificationsService.sendPushToUser).not.toHaveBeenCalled();
    });
  });

  describe('getReceivedPhotoRequests', () => {
    it('should query photoAccessRepo for requests where targetUser is user', async () => {
      const userId = 'user-1';
      const requests = [{ id: 'pr-1' }] as PhotoAccessRequest[];
      mockPhotoAccessRepo.find!.mockResolvedValue(requests);

      const result = await service.getReceivedPhotoRequests(userId);

      expect(mockPhotoAccessRepo.find).toHaveBeenCalledWith({
        where: { targetUser: { id: userId } },
        relations: { requester: true },
        order: { createdAt: 'DESC' },
      });
      expect(result).toEqual(requests);
    });
  });

  describe('getSentPhotoRequests', () => {
    it('should query photoAccessRepo for requests where requester is user', async () => {
      const userId = 'user-1';
      const requests = [{ id: 'pr-2' }] as PhotoAccessRequest[];
      mockPhotoAccessRepo.find!.mockResolvedValue(requests);

      const result = await service.getSentPhotoRequests(userId);

      expect(mockPhotoAccessRepo.find).toHaveBeenCalledWith({
        where: { requester: { id: userId } },
        relations: { targetUser: true },
        order: { createdAt: 'DESC' },
      });
      expect(result).toEqual(requests);
    });
  });

  describe('updateRefreshTokenHash', () => {
    it('should delegate to usersRepository.updateRefreshTokenHash', async () => {
      const userId = 'user-1';
      const hash = 'argon2-hash-string';
      mockUsersRepository.updateRefreshTokenHash!.mockResolvedValue(undefined);

      await service.updateRefreshTokenHash(userId, hash);

      expect(mockUsersRepository.updateRefreshTokenHash).toHaveBeenCalledWith(
        userId,
        hash,
      );
    });
  });

  describe('findUserWithRefreshToken', () => {
    it('should delegate to usersRepository.findUserWithRefreshToken', async () => {
      const userId = 'user-1';
      const mockUser = { id: userId, hashedRefreshToken: 'hash' } as User;
      mockUsersRepository.findUserWithRefreshToken!.mockResolvedValue(mockUser);

      const result = await service.findUserWithRefreshToken(userId);

      expect(mockUsersRepository.findUserWithRefreshToken).toHaveBeenCalledWith(
        userId,
      );
      expect(result).toEqual(mockUser);
    });
  });

  describe('exportPersonalData', () => {
    const userId = 'user-export-id';

    it('should throw NotFoundException if user is not found', async () => {
      mockUsersRepository.findProfileById!.mockResolvedValue(null);

      await expect(service.exportPersonalData(userId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should return complete structured DPDP data export', async () => {
      const mockUser = {
        id: userId,
        phoneNumber: '+919876543210',
        fullName: 'Chirag Shah',
        email: 'chirag@example.com',
        gender: Gender.MALE,
        maritalStatus: MaritalStatus.NEVER_MARRIED,
        sect: Sect.MURTIPUJAK,
        diet: Diet.STRICT_JAIN,
        photoUrls: ['https://example.com/p1.jpg'],
        isPhotosLocked: true,
        isVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        partnerPreferences: { id: 'pref-1', minAge: 21 },
        profileDetails: { id: 'pd-1', bio: 'Jain professional' },
      } as unknown as User;

      mockUsersRepository.findProfileById!.mockResolvedValue(mockUser);
      mockInterestRepo.find!
        .mockResolvedValueOnce([{ id: 'ir-sent', receiver: { id: 'cand-1' }, status: InterestStatus.PENDING }])
        .mockResolvedValueOnce([{ id: 'ir-rec', sender: { id: 'cand-2' }, status: InterestStatus.ACCEPTED }]);
      mockPhotoAccessRepo.find!
        .mockResolvedValueOnce([{ id: 'par-sent', targetUser: { id: 'cand-3' }, status: PhotoRequestStatus.PENDING }])
        .mockResolvedValueOnce([{ id: 'par-rec', requester: { id: 'cand-4' }, status: PhotoRequestStatus.APPROVED }]);
      mockUserBlockRepo.find!.mockResolvedValueOnce([{ id: 'ub-1', blockedUser: { id: 'cand-5' }, reason: 'Spam' }]);
      mockUserReportRepo.find!.mockResolvedValueOnce([{ id: 'rep-1', reportedUser: { id: 'cand-6' }, reason: 'Fake' }]);
      mockConversationRepo.find!.mockResolvedValueOnce([{ id: 'conv-1', userOne: { id: userId }, userTwo: { id: 'cand-7' }, isActive: true }]);

      const result = await service.exportPersonalData(userId);

      expect(result).toBeDefined();
      expect(result.metadata).toEqual(
        expect.objectContaining({
          dataSubjectId: userId,
          complianceStandard: expect.stringContaining('DPDP'),
        }),
      );
      expect((result.profile as any).fullName).toBe('Chirag Shah');
      expect((result.profile as any).phoneNumber).toBe('+919876543210');
      expect((result.activity as any).sentInterests).toHaveLength(1);
      expect((result.activity as any).receivedInterests).toHaveLength(1);
      expect((result.activity as any).conversations).toHaveLength(1);
      expect((result.activity as any).blockedUsers).toHaveLength(1);
    });
  });

  describe('deleteAccount', () => {
    const userId = 'user-del-id';

    it('should throw NotFoundException if user is not found', async () => {
      mockUsersRepository.findProfileById!.mockResolvedValue(null);

      await expect(service.deleteAccount(userId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if user is already deleted', async () => {
      mockUsersRepository.findProfileById!.mockResolvedValue({
        id: userId,
        deletedAt: new Date(),
      } as User);

      await expect(service.deleteAccount(userId)).rejects.toThrow(
        new BadRequestException('Account is already deleted'),
      );
    });

    it('should soft delete user, redact PII, scramble phoneNumber, deactivate conversations, and cancel interests', async () => {
      const mockUser = {
        id: userId,
        phoneNumber: '+919876543210',
        fullName: 'Chirag Shah',
        email: 'chirag@example.com',
        fcmTokens: ['token-1'],
        hashedRefreshToken: 'old-hash',
        photoUrls: ['https://example.com/p1.jpg'],
        partnerPreferences: { id: 'pref-1' },
        profileDetails: { id: 'pd-1' },
        deletedAt: null,
      } as unknown as User;

      mockUsersRepository.findProfileById!.mockResolvedValue(mockUser);
      mockConversationRepo.find!.mockResolvedValue([
        { id: 'conv-1', isActive: true },
      ]);
      mockInterestRepo.find!.mockResolvedValue([
        { id: 'ir-1', status: InterestStatus.PENDING },
        { id: 'ir-2', status: InterestStatus.ACCEPTED },
        { id: 'ir-3', status: InterestStatus.DECLINED },
      ]);
      mockPhotoAccessRepo.find!.mockResolvedValue([
        { id: 'par-1', status: PhotoRequestStatus.PENDING },
        { id: 'par-2', status: PhotoRequestStatus.APPROVED },
      ]);
      mockUsersRepository.createProfile!.mockImplementation((u) => Promise.resolve(u));
      mockUsersRepository.softDelete!.mockResolvedValue(undefined);

      const result = await service.deleteAccount(userId, { reason: 'Found match' });

      expect(result.message).toContain('Account successfully deleted in compliance with DPDP');
      expect(result.deletedAt).toBeDefined();

      // Verify conversation deactivation
      expect(mockConversationRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'conv-1', isActive: false }),
      );

      // Verify interest cancellation (only pending & accepted are set to CANCELLED)
      expect(mockInterestRepo.save).toHaveBeenCalledTimes(2);

      // Verify photo access request revocation
      expect(mockPhotoAccessRepo.save).toHaveBeenCalledTimes(2);

      // Verify removal of decoupled preferences and profile details
      expect(mockPartnerPreferencesRepo.delete).toHaveBeenCalledWith({ id: 'pref-1' });
      expect(mockProfileDetailsRepo.delete).toHaveBeenCalledWith({ id: 'pd-1' });

      // Verify PII anonymization on user entity
      expect(mockUsersRepository.createProfile).toHaveBeenCalledWith(
        expect.objectContaining({
          fullName: 'Deleted Member',
          email: null,
          fcmTokens: [],
          hashedRefreshToken: null,
          photoUrls: [],
          phoneNumber: expect.stringContaining('deleted_'),
        }),
      );

      // Verify softDelete called
      expect(mockUsersRepository.softDelete).toHaveBeenCalledWith(userId);
    });
  });

  describe('submitKyc', () => {
    const userId = 'user-kyc-id';

    it('should throw NotFoundException if user does not exist', async () => {
      mockUsersRepository.findProfileById!.mockResolvedValue(null);

      await expect(
        service.submitKyc(userId, {
          documentType: KycDocumentType.AADHAAR,
          documentUrl: 'https://example.com/aadhaar.pdf',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if user is already verified', async () => {
      mockUsersRepository.findProfileById!.mockResolvedValue({
        id: userId,
        kycStatus: KycStatus.APPROVED,
      } as User);

      await expect(
        service.submitKyc(userId, {
          documentType: KycDocumentType.AADHAAR,
          documentUrl: 'https://example.com/aadhaar.pdf',
        }),
      ).rejects.toThrow(new BadRequestException('Profile is already verified'));
    });

    it('should update user with pending KYC details and save', async () => {
      const mockUser = {
        id: userId,
        kycStatus: KycStatus.UNSUBMITTED,
        kycRejectionReason: 'Previous blur',
      } as User;

      mockUsersRepository.findProfileById!.mockResolvedValue(mockUser);
      mockUsersRepository.createProfile!.mockImplementation((u) => Promise.resolve(u));

      const result = await service.submitKyc(userId, {
        documentType: KycDocumentType.PASSPORT,
        documentUrl: 'https://storage.jain.com/passport.pdf',
      });

      expect(result.message).toBe('KYC documents submitted for admin verification');
      expect(result.kycStatus).toBe(KycStatus.PENDING);
      expect(mockUsersRepository.createProfile).toHaveBeenCalledWith(
        expect.objectContaining({
          id: userId,
          kycStatus: KycStatus.PENDING,
          kycDocumentType: KycDocumentType.PASSPORT,
          kycDocumentUrl: 'https://storage.jain.com/passport.pdf',
          kycRejectionReason: null,
          kycSubmittedAt: expect.any(Date),
        }),
      );
    });
  });

  describe('getKycStatus', () => {
    const userId = 'user-kyc-status-id';

    it('should return user KYC status details', async () => {
      const now = new Date();
      mockUsersRepository.findProfileById!.mockResolvedValue({
        id: userId,
        kycStatus: KycStatus.PENDING,
        kycDocumentType: KycDocumentType.PAN,
        kycSubmittedAt: now,
        kycRejectionReason: null,
        isVerified: false,
      } as User);

      const result = await service.getKycStatus(userId);

      expect(result).toEqual({
        kycStatus: KycStatus.PENDING,
        kycDocumentType: KycDocumentType.PAN,
        kycSubmittedAt: now,
        kycRejectionReason: null,
        isVerified: false,
      });
    });
  });

  describe('getPendingKycSubmissions', () => {
    it('should delegate to usersRepository.findPendingKyc', async () => {
      const mockResult = {
        data: [{ id: 'user-1' } as User],
        total: 1,
        page: 1,
        limit: 20,
      };
      mockUsersRepository.findPendingKyc!.mockResolvedValue(mockResult);

      const result = await service.getPendingKycSubmissions(1, 20);

      expect(mockUsersRepository.findPendingKyc).toHaveBeenCalledWith(1, 20);
      expect(result).toEqual(mockResult);
    });
  });

  describe('reviewKyc', () => {
    const adminId = 'admin-id';
    const targetUserId = 'target-user-id';

    it('should throw BadRequestException if review status is neither Approved nor Rejected', async () => {
      await expect(
        service.reviewKyc(adminId, targetUserId, {
          status: KycStatus.PENDING,
        }),
      ).rejects.toThrow(new BadRequestException('Review status must be either Approved or Rejected'));
    });

    it('should throw BadRequestException if status is Rejected but rejectionReason is missing', async () => {
      await expect(
        service.reviewKyc(adminId, targetUserId, {
          status: KycStatus.REJECTED,
          rejectionReason: '   ',
        }),
      ).rejects.toThrow(new BadRequestException('Rejection reason is required when rejecting KYC'));
    });

    it('should throw NotFoundException if target user not found', async () => {
      mockUsersRepository.findProfileById!.mockResolvedValue(null);

      await expect(
        service.reviewKyc(adminId, targetUserId, {
          status: KycStatus.APPROVED,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if target user does not have PENDING KYC status', async () => {
      mockUsersRepository.findProfileById!.mockResolvedValue({
        id: targetUserId,
        kycStatus: KycStatus.UNSUBMITTED,
      } as User);

      await expect(
        service.reviewKyc(adminId, targetUserId, {
          status: KycStatus.APPROVED,
        }),
      ).rejects.toThrow(new BadRequestException('No pending KYC submission for this user'));
    });

    it('should approve KYC, set isVerified=true, clear rejectionReason, and send push notification', async () => {
      const mockTarget = {
        id: targetUserId,
        kycStatus: KycStatus.PENDING,
        fcmTokens: ['fcm-token-target'],
        isVerified: false,
      } as User;

      mockUsersRepository.findProfileById!.mockResolvedValue(mockTarget);
      mockUsersRepository.createProfile!.mockImplementation((u) => Promise.resolve(u));

      const result = await service.reviewKyc(adminId, targetUserId, {
        status: KycStatus.APPROVED,
      });

      expect(result.message).toBe('KYC submission approved successfully');
      expect(result.kycStatus).toBe(KycStatus.APPROVED);
      expect(result.isVerified).toBe(true);
      expect(result.kycRejectionReason).toBeNull();
      expect(result.kycReviewedAt).toBeInstanceOf(Date);

      expect(mockNotificationsService.sendPushToUser).toHaveBeenCalledWith(
        ['fcm-token-target'],
        'Profile Verified! 💍',
        expect.stringContaining('Your identity verification has been approved'),
        { type: 'KYC_APPROVED' },
      );
    });

    it('should reject KYC, set isVerified=false, set rejectionReason, and send push notification', async () => {
      const mockTarget = {
        id: targetUserId,
        kycStatus: KycStatus.PENDING,
        fcmTokens: ['fcm-token-target'],
        isVerified: false,
      } as User;

      mockUsersRepository.findProfileById!.mockResolvedValue(mockTarget);
      mockUsersRepository.createProfile!.mockImplementation((u) => Promise.resolve(u));

      const result = await service.reviewKyc(adminId, targetUserId, {
        status: KycStatus.REJECTED,
        rejectionReason: 'Document image is cut off and unreadable',
      });

      expect(result.message).toBe('KYC submission rejected successfully');
      expect(result.kycStatus).toBe(KycStatus.REJECTED);
      expect(result.isVerified).toBe(false);
      expect(result.kycRejectionReason).toBe('Document image is cut off and unreadable');
      expect(result.kycReviewedAt).toBeInstanceOf(Date);

      expect(mockNotificationsService.sendPushToUser).toHaveBeenCalledWith(
        ['fcm-token-target'],
        'KYC Verification Update',
        'Document image is cut off and unreadable',
        { type: 'KYC_REJECTED' },
      );
    });
  });
});

