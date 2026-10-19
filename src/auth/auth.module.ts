import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service.js';
import { AuthController } from './auth.controller.js';
import { UsersModule } from '../users/users.module.js';
import { JwtStrategy } from './strategies/jwt.strategy.js';
import { JwtAuthGuard } from './guards/jwt-auth.guard.js';
import { WhatsAppService } from './services/whatsapp.service.js';
import { OtpService } from './services/otp.service.js';

@Module({
  imports: [
    UsersModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'super-secret-jain-matrimony-key',
      signOptions: { expiresIn: '7d' }, // Token valid for 7 days
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, JwtAuthGuard, WhatsAppService, OtpService],
  exports: [AuthService, JwtAuthGuard, PassportModule, JwtModule, WhatsAppService, OtpService],
})
export class AuthModule {}