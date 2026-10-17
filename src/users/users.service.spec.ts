import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { UsersService } from './users.service.js';
import { UsersRepository } from './users.repository.js';
import { User } from './entities/user.entity.js';
import { PartnerPreferences } from './entities/partner-preferences.entity.js';
import { UpsertPartnerPreferencesDto } from './dto/upsert-partner-preferences.dto.js';
import { Gender, MaritalStatus, Sect, Diet } from '../common/enums/matrimony.enum.js';

describe('UsersService', () => {
  let service: UsersService;
  let mockUsersRepository: Partial<Record<keyof UsersRepository, ReturnType<typeof vi.fn>>>;
  let mockPartnerPreferencesRepo: Partial<Record<keyof Repository<PartnerPreferences>, ReturnType<typeof vi.fn>>>;

  beforeEach(() => {
    mockUsersRepository = {
      createProfile: vi.fn(),
      findAllProfiles: vi.fn(),
      findProfileById: vi.fn(),
      findProfileByPhoneNumber: vi.fn(),
    };

    mockPartnerPreferencesRepo = {
      findOne: vi.fn(),
      create: vi.fn(),
      save: vi.fn(),
    };

    service = new UsersService(
      mockUsersRepository as unknown as UsersRepository,
      mockPartnerPreferencesRepo as unknown as Repository<PartnerPreferences>,
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

      expect(mockUsersRepository.findProfileById).toHaveBeenCalledWith(userId);
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
});
