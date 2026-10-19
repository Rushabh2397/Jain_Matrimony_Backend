import {
  Injectable,
  Logger,
  BadGatewayException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface WhatsAppSendResult {
  success: boolean;
  messageId?: string;
  isMock?: boolean;
}

@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);

  constructor(private readonly configService: ConfigService) {}

  /**
   * Formats an E.164 phone number for WhatsApp Cloud API.
   * WhatsApp expects country code + number with NO leading plus sign or non-digit chars.
   * Example: '+91 98765-43210' -> '919876543210'
   */
  formatRecipientNumber(phoneNumber: string): string {
    return phoneNumber.replace(/\D/g, '');
  }

  /**
   * Sends an OTP to the recipient via WhatsApp Cloud API (Meta Graph API).
   * Gracefully falls back to mock delivery if credentials are not configured in dev.
   */
  async sendOtp(phoneNumber: string, otp: string): Promise<WhatsAppSendResult> {
    const apiToken = this.configService.get<string>('WHATSAPP_API_TOKEN');
    const phoneNumberId = this.configService.get<string>('WHATSAPP_PHONE_NUMBER_ID');
    const apiVersion = this.configService.get<string>('WHATSAPP_API_VERSION') || 'v21.0';
    const templateName = this.configService.get<string>('WHATSAPP_TEMPLATE_NAME') || 'jain_matrimony_otp';
    const templateLanguage = this.configService.get<string>('WHATSAPP_TEMPLATE_LANGUAGE') || 'en_US';
    const useTemplate = this.configService.get<string>('WHATSAPP_USE_TEMPLATE') === 'true';

    const formattedRecipient = this.formatRecipientNumber(phoneNumber);

    // Development / Mock mode if Meta credentials are not provided
    if (!apiToken || !phoneNumberId) {
      this.logger.warn(
        `[DEV MODE] WhatsApp Cloud API credentials missing (WHATSAPP_API_TOKEN / WHATSAPP_PHONE_NUMBER_ID). Mocking delivery to ${phoneNumber} (${formattedRecipient}): OTP = ${otp}`,
      );
      return {
        success: true,
        isMock: true,
      };
    }

    const url = `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`;

    // Construct WhatsApp Cloud API payload
    let payload: Record<string, any>;

    if (useTemplate) {
      // Official WhatsApp Authentication / Utility Template format
      payload = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: formattedRecipient,
        type: 'template',
        template: {
          name: templateName,
          language: { code: templateLanguage },
          components: [
            {
              type: 'body',
              parameters: [{ type: 'text', text: otp }],
            },
            {
              type: 'button',
              sub_type: 'url',
              index: '0',
              parameters: [{ type: 'text', text: otp }],
            },
          ],
        },
      };
    } else {
      // Direct Text Message format (requires active user-initiated 24h window or sandbox)
      payload = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: formattedRecipient,
        type: 'text',
        text: {
          body: `*Shwetambar Jain Matrimony*\n\nYour login verification code is: *${otp}*\n\nValid for 5 minutes. Do not share this code with anyone. 🙏`,
        },
      };
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const responseData = await response.json();

      if (!response.ok) {
        this.logger.error(
          `WhatsApp Cloud API error (${response.status}): ${JSON.stringify(responseData)}`,
        );
        const errorMessage =
          responseData?.error?.message ||
          'Failed to send OTP via WhatsApp Cloud API';
        throw new BadGatewayException(`WhatsApp Gateway Error: ${errorMessage}`);
      }

      const messageId = responseData?.messages?.[0]?.id;
      this.logger.log(
        `WhatsApp OTP successfully dispatched to ${formattedRecipient}. Message ID: ${messageId}`,
      );

      return {
        success: true,
        messageId,
        isMock: false,
      };
    } catch (error: any) {
      if (error instanceof BadGatewayException) {
        throw error;
      }
      this.logger.error(`Network or unexpected error sending WhatsApp OTP: ${error.message}`);
      throw new BadGatewayException(
        `Unable to reach WhatsApp Gateway: ${error.message}`,
      );
    }
  }
}

