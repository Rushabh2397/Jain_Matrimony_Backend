import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InterestRequest } from './entities/interest-request.entity.js';
import { Conversation } from '../chat/entities/conversation.entity.js';
import { User } from '../users/entities/user.entity.js';
import { UserBlock } from '../safety/entities/user-block.entity.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { InterestStatus } from '../common/enums/matrimony.enum.js';
import { SendInterestDto } from './dto/send-interest.dto.js';
import { RespondInterestDto } from './dto/respond-interest.dto.js';
import { TogglePhotoAccessDto } from './dto/toggle-photo-access.dto.js';

@Injectable()
export class InterestsService {
  constructor(
    @InjectRepository(InterestRequest)
    private readonly interestRepo: Repository<InterestRequest>,
    @InjectRepository(Conversation)
    private readonly conversationRepo: Repository<Conversation>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(UserBlock)
    private readonly userBlockRepo: Repository<UserBlock>,
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * Sends an interest handshake to a potential partner profile.
   */
  async sendInterest(
    senderId: string,
    receiverId: string,
    dto: SendInterestDto,
  ): Promise<InterestRequest> {
    if (senderId === receiverId) {
      throw new BadRequestException('Cannot send interest request to yourself');
    }

    const block = await this.userBlockRepo.findOne({
      where: [
        { blocker: { id: senderId }, blockedUser: { id: receiverId } },
        { blocker: { id: receiverId }, blockedUser: { id: senderId } },
      ],
    });

    if (block) {
      throw new ForbiddenException('Cannot interact with this profile');
    }

    const sender = await this.userRepo.findOne({ where: { id: senderId } });
    if (!sender) {
      throw new NotFoundException(`Sender with ID ${senderId} not found`);
    }

    const receiver = await this.userRepo.findOne({ where: { id: receiverId } });
    if (!receiver) {
      throw new NotFoundException(`Receiver with ID ${receiverId} not found`);
    }

    // Check if an interest request already exists in either direction
    const existing = await this.interestRepo.findOne({
      where: [
        { sender: { id: senderId }, receiver: { id: receiverId } },
        { sender: { id: receiverId }, receiver: { id: senderId } },
      ],
    });

    if (existing) {
      throw new ConflictException(
        'An interest request already exists between these profiles',
      );
    }

    const interest = this.interestRepo.create({
      sender,
      receiver,
      status: InterestStatus.PENDING,
      icebreakerNote: dto.icebreakerNote ?? null,
      grantPhotoAccess: dto.grantPhotoAccess ?? false,
    });

    const saved = await this.interestRepo.save(interest);

    // Fire push notification to receiver's registered devices
    await this.notificationsService.sendPushToUser(
      receiver.fcmTokens,
      'New Interest Received',
      `${sender.fullName || 'A member'} sent you an interest request!`,
      {
        type: 'INTEREST_RECEIVED',
        requestId: saved.id,
      },
    );

    return saved;
  }

  /**
   * Responds to an incoming interest request (Accept or Decline).
   * Accepting automatically unlocks a direct chat room and sends push notifications.
   */
  async respondToInterest(
    userId: string,
    requestId: string,
    dto: RespondInterestDto,
  ): Promise<{ request: InterestRequest; conversation: Conversation | null }> {
    const request = await this.interestRepo.findOne({
      where: { id: requestId },
      relations: { sender: true, receiver: true },
    });

    if (!request) {
      throw new NotFoundException(
        `Interest request with ID ${requestId} not found`,
      );
    }

    if (request.receiver.id !== userId) {
      throw new ForbiddenException(
        'You are not authorized to respond to this interest request',
      );
    }

    if (request.status !== InterestStatus.PENDING) {
      throw new BadRequestException('This interest request is no longer pending');
    }

    if (
      dto.status !== InterestStatus.ACCEPTED &&
      dto.status !== InterestStatus.DECLINED
    ) {
      throw new BadRequestException(
        'Response status must be either Accepted or Declined',
      );
    }

    request.status = dto.status;
    if (dto.grantPhotoAccess !== undefined) {
      request.grantPhotoAccess = dto.grantPhotoAccess;
    }

    const savedRequest = await this.interestRepo.save(request);
    let conversation: Conversation | null = null;

    if (dto.status === InterestStatus.ACCEPTED) {
      // Find or create Conversation between sender and receiver
      conversation = await this.conversationRepo.findOne({
        where: [
          {
            userOne: { id: request.sender.id },
            userTwo: { id: request.receiver.id },
          },
          {
            userOne: { id: request.receiver.id },
            userTwo: { id: request.sender.id },
          },
        ],
      });

      if (!conversation) {
        conversation = this.conversationRepo.create({
          userOne: request.sender,
          userTwo: request.receiver,
          isActive: true,
        });
        conversation = await this.conversationRepo.save(conversation);
      }

      // Fire push notification to the original sender
      await this.notificationsService.sendPushToUser(
        request.sender.fcmTokens,
        'Interest Accepted!',
        `${request.receiver.fullName || 'A member'} accepted your interest. You can now start chatting!`,
        {
          type: 'INTEREST_ACCEPTED',
          conversationId: conversation.id,
          requestId: request.id,
        },
      );
    }

    return {
      request: savedRequest,
      conversation,
    };
  }

  /**
   * Retrieves all incoming interest requests received by the user.
   */
  async getReceivedInterests(userId: string): Promise<InterestRequest[]> {
    return await this.interestRepo.find({
      where: { receiver: { id: userId } },
      relations: { sender: true },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Retrieves all outgoing interest requests sent by the user.
   */
  async getSentInterests(userId: string): Promise<InterestRequest[]> {
    return await this.interestRepo.find({
      where: { sender: { id: userId } },
      relations: { receiver: true },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Toggles grantPhotoAccess for an interest request sent by the user.
   */
  async togglePhotoAccess(
    userId: string,
    requestId: string,
    dto: TogglePhotoAccessDto,
  ): Promise<InterestRequest> {
    const request = await this.interestRepo.findOne({
      where: { id: requestId },
      relations: { sender: true, receiver: true },
    });

    if (!request) {
      throw new NotFoundException(`Interest request with ID ${requestId} not found`);
    }

    if (request.sender.id !== userId) {
      throw new ForbiddenException(
        'Only the sender of the interest request can toggle photo access',
      );
    }

    request.grantPhotoAccess = dto.grantPhotoAccess;
    return await this.interestRepo.save(request);
  }
}

