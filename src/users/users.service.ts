import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UsersRepository } from './users.repository.js';
import { User } from './entities/user.entity.js';
import { PartnerPreferences } from './entities/partner-preferences.entity.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';
import { UpsertPartnerPreferencesDto } from './dto/upsert-partner-preferences.dto.js';

@Injectable()
export class UsersService {
  constructor(
    private readonly usersRepository: UsersRepository,
    @InjectRepository(PartnerPreferences)
    private readonly partnerPreferencesRepo: Repository<PartnerPreferences>,
  ) {}

  async create(userData: Partial<User>): Promise<User> {
    return await this.usersRepository.createProfile(userData);
  }

  async findAll(): Promise<User[]> {
    return await this.usersRepository.findAllProfiles();
  }

  async findOne(id: string): Promise<User> {
    const user = await this.usersRepository.findProfileById(id);
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return user;
  }

  // EXPOSE THIS IN SERVICE FOR AUTH
  async findByPhoneNumber(phoneNumber: string): Promise<User | null> {
    return await this.usersRepository.findProfileByPhoneNumber(phoneNumber);
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
}