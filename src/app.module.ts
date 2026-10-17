import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module.js';
import { UsersModule } from './users/users.module.js';
import { User } from './users/entities/user.entity.js';
import { PartnerPreferences } from './users/entities/partner-preferences.entity.js';

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
      entities: [User, PartnerPreferences], // Register your entities here
      synchronize: true, // Auto-creates tables in dev (turn off in production)
    }),

    // 3. Register Feature Modules
    AuthModule,
    UsersModule,
  ],
})
export class AppModule {}