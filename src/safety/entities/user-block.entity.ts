import {
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  Column,
  CreateDateColumn,
  Unique,
  type Relation,
} from 'typeorm';
import { User } from '../../users/entities/user.entity.js';

@Entity('user_blocks')
@Unique(['blocker', 'blockedUser'])
export class UserBlock {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  blocker: Relation<User>;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  blockedUser: Relation<User>;

  @Column({ type: 'varchar', length: 255, nullable: true })
  reason: string | null;

  @CreateDateColumn()
  createdAt: Date;
}

