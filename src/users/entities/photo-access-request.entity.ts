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
import { User } from './user.entity.js';
import { PhotoRequestStatus } from '../../common/enums/matrimony.enum.js';

@Entity('photo_access_requests')
@Unique(['requester', 'targetUser'])
export class PhotoAccessRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  requester: Relation<User>;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  targetUser: Relation<User>;

  @Column({
    type: 'enum',
    enum: PhotoRequestStatus,
    default: PhotoRequestStatus.PENDING,
  })
  status: PhotoRequestStatus;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

