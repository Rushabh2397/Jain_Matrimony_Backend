import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserBlock } from './entities/user-block.entity.js';
import { UserReport } from './entities/user-report.entity.js';
import { User } from '../users/entities/user.entity.js';
import { Conversation } from '../chat/entities/conversation.entity.js';
import { InterestRequest } from '../interests/entities/interest-request.entity.js';
import { SafetyService } from './safety.service.js';
import { SafetyController } from './safety.controller.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserBlock,
      UserReport,
      User,
      Conversation,
      InterestRequest,
    ]),
  ],
  controllers: [SafetyController],
  providers: [SafetyService],
  exports: [SafetyService, TypeOrmModule],
})
export class SafetyModule {}

