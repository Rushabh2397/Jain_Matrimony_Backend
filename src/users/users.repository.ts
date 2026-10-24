import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, type FindOptionsRelations } from 'typeorm';
import { User } from './entities/user.entity.js';
import { IncomeRange, Gender, KycStatus } from '../common/enums/matrimony.enum.js';

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

  async findProfileById(
    id: string,
    relations: FindOptionsRelations<User> = { profileDetails: true },
  ): Promise<User | null> {
    return await this.repo.findOne({ where: { id }, relations });
  }

  // THIS IS THE METHOD WE NEED FOR AUTH
  async findProfileByPhoneNumber(phoneNumber: string): Promise<User | null> {
    return await this.repo.findOne({ where: { phoneNumber } });
  }

  async updateProfile(id: string, updateData: Partial<User>): Promise<void> {
    await this.repo.update(id, updateData);
  }

  async updateRefreshTokenHash(
    id: string,
    hashedRefreshToken: string | null,
  ): Promise<void> {
    await this.repo.update(id, { hashedRefreshToken });
  }

  async findUserWithRefreshToken(id: string): Promise<User | null> {
    return await this.repo
      .createQueryBuilder('user')
      .where('user.id = :id', { id })
      .addSelect('user.hashedRefreshToken')
      .getOne();
  }

  async findByFilters(criteria: { gender?: Gender; city?: string; annualIncome?: IncomeRange }): Promise<User[]> {
    return await this.repo.find({ where: criteria });
  }

  async softDelete(id: string): Promise<void> {
    await this.repo.softDelete(id);
  }

  async findPendingKyc(
    page: number = 1,
    limit: number = 20,
  ): Promise<{ data: User[]; total: number; page: number; limit: number }> {
    const skip = (page - 1) * limit;
    const [data, total] = await this.repo
      .createQueryBuilder('user')
      .where('user.kycStatus = :status', { status: KycStatus.PENDING })
      .addSelect('user.kycDocumentUrl')
      .orderBy('user.kycSubmittedAt', 'ASC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return { data, total, page, limit };
  }

  async findUserWithKycDocument(id: string): Promise<User | null> {
    return await this.repo
      .createQueryBuilder('user')
      .where('user.id = :id', { id })
      .addSelect('user.kycDocumentUrl')
      .getOne();
  }
}