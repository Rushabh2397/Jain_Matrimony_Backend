import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  Unique,
  type Relation,
} from 'typeorm';
import { User } from '../../users/entities/user.entity.js';
import { InterestStatus } from '../../common/enums/matrimony.enum.js';

@Entity('interest_requests')
@Unique(['sender', 'receiver'])
export class InterestRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  sender: Relation<User>;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  receiver: Relation<User>;

  @Column({
    type: 'enum',
    enum: InterestStatus,
    default: InterestStatus.PENDING,
  })
  status: InterestStatus;

  @Column({ type: 'text', nullable: true })
  icebreakerNote: string | null;

  @Column({ default: false })
  grantPhotoAccess: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

