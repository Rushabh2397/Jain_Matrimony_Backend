import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InterestRequest } from './entities/interest-request.entity.js';
import { Conversation } from '../chat/entities/conversation.entity.js';
import { User } from '../users/entities/user.entity.js';
import { UserBlock } from '../safety/entities/user-block.entity.js';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { InterestsService } from './interests.service.js';
import { InterestsController } from './interests.controller.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      InterestRequest,
      Conversation,
      User,
      UserBlock,
    ]),
    NotificationsModule,
    AuthModule,
  ],
  controllers: [InterestsController],
  providers: [InterestsService],
  exports: [InterestsService],
})
export class InterestsModule {}

