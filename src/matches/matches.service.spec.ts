import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { MatchesService } from './matches.service.js';
import { User } from '../users/entities/user.entity.js';
import { PartnerPreferences } from '../users/entities/partner-preferences.entity.js';
import { PhotoAccessRequest } from '../users/entities/photo-access-request.entity.js';
import { UserBlock } from '../safety/entities/user-block.entity.js';
import { InterestRequest } from '../interests/entities/interest-request.entity.js';
import {
  Gender,
  MaritalStatus,
  Sect,
  SubSect,
  Diet,
  InterestStatus,
  PhotoRequestStatus,
} from '../common/enums/matrimony.enum.js';

describe('MatchesService', () => {
  let service: MatchesService;
  let mockUserRepo: Partial<Record<keyof Repository<User>, ReturnType<typeof vi.fn>>>;
  let mockInterestRepo: Partial<Record<keyof Repository<InterestRequest>, ReturnType<typeof vi.fn>>>;
  let mockPhotoAccessRepo: Partial<Record<keyof Repository<PhotoAccessRequest>, ReturnType<typeof vi.fn>>>;
  let mockUserBlockRepo: Partial<Record<keyof Repository<UserBlock>, ReturnType<typeof vi.fn>>>;
  let mockQueryBuilder: Partial<Record<keyof SelectQueryBuilder<User>, ReturnType<typeof vi.fn>>>;

  const currentUserId = '111e4567-e89b-12d3-a456-426614174000';
  const currentUser: Partial<User> = {
    id: currentUserId,
    fullName: 'Aarav Shah',
    gender: Gender.MALE,
    dateOfBirth: new Date('1998-01-01'),
    maritalStatus: MaritalStatus.NEVER_MARRIED,
    sect: Sect.MURTIPUJAK,
    subSect: SubSect.OSWAL,
    diet: Diet.STRICT_JAIN,
    city: 'Mumbai',
    state: 'Maharashtra',
    country: 'India',
    partnerPreferences: {
      preferredGender: Gender.FEMALE,
      preferredMaritalStatuses: [MaritalStatus.NEVER_MARRIED],
      preferredSects: [Sect.MURTIPUJAK],
      preferredDiets: [Diet.STRICT_JAIN],
      minAge: 22,
      maxAge: 28,
    } as PartnerPreferences,
  };

  beforeEach(() => {
    mockQueryBuilder = {
      where: vi.fn().mockReturnThis(),
      andWhere: vi.fn().mockReturnThis(),
      setParameters: vi.fn().mockReturnThis(),
      addSelect: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      addOrderBy: vi.fn().mockReturnThis(),
      skip: vi.fn().mockReturnThis(),
      take: vi.fn().mockReturnThis(),
      getCount: vi.fn().mockResolvedValue(1),
      getMany: vi.fn().mockResolvedValue([]),
    };

    mockUserRepo = {
      findOne: vi.fn(),
      createQueryBuilder: vi.fn().mockReturnValue(mockQueryBuilder),
    };

    mockInterestRepo = {
      find: vi.fn().mockResolvedValue([]),
      findOne: vi.fn().mockResolvedValue(null),
    };

    mockPhotoAccessRepo = {
      find: vi.fn().mockResolvedValue([]),
      findOne: vi.fn().mockResolvedValue(null),
    };

    mockUserBlockRepo = {
      findOne: vi.fn().mockResolvedValue(null),
      find: vi.fn().mockResolvedValue([]),
    };

    service = new MatchesService(
      mockUserRepo as unknown as Repository<User>,
      mockInterestRepo as unknown as Repository<InterestRequest>,
      mockPhotoAccessRepo as unknown as Repository<PhotoAccessRequest>,
      mockUserBlockRepo as unknown as Repository<UserBlock>,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getDiscoveryFeed', () => {
    it('should throw NotFoundException if user profile not found', async () => {
      mockUserRepo.findOne!.mockResolvedValue(null);

      await expect(
        service.getDiscoveryFeed(currentUserId, {}),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if user profile has no gender or dateOfBirth', async () => {
      mockUserRepo.findOne!.mockResolvedValue({
        id: currentUserId,
        gender: null,
        dateOfBirth: null,
      } as User);

      await expect(
        service.getDiscoveryFeed(currentUserId, {}),
      ).rejects.toThrow(BadRequestException);
    });

    it('should build discovery feed query excluding self, same-gender, and incompatible marital statuses', async () => {
      mockUserRepo.findOne!.mockResolvedValue(currentUser as User);

      const candidate: Partial<User> = {
        id: 'cand-1',
        fullName: 'Pooja Mehta',
        gender: Gender.FEMALE,
        dateOfBirth: new Date('1999-05-15'),
        maritalStatus: MaritalStatus.NEVER_MARRIED,
        sect: Sect.MURTIPUJAK,
        subSect: SubSect.OSWAL,
        diet: Diet.STRICT_JAIN,
        city: 'Mumbai',
        state: 'Maharashtra',
        country: 'India',
        defaultPhotoUrl: 'https://example.com/avatar.jpg',
        photoUrls: ['https://example.com/private1.jpg'],
        isPhotosLocked: true, // Should hide photoUrls in response
        isVerified: true,
      };

      mockQueryBuilder.getMany!.mockResolvedValue([candidate as User]);
      mockQueryBuilder.getCount!.mockResolvedValue(1);

      const result = await service.getDiscoveryFeed(currentUserId, {
        page: 1,
        limit: 10,
        sect: Sect.MURTIPUJAK,
        city: 'Mumbai',
      });

      // Verify self exclusion
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'candidate.id != :currentUserId',
        { currentUserId },
      );

      // Verify same-gender exclusion (target is FEMALE)
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'candidate.gender = :targetGender',
        { targetGender: Gender.FEMALE },
      );

      // Verify incompatible marital statuses exclusion
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'candidate.maritalStatus IN (:...targetMaritalStatuses)',
        { targetMaritalStatuses: [MaritalStatus.NEVER_MARRIED] },
      );

      // Verify optional filters
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'candidate.sect = :filterSect',
        { filterSect: Sect.MURTIPUJAK },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'LOWER(candidate.city) = LOWER(:filterCity)',
        { filterCity: 'Mumbai' },
      );

      // Verify sorting by score and creation date
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith('match_score', 'DESC');
      expect(mockQueryBuilder.addOrderBy).toHaveBeenCalledWith('candidate.createdAt', 'DESC');

      // Verify response formatting and privacy-first photo protection
      expect(result.data).toHaveLength(1);
      expect(result.data[0].photoUrls).toEqual([]); // Privacy safeguard active!
      expect(result.data[0].compatibility.score).toBe(100);
      expect(result.meta.total).toBe(1);
      expect(result.meta.page).toBe(1);
      expect(result.meta.totalPages).toBe(1);
    });

    it('should filter by minScore when provided in query', async () => {
      mockUserRepo.findOne!.mockResolvedValue(currentUser as User);
      mockQueryBuilder.getMany!.mockResolvedValue([]);
      mockQueryBuilder.getCount!.mockResolvedValue(0);

      await service.getDiscoveryFeed(currentUserId, { minScore: 70 });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('>= :minScore'),
        { minScore: 70 },
      );
    });

    it('should exclude interacted profiles by default when includeInteracted is false', async () => {
      mockUserRepo.findOne!.mockResolvedValue(currentUser as User);
      mockQueryBuilder.getMany!.mockResolvedValue([]);
      mockQueryBuilder.getCount!.mockResolvedValue(0);

      await service.getDiscoveryFeed(currentUserId, { includeInteracted: false });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('interest_requests'),
        { currentUserId },
      );
    });

    it('should not add NOT EXISTS clause for interest requests when includeInteracted is true', async () => {
      mockUserRepo.findOne!.mockResolvedValue(currentUser as User);
      mockQueryBuilder.getMany!.mockResolvedValue([]);
      mockQueryBuilder.getCount!.mockResolvedValue(0);

      await service.getDiscoveryFeed(currentUserId, { includeInteracted: true });

      expect(mockQueryBuilder.andWhere).not.toHaveBeenCalledWith(
        expect.stringContaining('interest_requests'),
        expect.anything(),
      );
    });

    it('should dynamically unlock photos when interest request is ACCEPTED', async () => {
      mockUserRepo.findOne!.mockResolvedValue(currentUser as User);

      const candidate: Partial<User> = {
        id: 'cand-accepted',
        fullName: 'Prachi Shah',
        gender: Gender.FEMALE,
        dateOfBirth: new Date('1999-05-15'),
        maritalStatus: MaritalStatus.NEVER_MARRIED,
        photoUrls: ['https://example.com/photo1.jpg'],
        isPhotosLocked: true,
      };

      mockQueryBuilder.getMany!.mockResolvedValue([candidate as User]);
      mockQueryBuilder.getCount!.mockResolvedValue(1);

      const acceptedInterest = {
        id: 'ir-1',
        sender: { id: currentUserId } as User,
        receiver: { id: 'cand-accepted' } as User,
        status: InterestStatus.ACCEPTED,
        grantPhotoAccess: false,
      } as InterestRequest;

      mockInterestRepo.find!.mockResolvedValue([acceptedInterest]);

      const result = await service.getDiscoveryFeed(currentUserId, {});

      expect(result.data[0].isPhotoAccessGranted).toBe(true);
      expect(result.data[0].photoUrls).toEqual(['https://example.com/photo1.jpg']);
    });

    it('should dynamically unlock photos when candidate granted photo access on their interest request', async () => {
      mockUserRepo.findOne!.mockResolvedValue(currentUser as User);

      const candidate: Partial<User> = {
        id: 'cand-granted',
        fullName: 'Rhea Kothari',
        gender: Gender.FEMALE,
        dateOfBirth: new Date('1999-05-15'),
        maritalStatus: MaritalStatus.NEVER_MARRIED,
        photoUrls: ['https://example.com/photo1.jpg'],
        isPhotosLocked: true,
      };

      mockQueryBuilder.getMany!.mockResolvedValue([candidate as User]);
      mockQueryBuilder.getCount!.mockResolvedValue(1);

      const grantedInterest = {
        id: 'ir-2',
        sender: { id: 'cand-granted' } as User,
        receiver: { id: currentUserId } as User,
        status: InterestStatus.PENDING,
        grantPhotoAccess: true,
      } as InterestRequest;

      mockInterestRepo.find!.mockResolvedValue([grantedInterest]);

      const result = await service.getDiscoveryFeed(currentUserId, {});

      expect(result.data[0].isPhotoAccessGranted).toBe(true);
      expect(result.data[0].photoUrls).toEqual(['https://example.com/photo1.jpg']);
    });

    it('should leave photos unlocked when candidate isPhotosLocked is false', async () => {
      mockUserRepo.findOne!.mockResolvedValue(currentUser as User);

      const candidate: Partial<User> = {
        id: 'cand-unlocked',
        fullName: 'Bhavna Jain',
        gender: Gender.FEMALE,
        dateOfBirth: new Date('1999-05-15'),
        maritalStatus: MaritalStatus.NEVER_MARRIED,
        photoUrls: ['https://example.com/open1.jpg'],
        isPhotosLocked: false,
      };

      mockQueryBuilder.getMany!.mockResolvedValue([candidate as User]);
      mockQueryBuilder.getCount!.mockResolvedValue(1);
      mockInterestRepo.find!.mockResolvedValue([]);

      const result = await service.getDiscoveryFeed(currentUserId, {});

      expect(result.data[0].isPhotoAccessGranted).toBe(true);
      expect(result.data[0].photoUrls).toEqual(['https://example.com/open1.jpg']);
    });

    it('should dynamically unlock photos when PhotoAccessRequest is APPROVED', async () => {
      mockUserRepo.findOne!.mockResolvedValue(currentUser as User);
      const candidate: Partial<User> = {
        id: 'cand-photo-request',
        fullName: 'Chhavi Jain',
        gender: Gender.FEMALE,
        dateOfBirth: new Date('1999-05-15'),
        maritalStatus: MaritalStatus.NEVER_MARRIED,
        photoUrls: ['https://example.com/unlocked-photo.jpg'],
        isPhotosLocked: true,
      };

      mockQueryBuilder.getMany!.mockResolvedValue([candidate as User]);
      mockQueryBuilder.getCount!.mockResolvedValue(1);
      mockInterestRepo.find!.mockResolvedValue([]);
      mockPhotoAccessRepo.find!.mockResolvedValue([
        {
          id: 'par-100',
          status: PhotoRequestStatus.APPROVED,
          requester: { id: currentUserId },
          targetUser: { id: 'cand-photo-request' },
        } as PhotoAccessRequest,
      ]);

      const result = await service.getDiscoveryFeed(currentUserId, {});

      expect(result.data[0].isPhotoAccessGranted).toBe(true);
      expect(result.data[0].photoUrls).toEqual([
        'https://example.com/unlocked-photo.jpg',
      ]);
      expect(result.data[0].photoRequestStatus).toBe(
        PhotoRequestStatus.APPROVED,
      );
    });
  });

  describe('getMatchScore', () => {
    it('should throw BadRequestException if candidate is self', async () => {
      await expect(
        service.getMatchScore(currentUserId, currentUserId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if user is not found', async () => {
      mockUserRepo.findOne!.mockResolvedValueOnce(null);

      await expect(
        service.getMatchScore(currentUserId, 'other-id'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if candidate is not found', async () => {
      mockUserRepo.findOne!
        .mockResolvedValueOnce(currentUser as User)
        .mockResolvedValueOnce(null);

      await expect(
        service.getMatchScore(currentUserId, 'other-id'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if candidate is blocked in either direction', async () => {
      mockUserRepo.findOne!
        .mockResolvedValueOnce(currentUser as User)
        .mockResolvedValueOnce({ id: 'blocked-candidate' } as User);
      mockUserBlockRepo.findOne!.mockResolvedValueOnce({ id: 'ub-1' } as UserBlock);

      await expect(
        service.getMatchScore(currentUserId, 'blocked-candidate'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should return detailed match score and breakdown', async () => {
      const candidate: Partial<User> = {
        id: 'candidate-uuid',
        fullName: 'Pooja Mehta',
        gender: Gender.FEMALE,
        dateOfBirth: new Date('1999-01-01'),
        maritalStatus: MaritalStatus.NEVER_MARRIED,
        sect: Sect.MURTIPUJAK,
        subSect: SubSect.OSWAL,
        diet: Diet.STRICT_JAIN,
        city: 'Mumbai',
        state: 'Maharashtra',
        country: 'India',
      };

      mockUserRepo.findOne!
        .mockResolvedValueOnce(currentUser as User)
        .mockResolvedValueOnce(candidate as User);

      const result = await service.getMatchScore(currentUserId, 'candidate-uuid');

      expect(result.candidateId).toBe('candidate-uuid');
      expect(result.candidateName).toBe('Pooja Mehta');
      expect(result.compatibility.score).toBe(100);
      expect(result.compatibility.breakdown.sect.score).toBe(25);
    });
  });
});

