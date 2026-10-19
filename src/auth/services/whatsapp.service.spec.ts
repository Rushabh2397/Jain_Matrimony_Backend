import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BadGatewayException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WhatsAppService } from './whatsapp.service.js';

describe('WhatsAppService', () => {
  let service: WhatsAppService;
  let mockConfigService: Partial<Record<keyof ConfigService, ReturnType<typeof vi.fn>>>;

  beforeEach(() => {
    mockConfigService = {
      get: vi.fn(),
    };

    service = new WhatsAppService(mockConfigService as unknown as ConfigService);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('formatRecipientNumber', () => {
    it('should strip plus sign, spaces, and hyphens', () => {
      expect(service.formatRecipientNumber('+919876543210')).toBe('919876543210');
      expect(service.formatRecipientNumber('+91 98765-43210')).toBe('919876543210');
      expect(service.formatRecipientNumber('+1 (555) 123-4567')).toBe('15551234567');
    });
  });

  describe('sendOtp in dev / mock mode', () => {
    it('should return isMock: true when credentials are missing', async () => {
      mockConfigService.get!.mockReturnValue(undefined);

      const result = await service.sendOtp('+919876543210', '458921');

      expect(result).toEqual({
        success: true,
        isMock: true,
      });
    });
  });

  describe('sendOtp live mode', () => {
    beforeEach(() => {
      mockConfigService.get!.mockImplementation((key: string) => {
        const config: Record<string, string> = {
          WHATSAPP_API_TOKEN: 'test-meta-token',
          WHATSAPP_PHONE_NUMBER_ID: '1234567890',
          WHATSAPP_API_VERSION: 'v21.0',
          WHATSAPP_USE_TEMPLATE: 'false',
        };
        return config[key];
      });
    });

    it('should dispatch POST to Meta Graph API and return messageId on success', async () => {
      const mockFetchResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          messaging_product: 'whatsapp',
          contacts: [{ input: '919876543210', wa_id: '919876543210' }],
          messages: [{ id: 'wamid.HBgMOTE5ODc2NTQzMjEwFQIAERgSR...' }],
        }),
      };

      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockFetchResponse));

      const result = await service.sendOtp('+919876543210', '654321');

      expect(fetch).toHaveBeenCalledWith(
        'https://graph.facebook.com/v21.0/1234567890/messages',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-meta-token',
            'Content-Type': 'application/json',
          }),
        }),
      );

      expect(result).toEqual({
        success: true,
        messageId: 'wamid.HBgMOTE5ODc2NTQzMjEwFQIAERgSR...',
        isMock: false,
      });
    });

    it('should throw BadGatewayException when Meta returns an error status', async () => {
      const mockErrorResponse = {
        ok: false,
        status: 400,
        json: vi.fn().mockResolvedValue({
          error: {
            message: 'Invalid parameter: (#100) The parameter recipient is invalid',
            type: 'OAuthException',
            code: 100,
          },
        }),
      };

      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockErrorResponse));

      await expect(service.sendOtp('+919876543210', '654321')).rejects.toThrow(
        BadGatewayException,
      );
    });

    it('should send template payload when WHATSAPP_USE_TEMPLATE is true', async () => {
      mockConfigService.get!.mockImplementation((key: string) => {
        const config: Record<string, string> = {
          WHATSAPP_API_TOKEN: 'test-meta-token',
          WHATSAPP_PHONE_NUMBER_ID: '1234567890',
          WHATSAPP_USE_TEMPLATE: 'true',
          WHATSAPP_TEMPLATE_NAME: 'jain_matrimony_otp',
          WHATSAPP_TEMPLATE_LANGUAGE: 'en_US',
        };
        return config[key];
      });

      const mockFetchResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          messages: [{ id: 'wamid.template123' }],
        }),
      };

      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockFetchResponse));

      const result = await service.sendOtp('+919876543210', '112233');

      expect(result.messageId).toBe('wamid.template123');
      expect(fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining('"template"'),
        }),
      );
    });
  });
});

