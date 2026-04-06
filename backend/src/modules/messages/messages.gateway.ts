import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { JwtService } from "@nestjs/jwt";
import { Message } from "./message.entity";

@WebSocketGateway({
  cors: { origin: true, credentials: true },
  namespace: "/chat",
})
export class MessagesGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  /** Map userId → Set of socket IDs */
  private userSockets = new Map<string, Set<string>>();

  constructor(private readonly jwtService: JwtService) {}

  /* ── connection lifecycle ───────────────────────────── */

  async handleConnection(client: Socket) {
    try {
      const token =
        (client.handshake.auth?.token as string) ||
        (client.handshake.headers?.authorization as string)?.replace(
          "Bearer ",
          "",
        );

      if (!token) {
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token);
      const userId: string = payload.sub;

      // Attach userId to socket for later use
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (client as any).userId = userId;

      // Track socket
      if (!this.userSockets.has(userId)) {
        this.userSockets.set(userId, new Set());
      }
      this.userSockets.get(userId)!.add(client.id);

      // Auto-join user's personal room
      client.join(`user:${userId}`);
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const userId = (client as any).userId as string | undefined;
    if (userId) {
      const sockets = this.userSockets.get(userId);
      if (sockets) {
        sockets.delete(client.id);
        if (sockets.size === 0) this.userSockets.delete(userId);
      }
    }
  }

  /* ── client events ──────────────────────────────────── */

  /** Client joins a conversation room to receive live messages */
  @SubscribeMessage("joinConversation")
  handleJoinConversation(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string },
  ) {
    client.join(`conversation:${data.conversationId}`);
  }

  /** Client leaves a conversation room */
  @SubscribeMessage("leaveConversation")
  handleLeaveConversation(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string },
  ) {
    client.leave(`conversation:${data.conversationId}`);
  }

  /* ── server-side emit helpers (called from service) ─── */

  /** Push a new message to all sockets in the conversation room */
  emitNewMessage(
    conversationId: string,
    message: Partial<Message>,
    recipientUserId: string,
  ) {
    // Push to everyone in the conversation room (covers open chat windows)
    this.server
      .to(`conversation:${conversationId}`)
      .emit("newMessage", message);

    // Also notify the recipient's personal room (covers the inbox page + header badge)
    this.server.to(`user:${recipientUserId}`).emit("conversationUpdated", {
      conversationId,
      lastMessageAt: message.createdAt,
    });

    // Bump unread badge for recipient
    this.server.to(`user:${recipientUserId}`).emit("unreadCountChanged");
  }
}
