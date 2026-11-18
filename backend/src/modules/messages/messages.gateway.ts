import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
} from "@nestjs/websockets";
import { Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Server, Socket } from "socket.io";
import { JwtService } from "@nestjs/jwt";
import { Message } from "./message.entity";
import { Conversation } from "./conversation.entity";
import { User } from "../users/user.entity";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type AuthedSocket = Socket & { data: { userId?: string } };

export type JoinResult = { ok: true } | { ok: false; error: string };

// CORS for Socket.IO is configured in main.ts (CorsIoAdapter) from the same
// CORS_ORIGINS allowlist as the REST API.
@WebSocketGateway({ namespace: "/chat" })
export class MessagesGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(MessagesGateway.name);

  @WebSocketServer()
  server: Server;

  constructor(
    private readonly jwtService: JwtService,
    @InjectRepository(Conversation)
    private readonly convRepo: Repository<Conversation>,
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
  ) {}

  /* ── connection lifecycle ───────────────────────────── */

  async handleConnection(client: AuthedSocket) {
    try {
      const token =
        (client.handshake.auth?.token as string) ||
        (client.handshake.headers?.authorization as string)?.replace(
          "Bearer ",
          "",
        );
      if (!token) {
        client.disconnect(true);
        return;
      }

      const payload = this.jwtService.verify<{ sub: string }>(token);
      const user = await this.usersRepo.findOne({
        where: { id: payload.sub },
      });
      if (!user || !user.isActive) {
        client.disconnect(true);
        return;
      }

      client.data.userId = user.id;
      await client.join(`user:${user.id}`);
    } catch {
      client.disconnect(true);
    }
  }

  handleDisconnect() {
    // Socket.IO removes the socket from its rooms automatically.
  }

  /* ── client events ──────────────────────────────────── */

  /**
   * Client joins a conversation room to receive live messages. Only the
   * buyer and seller of that conversation may join; previously any logged-in
   * user could subscribe to any conversation by ID.
   */
  @SubscribeMessage("joinConversation")
  async handleJoinConversation(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() data: { conversationId?: unknown },
  ): Promise<JoinResult> {
    const userId = client.data.userId;
    const conversationId = data?.conversationId;
    if (!userId) return { ok: false, error: "Not authenticated" };
    if (typeof conversationId !== "string" || !UUID_RE.test(conversationId)) {
      return { ok: false, error: "Invalid conversation ID" };
    }

    const conv = await this.convRepo.findOne({
      where: { id: conversationId },
    });
    if (!conv || (conv.buyerId !== userId && conv.sellerId !== userId)) {
      this.logger.warn(
        `User ${userId} tried to join conversation ${conversationId} without being a participant`,
      );
      return { ok: false, error: "Conversation not found" };
    }

    await client.join(`conversation:${conversationId}`);
    return { ok: true };
  }

  /** Client leaves a conversation room */
  @SubscribeMessage("leaveConversation")
  async handleLeaveConversation(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() data: { conversationId?: unknown },
  ) {
    if (typeof data?.conversationId === "string") {
      await client.leave(`conversation:${data.conversationId}`);
    }
    return { ok: true };
  }

  /* ── server-side emit helpers (called from service) ─── */

  /** Push a new message to all sockets in the conversation room */
  emitNewMessage(
    conversationId: string,
    message: Partial<Message>,
    recipientUserId: string,
  ) {
    // Message.sender is a User entity; its toJSON() limits it to public
    // fields when Socket.IO serialises the payload.
    this.server
      .to(`conversation:${conversationId}`)
      .emit("newMessage", message);

    this.server.to(`user:${recipientUserId}`).emit("conversationUpdated", {
      conversationId,
      lastMessageAt: message.createdAt,
    });

    this.server.to(`user:${recipientUserId}`).emit("unreadCountChanged");
  }
}
