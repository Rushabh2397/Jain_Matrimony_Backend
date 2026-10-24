import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
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
  PhotoRequestStatus,
  KycStatus,
  KycDocumentType,
} from '../../common/enums/matrimony.enum.js';
import { PartnerPreferences } from './partner-preferences.entity.js';
import { ProfileDetails } from './profile-details.entity.js';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  phoneNumber: string;

  @Column({ type: 'varchar', nullable: true })
  email: string | null;

  @Column()
  fullName: string;

  @Column({ type: 'date', nullable: true })
  dateOfBirth: Date | null;

  @Column({ nullable: true, type: 'enum', enum: Gender })
  gender: Gender | null;

  @Column({ nullable: true, type: 'enum', enum: MaritalStatus })
  maritalStatus: MaritalStatus | null;

  // --- Shwetambar Jain Cultural & Religious Fields ---
  @Column({ type: 'enum', enum: Sect, nullable: true })
  sect: Sect | null;

  @Column({ type: 'enum', enum: SubSect, nullable: true })
  subSect: SubSect | null;

  @Column({ type: 'enum', enum: Diet, nullable: true })
  diet: Diet | null;

  // --- Decoupled Partner Preferences & Profile Details ---
  @OneToOne(() => PartnerPreferences, (prefs) => prefs.user, { cascade: true })
  partnerPreferences: Relation<PartnerPreferences>;

  @OneToOne(() => ProfileDetails, (details) => details.user, { cascade: true })
  profileDetails: Relation<ProfileDetails>;

  // --- Professional & Education Details ---
  @Column({ type: 'enum', enum: EducationLevel, nullable: true })
  highestEducation: EducationLevel | null;

  @Column({ type: 'enum', enum: OccupationType, nullable: true })
  occupation: OccupationType | null;

  @Column({ type: 'varchar', nullable: true })
  organizationName: string | null;

  @Column({
    type: 'enum',
    enum: IncomeRange,
    nullable: true,
  })
  annualIncome: IncomeRange | null;

  // --- Family Details ---
  @Column({ type: 'enum', enum: FamilyType, nullable: true })
  familyType: FamilyType | null;

  // --- Location Details ---
  @Column({ type: 'varchar', nullable: true })
  city: string | null;

  @Column({ type: 'varchar', nullable: true })
  state: string | null;

  @Column({ type: 'varchar', nullable: true })
  country: string | null;

  // --- Photos & Privacy Control ---
  // Publicly visible default photo or community avatar placeholder
  @Column({ 
    type: 'varchar',
    nullable: true, 
    default: 'https://cdn.jainmatrimony.app/defaults/placeholder-avatar.png' 
  })
  defaultPhotoUrl: string;

  // Private photo gallery
  @Column({ type: 'simple-array', nullable: true })
  photoUrls: string[];

  @Column({ default: true })
  isPhotosLocked: boolean; // True = requires "Ask to View" permission to see actual gallery

  // Transient/computed field populated during dynamic photo gating
  photoRequestStatus?: PhotoRequestStatus | null;

  // --- Trust, Role & Verification ---
  @Column({ type: 'enum', enum: UserRole, default: UserRole.USER })
  role: UserRole;

  @Column({ default: false })
  isVerified: boolean; // ID / KYC Verified Badge

  @Column({
    type: 'enum',
    enum: KycStatus,
    default: KycStatus.UNSUBMITTED,
  })
  kycStatus: KycStatus;

  @Column({
    type: 'enum',
    enum: KycDocumentType,
    nullable: true,
  })
  kycDocumentType: KycDocumentType | null;

  @Column({ type: 'varchar', nullable: true, select: false })
  kycDocumentUrl: string | null;

  @Column({ type: 'text', nullable: true })
  kycRejectionReason: string | null;

  @Column({ type: 'timestamp', nullable: true })
  kycSubmittedAt: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  kycReviewedAt: Date | null;

  // Mobile Push Notification Tokens (for user and parents)
  @Column({ type: 'simple-array', nullable: true })
  fcmTokens: string[];

  // Hashed Refresh Token for rotating sessions (select: false prevents leaking in queries)
  @Column({ type: 'varchar', nullable: true, select: false })
  hashedRefreshToken: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn({ nullable: true })
  deletedAt?: Date | null;
}