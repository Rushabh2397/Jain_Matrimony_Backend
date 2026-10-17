import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UserRole } from '../../common/enums/matrimony.enum.js';

export interface JwtPayload {
  sub: string;
  role?: UserRole;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'super-secret-jain-matrimony-key',
    });
  }

  async validate(payload: JwtPayload): Promise<{ userId: string; role: UserRole }> {
    return {
      userId: payload.sub,
      role: payload.role ?? UserRole.USER,
    };
  }
}
