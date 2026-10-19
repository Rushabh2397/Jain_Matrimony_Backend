import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NotificationsService } from './notifications.service.js';

describe('NotificationsService', () => {
  let service: NotificationsService;
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.FIREBASE_PROJECT_ID;
    delete process.env.FIREBASE_CLIENT_EMAIL;
    delete process.env.FIREBASE_PRIVATE_KEY;

    service = new NotificationsService();
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('onModuleInit in Mock / Dev mode', () => {
    it('should run in mock mode when Firebase credentials are not provided', () => {
      service.onModuleInit();
      // Should not throw and service remains functional
      expect(service).toBeDefined();
    });

    it('should return early when fcmTokens is null, undefined, or empty', async () => {
      service.onModuleInit();
      const consoleSpy = vi.spyOn(console, 'log');

      await service.sendPushToUser(null, 'Title', 'Body');
      await service.sendPushToUser(undefined, 'Title', 'Body');
      await service.sendPushToUser([], 'Title', 'Body');

      expect(consoleSpy).not.toHaveBeenCalled();
    });

    it('should log [PUSH NOTIFICATION] payload in mock mode', async () => {
      service.onModuleInit();
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await service.sendPushToUser(
        ['token-1', 'token-2'],
        'New Match Found!',
        'A compatible profile has been discovered.',
        { matchId: '123' },
      );

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[PUSH NOTIFICATION] Title: "New Match Found!"'),
        { matchId: '123' },
      );
    });
  });
});

