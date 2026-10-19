import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { User } from '../users/entities/user.entity.js';
import { Gender, MaritalStatus, InterestStatus, PhotoRequestStatus } from '../common/enums/matrimony.enum.js';
import { InterestRequest } from '../interests/entities/interest-request.entity.js';
import { PhotoAccessRequest } from '../users/entities/photo-access-request.entity.js';
import { UserBlock } from '../safety/entities/user-block.entity.js';
import { MatchFeedQueryDto } from './dto/match-feed-query.dto.js';
import {
  MatchFeedResponse,
  MatchDetailResponse,
  MatchedProfileCandidate,
} from './interfaces/match-response.interface.js';
import {
  calculateAge,
  calculateCompatibility,
  buildScoreSql,
  buildScoringParameters,
} from './matches-scoring.js';

@Injectable()
export class MatchesService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(InterestRequest)
    private readonly interestRepo: Repository<InterestRequest>,
    @InjectRepository(PhotoAccessRequest)
    private readonly photoAccessRepo: Repository<PhotoAccessRequest>,
    @InjectRepository(UserBlock)
    private readonly userBlockRepo: Repository<UserBlock>,
  ) {}

  async getDiscoveryFeed(
    userId: string,
    query: MatchFeedQueryDto,
  ): Promise<MatchFeedResponse> {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      relations: { partnerPreferences: true },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    if (!user.gender || !user.dateOfBirth) {
      throw new BadRequestException(
        'Please update your profile with your gender and date of birth before accessing the discovery feed',
      );
    }

    const preferences = user.partnerPreferences;

    // 1. Determine Target Gender (excludes same-gender)
    const targetGender =
      preferences?.preferredGender ??
      (user.gender === Gender.MALE ? Gender.FEMALE : Gender.MALE);

    // 2. Determine Target Marital Statuses (excludes incompatible statuses)
    let targetMaritalStatuses: MaritalStatus[];
    if (
      preferences?.preferredMaritalStatuses &&
      preferences.preferredMaritalStatuses.length > 0
    ) {
      targetMaritalStatuses = preferences.preferredMaritalStatuses;
    } else if (user.maritalStatus === MaritalStatus.NEVER_MARRIED) {
      targetMaritalStatuses = [MaritalStatus.NEVER_MARRIED];
    } else if (user.maritalStatus) {
      targetMaritalStatuses = [
        MaritalStatus.DIVORCED,
        MaritalStatus.WIDOWED,
        MaritalStatus.AWAITING_DIVORCE,
      ];
    } else {
      targetMaritalStatuses = [
        MaritalStatus.NEVER_MARRIED,
        MaritalStatus.DIVORCED,
        MaritalStatus.WIDOWED,
        MaritalStatus.AWAITING_DIVORCE,
      ];
    }

    const scoreSql = buildScoreSql();
    const scoringParams = buildScoringParameters(user, preferences);

    // Build the query builder
    const qb = this.userRepo.createQueryBuilder('candidate');

    // Exclusion filters: exclude self, same-gender, incompatible marital statuses
    qb.where('candidate.id != :currentUserId', { currentUserId: user.id });
    qb.andWhere('candidate.gender = :targetGender', { targetGender });
    qb.andWhere('candidate.maritalStatus IN (:...targetMaritalStatuses)', {
      targetMaritalStatuses,
    });

    // Optional query filters
    if (query.sect) {
      qb.andWhere('candidate.sect = :filterSect', { filterSect: query.sect });
    }
    if (query.subSect) {
      qb.andWhere('candidate.subSect = :filterSubSect', {
        filterSubSect: query.subSect,
      });
    }
    if (query.diet) {
      qb.andWhere('candidate.diet = :filterDiet', { filterDiet: query.diet });
    }
    if (query.city) {
      qb.andWhere('LOWER(candidate.city) = LOWER(:filterCity)', {
        filterCity: query.city.trim(),
      });
    }

    qb.setParameters(scoringParams);

    if (query.minScore !== undefined) {
      qb.andWhere(`${scoreSql} >= :minScore`, { minScore: query.minScore });
    }

    // Build companion count query for accurate pagination meta
    const countQb = this.userRepo.createQueryBuilder('candidate');
    countQb.where('candidate.id != :currentUserId', { currentUserId: user.id });
    countQb.andWhere('candidate.gender = :targetGender', { targetGender });
    countQb.andWhere('candidate.maritalStatus IN (:...targetMaritalStatuses)', {
      targetMaritalStatuses,
    });

    if (query.sect) {
      countQb.andWhere('candidate.sect = :filterSect', { filterSect: query.sect });
    }
    if (query.subSect) {
      countQb.andWhere('candidate.subSect = :filterSubSect', {
        filterSubSect: query.subSect,
      });
    }
    if (query.diet) {
      countQb.andWhere('candidate.diet = :filterDiet', { filterDiet: query.diet });
    }
    if (query.city) {
      countQb.andWhere('LOWER(candidate.city) = LOWER(:filterCity)', {
        filterCity: query.city.trim(),
      });
    }
    countQb.setParameters(scoringParams);

    if (query.minScore !== undefined) {
      countQb.andWhere(`${scoreSql} >= :minScore`, { minScore: query.minScore });
    }

    // Exclude blocked profiles in either direction
    const notBlockedCondition = `NOT EXISTS (
      SELECT 1 FROM user_blocks ub
      WHERE (ub."blockerId" = :currentUserId AND ub."blockedUserId" = candidate.id)
         OR (ub."blockerId" = candidate.id AND ub."blockedUserId" = :currentUserId)
    )`;
    qb.andWhere(notBlockedCondition, { currentUserId: user.id });
    countQb.andWhere(notBlockedCondition, { currentUserId: user.id });

    if (!query.includeInteracted) {
      const notInteractedCondition = `NOT EXISTS (
        SELECT 1 FROM interest_requests ir
        WHERE (ir."senderId" = :currentUserId AND ir."receiverId" = candidate.id)
           OR (ir."senderId" = candidate.id AND ir."receiverId" = :currentUserId)
      )`;
      qb.andWhere(notInteractedCondition, { currentUserId: user.id });
      countQb.andWhere(notInteractedCondition, { currentUserId: user.id });
    }

    const total = await countQb.getCount();

    // QueryBuilder scoring engine calculating compatibility % based on Sect, Sub-Sect, Diet, Age, Location
    qb.addSelect(scoreSql, 'match_score');
    qb.orderBy('match_score', 'DESC');
    qb.addOrderBy('candidate.createdAt', 'DESC');

    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    qb.skip(skip).take(limit);

    const candidates = await qb.getMany();

    // Batch query existing interest requests & photo access requests between user and retrieved candidates
    const candidateInterestsMap = new Map<string, InterestRequest[]>();
    const candidatePhotoRequestsMap = new Map<string, PhotoAccessRequest>();

    if (candidates.length > 0) {
      const candidateIds = candidates.map((c) => c.id);
      const [existingInterests, existingPhotoRequests] = await Promise.all([
        this.interestRepo.find({
          where: [
            { sender: { id: user.id }, receiver: In(candidateIds) },
            { sender: In(candidateIds), receiver: { id: user.id } },
          ],
          relations: { sender: true, receiver: true },
        }),
        this.photoAccessRepo.find({
          where: {
            requester: { id: user.id },
            targetUser: In(candidateIds),
          },
          relations: { targetUser: true },
        }),
      ]);

      for (const interest of existingInterests) {
        const otherId =
          interest.sender?.id === user.id
            ? interest.receiver?.id
            : interest.sender?.id;
        if (otherId) {
          const list = candidateInterestsMap.get(otherId) ?? [];
          list.push(interest);
          candidateInterestsMap.set(otherId, list);
        }
      }

      for (const pr of existingPhotoRequests) {
        if (pr.targetUser?.id) {
          candidatePhotoRequestsMap.set(pr.targetUser.id, pr);
        }
      }
    }

    // Transform candidates into privacy-protected DTOs with dynamic photo unlocking
    const data: MatchedProfileCandidate[] = candidates.map((candidate) => {
      const compatibility = calculateCompatibility(user, candidate, preferences);
      const candidateInterests = candidateInterestsMap.get(candidate.id) ?? [];
      const photoRequest = candidatePhotoRequestsMap.get(candidate.id) ?? null;
      const isPhotoAccessGranted = this.hasPhotoAccess(
        user.id,
        candidate,
        candidateInterests,
        photoRequest,
      );

      return {
        id: candidate.id,
        fullName: candidate.fullName,
        age: calculateAge(candidate.dateOfBirth),
        gender: candidate.gender,
        maritalStatus: candidate.maritalStatus,
        sect: candidate.sect,
        subSect: candidate.subSect,
        diet: candidate.diet,
        highestEducation: candidate.highestEducation,
        occupation: candidate.occupation,
        organizationName: candidate.organizationName,
        annualIncome: candidate.annualIncome,
        familyType: candidate.familyType,
        city: candidate.city,
        state: candidate.state,
        country: candidate.country,
        defaultPhotoUrl: candidate.defaultPhotoUrl,
        // Privacy safeguard: gallery photos unlocked dynamically via interest acceptance, sender grant, or approved photo request
        photoUrls: isPhotoAccessGranted ? candidate.photoUrls || [] : [],
        isPhotosLocked: candidate.isPhotosLocked,
        isPhotoAccessGranted,
        photoRequestStatus: photoRequest?.status ?? null,
        isVerified: candidate.isVerified,
        compatibility,
      };
    });

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  /**
   * Evaluates if viewerId is permitted to view candidate's locked photoUrls.
   */
  hasPhotoAccess(
    viewerId: string,
    candidate: User,
    interests: InterestRequest[] = [],
    photoRequest?: PhotoAccessRequest | null,
  ): boolean {
    if (candidate.id === viewerId || !candidate.isPhotosLocked) {
      return true;
    }

    if (photoRequest?.status === PhotoRequestStatus.APPROVED) {
      return true;
    }

    return interests.some((interest) => {
      const isCandidateSender = interest.sender?.id === candidate.id;
      const isCandidateReceiver = interest.receiver?.id === candidate.id;

      if (!isCandidateSender && !isCandidateReceiver) {
        return false;
      }

      if (interest.status === InterestStatus.ACCEPTED) {
        return true;
      }

      if (
        isCandidateSender &&
        interest.receiver?.id === viewerId &&
        interest.grantPhotoAccess
      ) {
        return true;
      }

      return false;
    });
  }

  async getMatchScore(
    userId: string,
    candidateId: string,
  ): Promise<MatchDetailResponse> {
    if (userId === candidateId) {
      throw new BadRequestException('Cannot calculate match score with yourself');
    }

    const user = await this.userRepo.findOne({
      where: { id: userId },
      relations: { partnerPreferences: true },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    const candidate = await this.userRepo.findOne({
      where: { id: candidateId },
    });

    if (!candidate) {
      throw new NotFoundException(`Candidate with ID ${candidateId} not found`);
    }

    const block = await this.userBlockRepo.findOne({
      where: [
        { blocker: { id: userId }, blockedUser: { id: candidateId } },
        { blocker: { id: candidateId }, blockedUser: { id: userId } },
      ],
    });

    if (block) {
      throw new NotFoundException(`Candidate with ID ${candidateId} not found`);
    }

    const compatibility = calculateCompatibility(
      user,
      candidate,
      user.partnerPreferences,
    );

    return {
      candidateId: candidate.id,
      candidateName: candidate.fullName,
      compatibility,
    };
  }
}

