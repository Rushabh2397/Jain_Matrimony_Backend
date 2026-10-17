import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity.js';
import { IncomeRange, Gender } from '../common/enums/matrimony.enum.js';

@Injectable()
export class UsersRepository {
  constructor(
    @InjectRepository(User)
    private readonly repo: Repository<User>,
  ) {}

  async createProfile(userData: Partial<User>): Promise<User> {
    const user = this.repo.create(userData);
    return await this.repo.save(user);
  }

  async findAllProfiles(): Promise<User[]> {
    return await this.repo.find();
  }

  async findProfileById(id: string): Promise<User | null> {
    return await this.repo.findOne({ where: { id } });
  }

  // THIS IS THE METHOD WE NEED FOR AUTH
  async findProfileByPhoneNumber(phoneNumber: string): Promise<User | null> {
    return await this.repo.findOne({ where: { phoneNumber } });
  }

  async updateProfile(id: string, updateData: Partial<User>): Promise<void> {
    await this.repo.update(id, updateData);
  }

  async findByFilters(criteria: { gender?: Gender; city?: string; annualIncome?: IncomeRange }): Promise<User[]> {
    return await this.repo.find({ where: criteria });
  }
}