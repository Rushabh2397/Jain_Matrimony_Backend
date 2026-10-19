import {
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  type Relation,
} from 'typeorm';
import { User } from '../../users/entities/user.entity.js';
import {
  ReportReason,
  ReportStatus,
} from '../../common/enums/matrimony.enum.js';

@Entity('user_reports')
export class UserReport {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  reporter: Relation<User>;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  reportedUser: Relation<User>;

  @Column({ type: 'enum', enum: ReportReason })
  reason: ReportReason;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({
    type: 'enum',
    enum: ReportStatus,
    default: ReportStatus.PENDING,
  })
  status: ReportStatus;

  @Column({ type: 'text', nullable: true })
  adminNotes: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

