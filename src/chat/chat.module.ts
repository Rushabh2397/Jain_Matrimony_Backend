import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { Conversation } from './entities/conversation.entity.js';
import { Message } from './entities/message.entity.js';
import { User } from '../users/entities/user.entity.js';
import { AuthModule } from '../auth/auth.module.js';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { ChatService } from './chat.service.js';
import { ChatController } from './chat.controller.js';
import { ChatGateway } from './chat.gateway.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([Conversation, Message, User]),
    AuthModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'super-secret-jain-matrimony-key',
      signOptions: { expiresIn: '7d' },
    }),
    NotificationsModule,
  ],
  controllers: [ChatController],
  providers: [ChatService, ChatGateway],
  exports: [ChatService, ChatGateway],
})
export class ChatModule {}

