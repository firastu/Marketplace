import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";
import { Conversation } from "./conversation.entity";
import { Message } from "./message.entity";
import { Listing } from "../listings/listing.entity";
import { ListingImage } from "../listings/listing-image.entity";
import { MessagesGateway } from "./messages.gateway";
import { isUniqueViolation } from "../../common/database-exception.filter";

const CONTACTABLE_STATUSES = ["active", "reserved"];

@Injectable()
export class MessagesService {
  constructor(
    @InjectRepository(Conversation)
    private readonly convRepo: Repository<Conversation>,
    @InjectRepository(Message)
    private readonly msgRepo: Repository<Message>,
    @InjectRepository(Listing)
    private readonly listingRepo: Repository<Listing>,
    @InjectRepository(ListingImage)
    private readonly imageRepo: Repository<ListingImage>,
    private readonly gateway: MessagesGateway,
  ) {}

  async getMyConversations(userId: string) {
    const conversations = await this.convRepo.find({
      where: [{ buyerId: userId }, { sellerId: userId }],
      relations: ["listing", "buyer", "seller"],
      order: { lastMessageAt: "DESC" },
      // Keep showing chats whose listing was deleted; the client can check
      // listing.deletedAt to label them.
      withDeleted: true,
    });
    if (conversations.length === 0) return [];

    // One grouped query instead of one COUNT per conversation.
    const rows: { conversationId: string; count: string }[] = await this.msgRepo
      .createQueryBuilder("m")
      .select("m.conversation_id", "conversationId")
      .addSelect("COUNT(*)", "count")
      .where("m.conversation_id IN (:...ids)", {
        ids: conversations.map((c) => c.id),
      })
      .andWhere("m.sender_id != :userId", { userId })
      .andWhere("m.is_read = false")
      .groupBy("m.conversation_id")
      .getRawMany();
    const unread = new Map(
      rows.map((r) => [r.conversationId, Number(r.count)]),
    );

    const ids = conversations.map((c) => c.id);

    // Latest message per conversation, for the inbox preview.
    const lastRows: {
      conversation_id: string;
      body: string;
      sender_id: string;
      created_at: Date;
    }[] = await this.msgRepo.query(
      `SELECT DISTINCT ON (conversation_id)
              conversation_id, body, sender_id, created_at
         FROM messages
        WHERE conversation_id = ANY($1)
        ORDER BY conversation_id, created_at DESC`,
      [ids],
    );
    const lastMessages = new Map(
      lastRows.map((r) => [
        r.conversation_id,
        {
          body: r.body.length > 140 ? `${r.body.slice(0, 140)}…` : r.body,
          senderId: r.sender_id,
          createdAt: r.created_at,
        },
      ]),
    );

    // Cover photo of each listing that still exists (deleted images are
    // excluded by @DeleteDateColumn).
    const liveListingIds = [
      ...new Set(
        conversations
          .filter((c) => c.listing && !c.listing.deletedAt)
          .map((c) => c.listingId),
      ),
    ];
    const covers = new Map<string, ListingImage>();
    if (liveListingIds.length > 0) {
      const images = await this.imageRepo.find({
        where: { listingId: In(liveListingIds) },
        order: { isPrimary: "DESC", sortOrder: "ASC" },
      });
      for (const image of images) {
        if (!covers.has(image.listingId)) covers.set(image.listingId, image);
      }
    }

    return conversations.map((conv) => {
      const cover = covers.get(conv.listingId);
      return {
        ...conv,
        listing: conv.listing
          ? { ...conv.listing, images: cover ? [cover] : [] }
          : conv.listing,
        unreadCount: unread.get(conv.id) ?? 0,
        lastMessage: lastMessages.get(conv.id) ?? null,
      };
    });
  }

  async getConversationMessages(
    conversationId: string,
    userId: string,
  ): Promise<Message[]> {
    const conv = await this.convRepo.findOne({
      where: { id: conversationId },
    });
    if (!conv) throw new NotFoundException("Conversation not found");
    this.assertParticipant(conv, userId);

    await this.markRead(conversationId, userId);

    return this.msgRepo.find({
      where: { conversationId },
      relations: ["sender"],
      order: { createdAt: "ASC" },
    });
  }

  /**
   * Marks the other participant's messages as read. Used when a message
   * arrives while the chat is already open (no need to reload the thread).
   */
  async markConversationRead(
    conversationId: string,
    userId: string,
  ): Promise<{ updated: number }> {
    const conv = await this.convRepo.findOne({
      where: { id: conversationId },
    });
    if (!conv) throw new NotFoundException("Conversation not found");
    this.assertParticipant(conv, userId);
    return { updated: await this.markRead(conversationId, userId) };
  }

  private async markRead(
    conversationId: string,
    userId: string,
  ): Promise<number> {
    const result = await this.msgRepo
      .createQueryBuilder()
      .update(Message)
      .set({ isRead: true })
      .where(
        "conversation_id = :conversationId AND sender_id != :userId AND is_read = false",
        { conversationId, userId },
      )
      .execute();
    const updated = result.affected ?? 0;
    // The header badge only refreshes on this event; without it the count
    // stayed stale after reading until the next page load.
    if (updated > 0) this.gateway.emitUnreadCountChanged(userId);
    return updated;
  }

  async startConversation(
    buyerId: string,
    listingId: string,
    body: string,
  ): Promise<{ conversation: Conversation; message: Message }> {
    const listing = await this.listingRepo.findOne({
      where: { id: listingId },
      relations: ["user"],
    });
    if (!listing || !listing.user?.isActive) {
      throw new NotFoundException("Listing not found");
    }
    if (listing.userId === buyerId) {
      throw new BadRequestException("Cannot message yourself");
    }

    let conv = await this.convRepo.findOne({
      where: { listingId, buyerId, sellerId: listing.userId },
    });

    // New conversations only for listings that are still available. An
    // existing conversation can continue even if the listing changed.
    if (!conv && !CONTACTABLE_STATUSES.includes(listing.status)) {
      throw new BadRequestException(
        "This listing is no longer available for new enquiries",
      );
    }

    if (!conv) {
      const where = { listingId, buyerId, sellerId: listing.userId };
      try {
        conv = await this.convRepo.save(
          this.convRepo.create({ ...where, lastMessageAt: new Date() }),
        );
      } catch (err) {
        // Two simultaneous first messages (double tap): the other request
        // created the conversation in the meantime, so use that one.
        if (!isUniqueViolation(err)) throw err;
        conv = await this.convRepo.findOneOrFail({ where });
      }
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
    if (!conv) throw new NotFoundException("Conversation not found");
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
      relations: ["sender"],
    });
    if (!fullMessage) {
      throw new NotFoundException("Created message could not be loaded");
    }
    // Determine recipient and emit in real time
    const recipientId =
      conv.buyerId === senderId ? conv.sellerId : conv.buyerId;
    this.gateway.emitNewMessage(conversationId, fullMessage, recipientId);

    return fullMessage || saved;
  }

  private assertParticipant(conv: Conversation, userId: string): void {
    if (conv.buyerId !== userId && conv.sellerId !== userId) {
      throw new ForbiddenException("Not a participant of this conversation");
    }
  }

  async getUnreadCount(userId: string): Promise<{ count: number }> {
    const count = await this.msgRepo
      .createQueryBuilder("m")
      .innerJoin("m.conversation", "c")
      .where("(c.buyer_id = :userId OR c.seller_id = :userId)", { userId })
      .andWhere("m.sender_id != :userId", { userId })
      .andWhere("m.is_read = false")
      .getCount();
    return { count };
  }
}
