import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
} from "@nestjs/websockets";
import { Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Namespace, Socket } from "socket.io";
import { JwtService } from "@nestjs/jwt";
import { Message } from "./message.entity";
import { Conversation } from "./conversation.entity";
import { User } from "../users/user.entity";
import { isTokenCurrent } from "../auth/token-validity";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type AuthedSocket = Socket & { data: { userId?: string } };

export type JoinResult = { ok: true } | { ok: false; error: string };

// CORS for Socket.IO is configured in main.ts (CorsIoAdapter) from the same
// CORS_ORIGINS allowlist as the REST API.
@WebSocketGateway({ namespace: "/chat" })
export class MessagesGateway implements OnGatewayInit {
  private readonly logger = new Logger(MessagesGateway.name);

  // The gateway is bound to the /chat namespace, so this is a Namespace.
  @WebSocketServer()
  server: Namespace;

  constructor(
    private readonly jwtService: JwtService,
    @InjectRepository(Conversation)
    private readonly convRepo: Repository<Conversation>,
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
  ) {}

  /* ── connection lifecycle ───────────────────────────── */

  /**
   * Authenticates in a namespace middleware, i.e. before the connection is
   * established. Doing it in handleConnection() was a race: Socket.IO
   * reports "connected" to the client first, and the client's buffered
   * joinConversation could be handled while the user lookup was still
   * running — answered "Not authenticated", leaving the chat without live
   * updates. A rejected client now gets a connect_error instead.
   */
  afterInit(server: Namespace) {
    server.use((socket, next) => {
      this.authenticate(socket as AuthedSocket).then(
        () => next(),
        () => next(new Error("Unauthorized")),
      );
    });
  }

  private async authenticate(client: AuthedSocket): Promise<void> {
    const header = client.handshake.headers?.authorization;
    const token =
      (client.handshake.auth?.token as string | undefined) ||
      (typeof header === "string" ? header.replace(/^Bearer /i, "") : "");
    if (!token || typeof token !== "string") throw new Error("No token");

    const payload = this.jwtService.verify<{ sub: string; tv?: number }>(token);
    const user = await this.usersRepo.findOne({ where: { id: payload.sub } });
    if (!isTokenCurrent(user, payload.tv)) {
      throw new Error("Session expired or account unavailable");
    }

    client.data.userId = user.id;
    await client.join(`user:${user.id}`);
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

  /** Tell a user's open tabs to refresh their unread badge. */
  emitUnreadCountChanged(userId: string) {
    this.server.to(`user:${userId}`).emit("unreadCountChanged");
  }

  /** Close every open socket of a user (account deleted or suspended). */
  disconnectUser(userId: string) {
    this.server?.in(`user:${userId}`).disconnectSockets(true);
  }
}
