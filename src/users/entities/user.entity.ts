import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  type Relation,
} from 'typeorm';
import {
  IncomeRange,
  Sect,
  SubSect,
  Diet,
  Gender,
  MaritalStatus,
  EducationLevel,
  OccupationType,
  FamilyType,
  UserRole,
} from '../../common/enums/matrimony.enum.js';
import { PartnerPreferences } from './partner-preferences.entity.js';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  phoneNumber: string;

  @Column({ nullable: true })
  email: string;

  @Column()
  fullName: string;

  @Column({ type: 'date', nullable: true })
  dateOfBirth: Date;

  @Column({ nullable: true, type: 'enum', enum: Gender })
  gender: Gender;

  @Column({ nullable: true, type: 'enum', enum: MaritalStatus })
  maritalStatus: MaritalStatus;

  // --- Shwetambar Jain Cultural & Religious Fields ---
  @Column({ type: 'enum', enum: Sect, nullable: true })
  sect: Sect; // Murtipujak (Deravasi), Sthanakvasi, Terapanthi

  @Column({ type: 'enum', enum: SubSect, nullable: true })
  subSect: SubSect;

  @Column({ type: 'enum', enum: Diet, nullable: true })
  diet: Diet; // Vegan, Strict Jain, Regular Jain, Chovihar Jain

  // --- Decoupled Partner Preferences ---
  @OneToOne(() => PartnerPreferences, (prefs) => prefs.user, { cascade: true })
  partnerPreferences: Relation<PartnerPreferences>;

  // --- Professional & Education Details ---
  @Column({ type: 'enum', enum: EducationLevel, nullable: true })
  highestEducation: EducationLevel;

  @Column({ type: 'enum', enum: OccupationType, nullable: true })
  occupation: OccupationType;

  @Column({ nullable: true })
  organizationName: string;

  @Column({
    type: 'enum',
    enum: IncomeRange,
    nullable: true,
  })
  annualIncome: IncomeRange;

  // --- Family Details ---
  @Column({ type: 'enum', enum: FamilyType, nullable: true })
  familyType: FamilyType;

  // --- Location Details ---
  @Column({ nullable: true })
  city: string;

  @Column({ nullable: true })
  state: string;

  @Column({ nullable: true })
  country: string;

  // --- Photos & Privacy Control ---
  // Publicly visible default photo or community avatar placeholder
  @Column({ 
    nullable: true, 
    default: 'https://cdn.jainmatrimony.app/defaults/placeholder-avatar.png' 
  })
  defaultPhotoUrl: string;

  // Private photo gallery
  @Column({ type: 'simple-array', nullable: true })
  photoUrls: string[];

  @Column({ default: true })
  isPhotosLocked: boolean; // True = requires "Ask to View" permission to see actual gallery

  // --- Trust, Role & Verification ---
  @Column({ type: 'enum', enum: UserRole, default: UserRole.USER })
  role: UserRole;

  @Column({ default: false })
  isVerified: boolean; // ID / KYC Verified Badge

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}