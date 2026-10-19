import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  type Relation,
} from 'typeorm';
import { User } from '../../users/entities/user.entity.js';
import { Conversation } from './conversation.entity.js';

@Entity('messages')
export class Message {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Conversation, { onDelete: 'CASCADE' })
  conversation: Relation<Conversation>;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  sender: Relation<User>;

  @Column({ type: 'text' })
  content: string;

  @Column({ default: false })
  isRead: boolean;

  @CreateDateColumn()
  createdAt: Date;
}

