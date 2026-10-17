import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  type Relation,
} from 'typeorm';
import {
  Gender,
  MaritalStatus,
  Sect,
  SubSect,
  Diet,
  IncomeRange,
  EducationLevel,
  OccupationType,
  FamilyType,
} from '../../common/enums/matrimony.enum.js';
import { User } from './user.entity.js';

@Entity('partner_preferences')
export class PartnerPreferences {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: Gender, nullable: true })
  preferredGender: Gender | null;

  @Column({ type: 'int', nullable: true })
  minAge: number | null;

  @Column({ type: 'int', nullable: true })
  maxAge: number | null;

  @Column({ type: 'simple-array', nullable: true })
  preferredMaritalStatuses: MaritalStatus[] | null;

  @Column({ type: 'simple-array', nullable: true })
  preferredSects: Sect[] | null;

  @Column({ type: 'simple-array', nullable: true })
  preferredSubSects: SubSect[] | null;

  @Column({ type: 'simple-array', nullable: true })
  preferredDiets: Diet[] | null;

  @Column({ type: 'simple-array', nullable: true })
  preferredEducationLevels: EducationLevel[] | null;

  @Column({ type: 'simple-array', nullable: true })
  preferredOccupations: OccupationType[] | null;

  @Column({ type: 'enum', enum: IncomeRange, nullable: true })
  minIncome: IncomeRange | null;

  @Column({ type: 'simple-array', nullable: true })
  preferredFamilyTypes: FamilyType[] | null;

  @Column({ type: 'simple-array', nullable: true })
  preferredCities: string[] | null;

  @Column({ type: 'simple-array', nullable: true })
  preferredStates: string[] | null;

  @OneToOne(() => User, (user) => user.partnerPreferences, { onDelete: 'CASCADE' })
  @JoinColumn()
  user: Relation<User>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
