import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { initializeApp, cert, getApps, type App } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';

@Injectable()
export class NotificationsService implements OnModuleInit {
  private readonly logger = new Logger(NotificationsService.name);
  private firebaseApp: App | null = null;
  private isMockMode = true;

  onModuleInit() {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

    if (projectId && clientEmail && privateKey) {
      try {
        if (getApps().length === 0) {
          this.firebaseApp = initializeApp({
            credential: cert({
              projectId,
              clientEmail,
              privateKey,
            }),
          });
        } else {
          this.firebaseApp = getApps()[0];
        }
        this.isMockMode = false;
        this.logger.log('Firebase Admin SDK initialized successfully for mobile push notifications');
      } catch (error: any) {
        this.logger.error(
          `Failed to initialize Firebase Admin SDK: ${error.message}. Running in Mock/Console mode.`,
        );
        this.isMockMode = true;
      }
    } else {
      this.logger.warn(
        '[DEV MODE] Firebase credentials (FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY) not found. Running NotificationsService in Mock/Console mode.',
      );
      this.isMockMode = true;
    }
  }

  /**
   * Sends a mobile push notification to all registered FCM device tokens for a user or their parents.
   */
  async sendPushToUser(
    fcmTokens: string[] | null | undefined,
    title: string,
    body: string,
    data?: Record<string, string>,
  ): Promise<void> {
    if (!fcmTokens || fcmTokens.length === 0) {
      return;
    }

    if (!this.isMockMode && this.firebaseApp) {
      try {
        const messaging = getMessaging(this.firebaseApp);
        const response = await messaging.sendEachForMulticast({
          tokens: fcmTokens,
          notification: { title, body },
          data,
        });
        this.logger.log(
          `Push notification sent to ${fcmTokens.length} device(s). Success: ${response.successCount}, Failures: ${response.failureCount}`,
        );
      } catch (error: any) {
        this.logger.error(`Error sending push notification via Firebase: ${error.message}`);
      }
    } else {
      console.log(
        `[PUSH NOTIFICATION] Title: "${title}" | Body: "${body}" | Tokens: [${fcmTokens.join(', ')}] | Data:`,
        data || {},
      );
    }
  }
}

