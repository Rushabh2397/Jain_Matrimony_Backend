import { describe, it, expect, beforeEach } from 'vitest';
import { JwtStrategy } from './strategies/jwt.strategy.js';
import { JwtAuthGuard } from './guards/jwt-auth.guard.js';
import { UserRole } from '../common/enums/matrimony.enum.js';

describe('JwtStrategy', () => {
  let jwtStrategy: JwtStrategy;

  beforeEach(() => {
    jwtStrategy = new JwtStrategy();
  });

  it('should be defined', () => {
    expect(jwtStrategy).toBeDefined();
  });

  it('should return userId and role from sub in validate', async () => {
    const payload = {
      sub: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
      role: UserRole.ADMIN,
    };

    const result = await jwtStrategy.validate(payload);

    expect(result).toEqual({
      userId: payload.sub,
      role: UserRole.ADMIN,
    });
  });

  it('should default to UserRole.USER if role is not present in payload', async () => {
    const payload = {
      sub: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
    };

    const result = await jwtStrategy.validate(payload);

    expect(result).toEqual({
      userId: payload.sub,
      role: UserRole.USER,
    });
  });
});

describe('JwtAuthGuard', () => {
  it('should be defined', () => {
    const guard = new JwtAuthGuard();
    expect(guard).toBeDefined();
  });
});
