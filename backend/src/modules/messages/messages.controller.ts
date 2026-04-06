import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  ParseUUIDPipe,
} from "@nestjs/common";
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
} from "@nestjs/swagger";
import { MessagesService } from "./messages.service";
import { StartConversationDto, SendMessageDto } from "./dto/messages.dto";
import { CurrentUser } from "../auth/current-user.decorator";

@ApiTags("Conversations")
@ApiBearerAuth()
@Controller("conversations")
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Get()
  @ApiOperation({ summary: "Get all my conversations" })
  @ApiResponse({
    status: 200,
    description: "List of conversations sorted by most recent message",
  })
  getMyConversations(@CurrentUser("id") userId: string) {
    return this.messagesService.getMyConversations(userId);
  }

  @Get("unread-count")
  @ApiOperation({
    summary: "Get total unread message count for the current user",
  })
  @ApiResponse({ status: 200, description: "Returns { count: number }" })
  getUnreadCount(@CurrentUser("id") userId: string) {
    return this.messagesService.getUnreadCount(userId);
  }

  @Get(":id/messages")
  @ApiOperation({
    summary: "Get messages in a conversation (marks unread as read)",
  })
  @ApiParam({ name: "id", description: "Conversation UUID" })
  @ApiResponse({
    status: 200,
    description: "List of messages in chronological order",
  })
  getMessages(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser("id") userId: string,
  ) {
    return this.messagesService.getConversationMessages(id, userId);
  }

  @Post()
  @ApiOperation({ summary: "Start a new conversation about a listing" })
  @ApiResponse({
    status: 201,
    description: "Returns { conversation, message }",
  })
  startConversation(
    @Body() dto: StartConversationDto,
    @CurrentUser("id") userId: string,
  ) {
    return this.messagesService.startConversation(
      userId,
      dto.listingId,
      dto.body,
    );
  }

  @Post(":id/messages")
  @ApiOperation({ summary: "Send a message in a conversation" })
  @ApiParam({ name: "id", description: "Conversation UUID" })
  @ApiResponse({
    status: 201,
    description: "The created message with sender info",
  })
  sendMessage(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: SendMessageDto,
    @CurrentUser("id") userId: string,
  ) {
    return this.messagesService.sendMessage(id, userId, dto.body);
  }
}
