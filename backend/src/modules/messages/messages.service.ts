import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Conversation } from './conversation.entity';
import { Message } from './message.entity';
import { Listing } from '../listings/listing.entity';
import { MessagesGateway } from './messages.gateway';

@Injectable()
export class MessagesService {
  constructor(
    @InjectRepository(Conversation)
    private readonly convRepo: Repository<Conversation>,
    @InjectRepository(Message)
    private readonly msgRepo: Repository<Message>,
    @InjectRepository(Listing)
    private readonly listingRepo: Repository<Listing>,
    private readonly gateway: MessagesGateway,
  ) {}

  async getMyConversations(userId: string): Promise<any[]> {
    const conversations = await this.convRepo.find({
      where: [{ buyerId: userId }, { sellerId: userId }],
      relations: ['listing', 'buyer', 'seller'],
      order: { lastMessageAt: 'DESC' },
    });

    // Attach unread count per conversation
    const results = await Promise.all(
      conversations.map(async (conv) => {
        const unreadCount = await this.msgRepo
          .createQueryBuilder('m')
          .where('m.conversation_id = :convId', { convId: conv.id })
          .andWhere('m.sender_id != :userId', { userId })
          .andWhere('m.is_read = false')
          .getCount();
        return { ...conv, unreadCount };
      }),
    );
    return results;
  }

  async getConversationMessages(
    conversationId: string,
    userId: string,
  ): Promise<Message[]> {
    const conv = await this.convRepo.findOne({
      where: { id: conversationId },
    });
    if (!conv) throw new NotFoundException('Conversation not found');
    this.assertParticipant(conv, userId);

    // Mark unread messages as read
    await this.msgRepo
      .createQueryBuilder()
      .update(Message)
      .set({ isRead: true })
      .where('conversation_id = :conversationId AND sender_id != :userId AND is_read = false', {
        conversationId,
        userId,
      })
      .execute();

    return this.msgRepo.find({
      where: { conversationId },
      relations: ['sender'],
      order: { createdAt: 'ASC' },
    });
  }

  async startConversation(
    buyerId: string,
    listingId: string,
    body: string,
  ): Promise<{ conversation: Conversation; message: Message }> {
    const listing = await this.listingRepo.findOne({ where: { id: listingId } });
    if (!listing) throw new NotFoundException('Listing not found');
    if (listing.userId === buyerId) {
      throw new BadRequestException('Cannot message yourself');
    }

    // Check if conversation already exists
    let conv = await this.convRepo.findOne({
      where: { listingId, buyerId, sellerId: listing.userId },
    });

    if (!conv) {
      conv = this.convRepo.create({
        listingId,
        buyerId,
        sellerId: listing.userId,
        lastMessageAt: new Date(),
      });
      conv = await this.convRepo.save(conv);
    }

    const message = await this.sendMessage(conv.id, buyerId, body);
    return { conversation: conv, message };
  }

  async sendMessage(
    conversationId: string,
    senderId: string,
    body: string,
  ): Promise<Message> {
    const conv = await this.convRepo.findOne({
      where: { id: conversationId },
    });
    if (!conv) throw new NotFoundException('Conversation not found');
    this.assertParticipant(conv, senderId);

    const message = this.msgRepo.create({
      conversationId,
      senderId,
      body,
    });
    const saved = await this.msgRepo.save(message);

    await this.convRepo.update(conversationId, { lastMessageAt: new Date() });

    // Load sender relation for the WebSocket payload
    const fullMessage = await this.msgRepo.findOne({
      where: { id: saved.id },
      relations: ['sender'],
    });

    // Determine recipient and emit in real time
    const recipientId =
      conv.buyerId === senderId ? conv.sellerId : conv.buyerId;
    this.gateway.emitNewMessage(conversationId, fullMessage, recipientId);

    return fullMessage || saved;
  }

  private assertParticipant(conv: Conversation, userId: string): void {
    if (conv.buyerId !== userId && conv.sellerId !== userId) {
      throw new ForbiddenException('Not a participant of this conversation');
    }
  }

  async getUnreadCount(userId: string): Promise<{ count: number }> {
    const count = await this.msgRepo
      .createQueryBuilder('m')
      .innerJoin('m.conversation', 'c')
      .where(
        '(c.buyer_id = :userId OR c.seller_id = :userId)',
        { userId },
      )
      .andWhere('m.sender_id != :userId', { userId })
      .andWhere('m.is_read = false')
      .getCount();
    return { count };
  }
}
