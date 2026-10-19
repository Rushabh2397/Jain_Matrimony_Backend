import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UsersController } from './users.controller.js';
import { UsersService } from './users.service.js';
import { User } from './entities/user.entity.js';
import { PartnerPreferences } from './entities/partner-preferences.entity.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';
import { UpsertPartnerPreferencesDto } from './dto/upsert-partner-preferences.dto.js';
import { Gender, PhotoRequestStatus } from '../common/enums/matrimony.enum.js';
import { ActiveUserData } from '../common/decorators/current-user.decorator.js';
import { PhotoAccessRequest } from './entities/photo-access-request.entity.js';
import { RespondPhotoRequestDto } from './dto/respond-photo-request.dto.js';

describe('UsersController', () => {
  let controller: UsersController;
  let mockUsersService: Partial<Record<keyof UsersService, ReturnType<typeof vi.fn>>>;

  const mockActiveUser: ActiveUserData = {
    userId: '123e4567-e89b-12d3-a456-426614174000',
  };

  beforeEach(() => {
    mockUsersService = {
      create: vi.fn(),
      findAll: vi.fn(),
      findOne: vi.fn(),
      findOneProfile: vi.fn(),
      update: vi.fn(),
      upsertPartnerPreferences: vi.fn(),
      getPartnerPreferences: vi.fn(),
      getProfileDetails: vi.fn(),
      upsertProfileDetails: vi.fn(),
      registerFcmToken: vi.fn(),
      requestPhotoAccess: vi.fn(),
      respondToPhotoRequest: vi.fn(),
      getReceivedPhotoRequests: vi.fn(),
      getSentPhotoRequests: vi.fn(),
      exportPersonalData: vi.fn(),
      deleteAccount: vi.fn(),
    };

    controller = new UsersController(mockUsersService as unknown as UsersService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getProfile (GET /users/profile)', () => {
    it('should find profile for active user', async () => {
      const mockUser = {
        id: mockActiveUser.userId,
        fullName: 'Paras Shah',
      } as User;

      mockUsersService.findOne!.mockResolvedValue(mockUser);

      const result = await controller.getProfile(mockActiveUser);

      expect(mockUsersService.findOne).toHaveBeenCalledWith(mockActiveUser.userId);
      expect(result).toEqual(mockUser);
    });
  });

  describe('updateProfile (PUT /users/profile)', () => {
    it('should extract userId from ActiveUserData and call usersService.update', async () => {
      const updateDto: UpdateProfileDto = {
        fullName: 'Paras Shah',
      };

      const updatedUser = {
        id: mockActiveUser.userId,
        fullName: 'Paras Shah',
      } as User;

      mockUsersService.update!.mockResolvedValue(updatedUser);

      const result = await controller.updateProfile(mockActiveUser, updateDto);

      expect(mockUsersService.update).toHaveBeenCalledWith(mockActiveUser.userId, updateDto);
      expect(result).toEqual(updatedUser);
    });
  });

  describe('exportData (GET /users/profile/export)', () => {
    it('should call exportPersonalData with active user id', async () => {
      const mockExport = {
        metadata: { complianceStandard: 'DPDP Act 2023' },
        profile: { id: mockActiveUser.userId },
      };
      mockUsersService.exportPersonalData!.mockResolvedValue(mockExport);

      const result = await controller.exportData(mockActiveUser);

      expect(mockUsersService.exportPersonalData).toHaveBeenCalledWith(
        mockActiveUser.userId,
      );
      expect(result).toEqual(mockExport);
    });
  });

  describe('deleteAccount (DELETE /users/profile)', () => {
    it('should call deleteAccount with active user id and optional dto', async () => {
      const dto = { reason: 'Found match' };
      const mockResult = {
        message:
          'Account successfully deleted in compliance with DPDP. Your personal data has been erased.',
        deletedAt: new Date(),
      };
      mockUsersService.deleteAccount!.mockResolvedValue(mockResult);

      const result = await controller.deleteAccount(mockActiveUser, dto);

      expect(mockUsersService.deleteAccount).toHaveBeenCalledWith(
        mockActiveUser.userId,
        dto,
      );
      expect(result).toEqual(mockResult);
    });
  });

  describe('getPreferences (GET /users/preferences)', () => {
    it('should call usersService.getPartnerPreferences with active user id', async () => {
      const mockPreferences = { id: 'pref-1', minAge: 22 } as PartnerPreferences;

      mockUsersService.getPartnerPreferences!.mockResolvedValue(mockPreferences);

      const result = await controller.getPreferences(mockActiveUser);

      expect(mockUsersService.getPartnerPreferences).toHaveBeenCalledWith(mockActiveUser.userId);
      expect(result).toEqual(mockPreferences);
    });
  });

  describe('upsertPreferences (PUT /users/preferences)', () => {
    it('should call usersService.upsertPartnerPreferences with active user id and dto', async () => {
      const dto: UpsertPartnerPreferencesDto = {
        preferredGender: Gender.FEMALE,
        minAge: 21,
        maxAge: 28,
      };
      const mockPreferences = { id: 'pref-1', ...dto } as PartnerPreferences;

      mockUsersService.upsertPartnerPreferences!.mockResolvedValue(mockPreferences);

      const result = await controller.upsertPreferences(mockActiveUser, dto);

      expect(mockUsersService.upsertPartnerPreferences).toHaveBeenCalledWith(mockActiveUser.userId, dto);
      expect(result).toEqual(mockPreferences);
    });
  });

  describe('getProfileDetails (GET /users/profile/details)', () => {
    it('should call usersService.getProfileDetails with active user id', async () => {
      const mockDetails = { id: 'details-1', bio: 'My bio' };

      mockUsersService.getProfileDetails!.mockResolvedValue(mockDetails as any);

      const result = await controller.getProfileDetails(mockActiveUser);

      expect(mockUsersService.getProfileDetails).toHaveBeenCalledWith(
        mockActiveUser.userId,
      );
      expect(result).toEqual(mockDetails);
    });
  });

  describe('upsertProfileDetails (PUT /users/profile/details)', () => {
    it('should call usersService.upsertProfileDetails with active user id and dto', async () => {
      const dto = {
        bio: 'New bio',
        hobbies: ['Garba', 'Travelling'],
        heightCm: 175,
      };
      const mockDetails = { id: 'details-1', ...dto };

      mockUsersService.upsertProfileDetails!.mockResolvedValue(mockDetails as any);

      const result = await controller.upsertProfileDetails(mockActiveUser, dto);

      expect(mockUsersService.upsertProfileDetails).toHaveBeenCalledWith(
        mockActiveUser.userId,
        dto,
      );
      expect(result).toEqual(mockDetails);
    });
  });

  describe('registerFcmToken (PUT /users/fcm-token)', () => {
    it('should call usersService.registerFcmToken with active user id and fcm token', async () => {
      const dto = { fcmToken: 'test-fcm-token-123' };
      const mockUser = { id: mockActiveUser.userId, fcmTokens: [dto.fcmToken] } as User;

      mockUsersService.registerFcmToken!.mockResolvedValue(mockUser);

      const result = await controller.registerFcmToken(mockActiveUser, dto);

      expect(mockUsersService.registerFcmToken).toHaveBeenCalledWith(
        mockActiveUser.userId,
        dto.fcmToken,
      );
      expect(result).toEqual(mockUser);
    });
  });

  describe('findOne (GET /users/:id)', () => {
    it('should call usersService.findOneProfile with param id and active user id', async () => {
      const candidateId = 'candidate-uuid';
      const mockUser = {
        id: candidateId,
        fullName: 'Rhea Shah',
        photoUrls: ['https://example.com/photo.jpg'],
      } as User;

      mockUsersService.findOneProfile!.mockResolvedValue(mockUser);

      const result = await controller.findOne(candidateId, mockActiveUser);

      expect(mockUsersService.findOneProfile).toHaveBeenCalledWith(
        candidateId,
        mockActiveUser.userId,
      );
      expect(result).toEqual(mockUser);
    });
  });

  describe('getReceivedPhotoRequests (GET /users/photo-requests/received)', () => {
    it('should call usersService.getReceivedPhotoRequests with active user id', async () => {
      const mockRequests = [{ id: 'req-1' }] as PhotoAccessRequest[];
      mockUsersService.getReceivedPhotoRequests!.mockResolvedValue(mockRequests);

      const result = await controller.getReceivedPhotoRequests(mockActiveUser);

      expect(mockUsersService.getReceivedPhotoRequests).toHaveBeenCalledWith(
        mockActiveUser.userId,
      );
      expect(result).toEqual(mockRequests);
    });
  });

  describe('getSentPhotoRequests (GET /users/photo-requests/sent)', () => {
    it('should call usersService.getSentPhotoRequests with active user id', async () => {
      const mockRequests = [{ id: 'req-2' }] as PhotoAccessRequest[];
      mockUsersService.getSentPhotoRequests!.mockResolvedValue(mockRequests);

      const result = await controller.getSentPhotoRequests(mockActiveUser);

      expect(mockUsersService.getSentPhotoRequests).toHaveBeenCalledWith(
        mockActiveUser.userId,
      );
      expect(result).toEqual(mockRequests);
    });
  });

  describe('respondToPhotoRequest (PATCH /users/photo-requests/:requestId/respond)', () => {
    it('should call usersService.respondToPhotoRequest with active user id, requestId and dto', async () => {
      const requestId = 'req-123';
      const dto: RespondPhotoRequestDto = {
        status: PhotoRequestStatus.APPROVED,
      };
      const mockResponse = { id: requestId, status: dto.status } as PhotoAccessRequest;
      mockUsersService.respondToPhotoRequest!.mockResolvedValue(mockResponse);

      const result = await controller.respondToPhotoRequest(
        mockActiveUser,
        requestId,
        dto,
      );

      expect(mockUsersService.respondToPhotoRequest).toHaveBeenCalledWith(
        mockActiveUser.userId,
        requestId,
        dto,
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe('requestPhotoAccess (POST /users/:targetId/photo-request)', () => {
    it('should call usersService.requestPhotoAccess with active user id and targetId', async () => {
      const targetId = 'target-user-uuid';
      const mockRequest = { id: 'req-new', status: PhotoRequestStatus.PENDING } as PhotoAccessRequest;
      mockUsersService.requestPhotoAccess!.mockResolvedValue(mockRequest);

      const result = await controller.requestPhotoAccess(mockActiveUser, targetId);

      expect(mockUsersService.requestPhotoAccess).toHaveBeenCalledWith(
        mockActiveUser.userId,
        targetId,
      );
      expect(result).toEqual(mockRequest);
    });
  });
});

