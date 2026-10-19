import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ChatController } from './chat.controller.js';
import { ChatService, SendMessageResult } from './chat.service.js';
import { ActiveUserData } from '../common/decorators/current-user.decorator.js';
import { Conversation } from './entities/conversation.entity.js';
import { Message } from './entities/message.entity.js';

describe('ChatController', () => {
  let controller: ChatController;
  let mockChatService: Partial<Record<keyof ChatService, ReturnType<typeof vi.fn>>>;

  const mockActiveUser: ActiveUserData = {
    userId: '11111111-1111-1111-1111-111111111111',
  };

  beforeEach(() => {
    mockChatService = {
      getUserConversations: vi.fn(),
      getConversationMessages: vi.fn(),
      sendMessage: vi.fn(),
      markMessagesAsRead: vi.fn(),
    };

    controller = new ChatController(mockChatService as unknown as ChatService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getConversations (GET /chat/conversations)', () => {
    it('should call chatService.getUserConversations with active userId', async () => {
      const mockConversations = [{ id: 'c1' } as Conversation];
      mockChatService.getUserConversations!.mockResolvedValue(mockConversations);

      const result = await controller.getConversations(mockActiveUser);

      expect(mockChatService.getUserConversations).toHaveBeenCalledWith(
        mockActiveUser.userId,
      );
      expect(result).toEqual(mockConversations);
    });
  });

  describe('getMessages (GET /chat/conversations/:id/messages)', () => {
    it('should call chatService.getConversationMessages with parsed pagination', async () => {
      const convId = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
      const mockMessages = [{ id: 'm1' } as Message];
      mockChatService.getConversationMessages!.mockResolvedValue(mockMessages);

      const result = await controller.getMessages(
        mockActiveUser,
        convId,
        '30',
        '10',
      );

      expect(mockChatService.getConversationMessages).toHaveBeenCalledWith(
        mockActiveUser.userId,
        convId,
        30,
        10,
      );
      expect(result).toEqual(mockMessages);
    });
  });

  describe('sendMessage (POST /chat/messages)', () => {
    it('should call chatService.sendMessage with dto parameters', async () => {
      const dto = {
        conversationId: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
        content: 'Jai Jinendra',
      };
      const mockResult = {
        id: 'msg-1',
        content: 'Jai Jinendra',
        recipientId: 'recipient-123',
      } as SendMessageResult;

      mockChatService.sendMessage!.mockResolvedValue(mockResult);

      const result = await controller.sendMessage(mockActiveUser, dto);

      expect(mockChatService.sendMessage).toHaveBeenCalledWith(
        mockActiveUser.userId,
        dto.conversationId,
        dto.content,
      );
      expect(result).toEqual(mockResult);
    });
  });

  describe('markAsRead (PATCH /chat/conversations/:id/read)', () => {
    it('should call chatService.markMessagesAsRead and return success', async () => {
      const convId = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
      mockChatService.markMessagesAsRead!.mockResolvedValue(undefined);

      const result = await controller.markAsRead(mockActiveUser, convId);

      expect(mockChatService.markMessagesAsRead).toHaveBeenCalledWith(
        mockActiveUser.userId,
        convId,
      );
      expect(result).toEqual({ success: true });
    });
  });
});

