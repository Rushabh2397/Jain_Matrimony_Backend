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
import { User } from './user.entity.js';

@Entity('profile_details')
export class ProfileDetails {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // --- Bio & Lifestyle ---
  @Column({ type: 'text', nullable: true })
  bio: string | null;

  @Column({ type: 'simple-array', nullable: true })
  hobbies: string[] | null;

  @Column({ type: 'int', nullable: true })
  heightCm: number | null;

  @Column({ type: 'simple-array', nullable: true })
  languagesKnown: string[] | null;

  // --- Shwetambar Jain Cultural & Family Details ---
  @Column({ type: 'varchar', nullable: true })
  gotra: string | null;

  @Column({ type: 'varchar', nullable: true })
  nativePlace: string | null;

  @Column({ type: 'varchar', nullable: true })
  mosal: string | null;

  @Column({ type: 'varchar', nullable: true })
  fatherName: string | null;

  @Column({ type: 'varchar', nullable: true })
  fatherOccupation: string | null;

  @Column({ type: 'varchar', nullable: true })
  motherName: string | null;

  @Column({ type: 'varchar', nullable: true })
  motherOccupation: string | null;

  @Column({ type: 'int', default: 0 })
  brothersCount: number;

  @Column({ type: 'int', default: 0 })
  marriedBrothersCount: number;

  @Column({ type: 'int', default: 0 })
  sistersCount: number;

  @Column({ type: 'int', default: 0 })
  marriedSistersCount: number;

  // --- Astrology / Kundli Details (Optional) ---
  @Column({ type: 'varchar', nullable: true })
  timeOfBirth: string | null;

  @Column({ type: 'varchar', nullable: true })
  placeOfBirth: string | null;

  // --- Relation & Timestamps ---
  @OneToOne(() => User, (user) => user.profileDetails, { onDelete: 'CASCADE' })
  @JoinColumn()
  user: Relation<User>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

