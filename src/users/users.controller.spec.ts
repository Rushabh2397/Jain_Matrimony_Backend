import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UsersController } from './users.controller.js';
import { UsersService } from './users.service.js';
import { User } from './entities/user.entity.js';
import { PartnerPreferences } from './entities/partner-preferences.entity.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';
import { UpsertPartnerPreferencesDto } from './dto/upsert-partner-preferences.dto.js';
import { Gender } from '../common/enums/matrimony.enum.js';
import { ActiveUserData } from '../common/decorators/current-user.decorator.js';

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
      update: vi.fn(),
      upsertPartnerPreferences: vi.fn(),
      getPartnerPreferences: vi.fn(),
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
});
