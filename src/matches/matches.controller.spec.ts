import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MatchesController } from './matches.controller.js';
import { MatchesService } from './matches.service.js';
import { MatchFeedQueryDto } from './dto/match-feed-query.dto.js';
import { ActiveUserData } from '../common/decorators/current-user.decorator.js';
import { Gender, MaritalStatus, Sect, Diet } from '../common/enums/matrimony.enum.js';
import { MatchFeedResponse, MatchDetailResponse } from './interfaces/match-response.interface.js';

describe('MatchesController', () => {
  let controller: MatchesController;
  let mockMatchesService: Partial<Record<keyof MatchesService, ReturnType<typeof vi.fn>>>;

  const mockActiveUser: ActiveUserData = {
    userId: '123e4567-e89b-12d3-a456-426614174000',
  };

  beforeEach(() => {
    mockMatchesService = {
      getDiscoveryFeed: vi.fn(),
      getMatchScore: vi.fn(),
    };

    controller = new MatchesController(
      mockMatchesService as unknown as MatchesService,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getDiscoveryFeed (GET /matches)', () => {
    it('should pass userId and query to matchesService.getDiscoveryFeed', async () => {
      const query: MatchFeedQueryDto = {
        page: 1,
        limit: 10,
        sect: Sect.MURTIPUJAK,
      };

      const mockResponse: MatchFeedResponse = {
        data: [
          {
            id: 'cand-1',
            fullName: 'Pooja Mehta',
            age: 26,
            gender: Gender.FEMALE,
            maritalStatus: MaritalStatus.NEVER_MARRIED,
            sect: Sect.MURTIPUJAK,
            subSect: null,
            diet: Diet.STRICT_JAIN,
            highestEducation: null,
            occupation: null,
            organizationName: null,
            annualIncome: null,
            familyType: null,
            city: 'Mumbai',
            state: 'Maharashtra',
            country: 'India',
            defaultPhotoUrl: 'https://example.com/photo.jpg',
            photoUrls: [],
            isPhotosLocked: true,
            isVerified: true,
            compatibility: {
              score: 95,
              breakdown: {
                sect: { score: 25, max: 25, description: 'Exact sect match' },
                subSect: { score: 20, max: 20, description: 'Open' },
                diet: { score: 25, max: 25, description: 'Exact diet match' },
                age: { score: 15, max: 15, description: 'In range' },
                location: { score: 10, max: 15, description: 'Same state' },
              },
            },
          },
        ],
        meta: {
          total: 1,
          page: 1,
          limit: 10,
          totalPages: 1,
        },
      };

      mockMatchesService.getDiscoveryFeed!.mockResolvedValue(mockResponse);

      const result = await controller.getDiscoveryFeed(mockActiveUser, query);

      expect(mockMatchesService.getDiscoveryFeed).toHaveBeenCalledWith(
        mockActiveUser.userId,
        query,
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe('getMatchScore (GET /matches/:id/score)', () => {
    it('should pass userId and candidateId to matchesService.getMatchScore', async () => {
      const candidateId = '222e4567-e89b-12d3-a456-426614174999';

      const mockScoreResponse: MatchDetailResponse = {
        candidateId,
        candidateName: 'Pooja Mehta',
        compatibility: {
          score: 85,
          breakdown: {
            sect: { score: 25, max: 25, description: 'Exact match' },
            subSect: { score: 20, max: 20, description: 'Lineage match' },
            diet: { score: 25, max: 25, description: 'Diet match' },
            age: { score: 15, max: 15, description: 'Age match' },
            location: { score: 0, max: 15, description: 'Different location' },
          },
        },
      };

      mockMatchesService.getMatchScore!.mockResolvedValue(mockScoreResponse);

      const result = await controller.getMatchScore(mockActiveUser, candidateId);

      expect(mockMatchesService.getMatchScore).toHaveBeenCalledWith(
        mockActiveUser.userId,
        candidateId,
      );
      expect(result).toEqual(mockScoreResponse);
    });
  });
});

