import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module.js';
import { UsersModule } from './users/users.module.js';
import { MatchesModule } from './matches/matches.module.js';
import { NotificationsModule } from './notifications/notifications.module.js';
import { InterestsModule } from './interests/interests.module.js';
import { ChatModule } from './chat/chat.module.js';
import { User } from './users/entities/user.entity.js';
import { PartnerPreferences } from './users/entities/partner-preferences.entity.js';
import { ProfileDetails } from './users/entities/profile-details.entity.js';
import { Conversation } from './chat/entities/conversation.entity.js';
import { Message } from './chat/entities/message.entity.js';
import { InterestRequest } from './interests/entities/interest-request.entity.js';
import { PhotoAccessRequest } from './users/entities/photo-access-request.entity.js';
import { UserBlock } from './safety/entities/user-block.entity.js';
import { UserReport } from './safety/entities/user-report.entity.js';
import { SafetyModule } from './safety/safety.module.js';
import { MediaModule } from './media/media.module.js';

@Module({
  imports: [
    // 1. Load environment variables globally (.env)
    ConfigModule.forRoot({ isGlobal: true }),

    // 2. Setup PostgreSQL database connection via TypeORM
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DATABASE_HOST || 'localhost',
      port: parseInt(process.env.DATABASE_PORT ?? '5432', 10),
      username: process.env.DATABASE_USER || 'postgres',
      password: process.env.DATABASE_PASSWORD || 'password',
      database: process.env.DATABASE_NAME || 'jain_matrimony',
      entities: [
        User,
        PartnerPreferences,
        ProfileDetails,
        Conversation,
        Message,
        InterestRequest,
        PhotoAccessRequest,
        UserBlock,
        UserReport,
      ], // Register your entities here
      autoLoadEntities: true, // Automatically loads entities registered via forFeature
      synchronize: true, // Auto-creates tables in dev (turn off in production)
    }),

    // 3. Register Feature Modules
    AuthModule,
    UsersModule,
    MatchesModule,
    NotificationsModule,
    InterestsModule,
    ChatModule,
    SafetyModule,
    MediaModule,
  ],
})
export class AppModule {}