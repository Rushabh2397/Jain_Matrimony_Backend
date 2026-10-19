import { describe, it, expect, vi, beforeEach } from 'vitest';
import { JwtService } from '@nestjs/jwt';
import { Socket, Server } from 'socket.io';
import { ChatGateway } from './chat.gateway.js';
import { ChatService, SendMessageResult } from './chat.service.js';

describe('ChatGateway', () => {
  let gateway: ChatGateway;
  let mockJwtService: Partial<Record<keyof JwtService, ReturnType<typeof vi.fn>>>;
  let mockChatService: Partial<Record<keyof ChatService, ReturnType<typeof vi.fn>>>;
  let mockServer: Partial<Record<keyof Server, ReturnType<typeof vi.fn>>>;
  let mockSocket: Partial<Socket>;

  const userId = '11111111-1111-1111-1111-111111111111';
  const convId = 'cccccccc-cccc-cccc-cccc-cccccccccccc';

  beforeEach(() => {
    mockJwtService = {
      verifyAsync: vi.fn(),
    };

    mockChatService = {
      getConversationMessages: vi.fn(),
      sendMessage: vi.fn(),
      markMessagesAsRead: vi.fn(),
    };

    const emitFn = vi.fn();
    mockServer = {
      to: vi.fn().mockReturnValue({ emit: emitFn }),
    };

    mockSocket = {
      id: 'socket-123',
      data: {},
      handshake: {
        auth: {},
        headers: {},
      } as any,
      join: vi.fn(),
      disconnect: vi.fn(),
    };

    gateway = new ChatGateway(
      mockJwtService as unknown as JwtService,
      mockChatService as unknown as ChatService,
    );
    gateway.server = mockServer as unknown as Server;
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });

  describe('handleConnection', () => {
    it('should authenticate client and join personal room when valid token provided', async () => {
      mockSocket.handshake!.auth = { token: 'valid-jwt' };
      mockJwtService.verifyAsync!.mockResolvedValue({ sub: userId });

      await gateway.handleConnection(mockSocket as Socket);

      expect(mockJwtService.verifyAsync).toHaveBeenCalledWith(
        'valid-jwt',
        expect.any(Object),
      );
      expect(mockSocket.data.userId).toBe(userId);
      expect(mockSocket.join).toHaveBeenCalledWith(`user_${userId}`);
      expect(mockSocket.disconnect).not.toHaveBeenCalled();
    });

    it('should disconnect client when token is missing', async () => {
      mockSocket.handshake!.auth = {};
      mockSocket.handshake!.headers = {};

      await gateway.handleConnection(mockSocket as Socket);

      expect(mockSocket.disconnect).toHaveBeenCalled();
    });

    it('should disconnect client when token verification fails', async () => {
      mockSocket.handshake!.auth = { token: 'invalid-jwt' };
      mockJwtService.verifyAsync!.mockRejectedValue(new Error('Invalid token'));

      await gateway.handleConnection(mockSocket as Socket);

      expect(mockSocket.disconnect).toHaveBeenCalled();
    });
  });

  describe('handleJoinConversation', () => {
    it('should verify access and join conversation room', async () => {
      mockSocket.data = { userId };
      mockChatService.getConversationMessages!.mockResolvedValue([]);

      const result = await gateway.handleJoinConversation(mockSocket as Socket, {
        conversationId: convId,
      });

      expect(mockChatService.getConversationMessages).toHaveBeenCalledWith(
        userId,
        convId,
        1,
        0,
      );
      expect(mockSocket.join).toHaveBeenCalledWith(`conv_${convId}`);
      expect(result).toEqual({ event: 'joinedConversation', conversationId: convId });
    });
  });

  describe('handleSendMessage', () => {
    it('should send message and broadcast to conversation room and recipient personal room', async () => {
      mockSocket.data = { userId };
      const recipientId = '22222222-2222-2222-2222-222222222222';

      const mockResult = {
        id: 'msg-1',
        content: 'Hello!',
        recipientId,
      } as SendMessageResult;

      mockChatService.sendMessage!.mockResolvedValue(mockResult);

      const result = await gateway.handleSendMessage(mockSocket as Socket, {
        conversationId: convId,
        content: 'Hello!',
      });

      expect(mockChatService.sendMessage).toHaveBeenCalledWith(
        userId,
        convId,
        'Hello!',
      );
      expect(mockServer.to).toHaveBeenCalledWith(`conv_${convId}`);
      expect(mockServer.to).toHaveBeenCalledWith(`user_${recipientId}`);
      expect(result).toEqual(mockResult);
    });
  });

  describe('handleMarkRead', () => {
    it('should mark messages as read and emit to conversation room', async () => {
      mockSocket.data = { userId };
      mockChatService.markMessagesAsRead!.mockResolvedValue(undefined);

      const result = await gateway.handleMarkRead(mockSocket as Socket, {
        conversationId: convId,
      });

      expect(mockChatService.markMessagesAsRead).toHaveBeenCalledWith(
        userId,
        convId,
      );
      expect(mockServer.to).toHaveBeenCalledWith(`conv_${convId}`);
      expect(result).toEqual({ success: true });
    });
  });
});

