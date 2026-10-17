import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';

describe('AuthController', () => {
  let controller: AuthController;
  let mockAuthService: Partial<Record<keyof AuthService, ReturnType<typeof vi.fn>>>;

  beforeEach(() => {
    mockAuthService = {
      sendOtp: vi.fn(),
      verifyOtp: vi.fn(),
    };

    controller = new AuthController(mockAuthService as unknown as AuthService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
