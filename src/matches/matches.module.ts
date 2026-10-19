import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/entities/user.entity.js';
import { PartnerPreferences } from '../users/entities/partner-preferences.entity.js';
import { PhotoAccessRequest } from '../users/entities/photo-access-request.entity.js';
import { InterestRequest } from '../interests/entities/interest-request.entity.js';
import { UserBlock } from '../safety/entities/user-block.entity.js';
import { MatchesService } from './matches.service.js';
import { MatchesController } from './matches.controller.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      PartnerPreferences,
      InterestRequest,
      PhotoAccessRequest,
      UserBlock,
    ]),
  ],
  controllers: [MatchesController],
  providers: [MatchesService],
  exports: [MatchesService],
})
export class MatchesModule {}

