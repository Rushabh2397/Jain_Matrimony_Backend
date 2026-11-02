import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { Logger } from '@nestjs/common';
import { ChatService } from './chat.service.js';

@WebSocketGateway({
  namespace: '/chat',
  cors: { origin: '*' },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(ChatGateway.name);

  @WebSocketServer()
  server: Server;

  constructor(
    private readonly jwtService: JwtService,
    private readonly chatService: ChatService,
  ) {}

  /**
   * Authenticates connecting WebSocket clients via JWT and joins their personal inbox room.
   */
  async handleConnection(client: Socket): Promise<void> {
    try {
      const authHeader = client.handshake.headers?.authorization;
      const bearerToken =
        authHeader && authHeader.startsWith('Bearer ')
          ? authHeader.split(' ')[1]
          : undefined;
      const token = client.handshake.auth?.token || bearerToken;

      if (!token) {
        this.logger.warn(`Client ${client.id} connected without token. Disconnecting.`);
        client.disconnect();
        return;
      }

      const payload = await this.jwtService.verifyAsync(token, {
        secret: process.env.JWT_SECRET || 'super-secret-jain-matrimony-key',
      });

      client.data.userId = payload.sub;
      await client.join(`user_${payload.sub}`);
      this.logger.log(`Client ${client.id} authenticated for user ${payload.sub}`);
    } catch (error: any) {
      this.logger.warn(
        `Client ${client.id} failed JWT verification: ${error.message}. Disconnecting.`,
      );
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket): void {
    this.logger.log(`Client ${client.id} disconnected`);
  }

  /**
   * Sends a new message to everyone in the conversation room and to the recipient's inbox.
   * Socket.IO de-duplicates across the two rooms, so a client in both gets it once.
   */
  broadcastMessage(conversationId: string, message: { recipientId: string }): void {
    this.server.to(`conv_${conversationId}`).to(`user_${message.recipientId}`).emit('newMessage', message);
  }

  /**
   * Joins a specific conversation chat room after verifying participant access.
   */
  @SubscribeMessage('joinConversation')
  async handleJoinConversation(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { conversationId: string },
  ): Promise<{ event: string; conversationId: string } | undefined> {
    const userId = client.data.userId;
    if (!userId || !payload?.conversationId) return;

    try {
      // Verifies participation (throws ForbiddenException if unauthorized)
      await this.chatService.getConversationMessages(
        userId,
        payload.conversationId,
        1,
        0,
      );
      await client.join(`conv_${payload.conversationId}`);
      return { event: 'joinedConversation', conversationId: payload.conversationId };
    } catch (error: any) {
      this.logger.warn(
        `User ${userId} failed to join room conv_${payload.conversationId}: ${error.message}`,
      );
      return undefined;
    }
  }

  /**
   * Handles real-time message sending, saving to DB and broadcasting to room & recipient.
   */
  @SubscribeMessage('sendMessage')
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { conversationId: string; content: string },
  ) {
    const userId = client.data.userId;
    if (!userId || !payload?.conversationId || !payload?.content) return;

    try {
      const result = await this.chatService.sendMessage(
        userId,
        payload.conversationId,
        payload.content,
      );

      this.broadcastMessage(payload.conversationId, result);

      return result;
    } catch (error: any) {
      this.logger.error(`Error sending socket message: ${error.message}`);
      return { error: error.message };
    }
  }

  /**
   * Marks unread messages as read and broadcasts read receipt to the conversation room.
   */
  @SubscribeMessage('markRead')
  async handleMarkRead(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { conversationId: string },
  ): Promise<{ success: boolean } | undefined> {
    const userId = client.data.userId;
    if (!userId || !payload?.conversationId) return;

    try {
      await this.chatService.markMessagesAsRead(userId, payload.conversationId);

      this.server.to(`conv_${payload.conversationId}`).emit('messagesRead', {
        conversationId: payload.conversationId,
        readBy: userId,
      });

      return { success: true };
    } catch (error: any) {
      this.logger.warn(`Error marking messages as read via socket: ${error.message}`);
      return undefined;
    }
  }
}

