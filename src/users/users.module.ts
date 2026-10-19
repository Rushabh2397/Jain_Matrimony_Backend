import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity.js';
import { PartnerPreferences } from './entities/partner-preferences.entity.js';
import { ProfileDetails } from './entities/profile-details.entity.js';
import { InterestRequest } from '../interests/entities/interest-request.entity.js';
import { PhotoAccessRequest } from './entities/photo-access-request.entity.js';
import { UserBlock } from '../safety/entities/user-block.entity.js';
import { UserReport } from '../safety/entities/user-report.entity.js';
import { Conversation } from '../chat/entities/conversation.entity.js';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { UsersService } from './users.service.js';
import { UsersController } from './users.controller.js';
import { UsersRepository } from './users.repository.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      PartnerPreferences,
      ProfileDetails,
      InterestRequest,
      PhotoAccessRequest,
      UserBlock,
      UserReport,
      Conversation,
    ]),
    NotificationsModule,
  ],
  providers: [UsersService, UsersRepository],
  controllers: [UsersController],
  exports: [UsersService, UsersRepository], 
})
export class UsersModule {}