import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AuthModule } from "../auth/auth.module";
import { UsersModule } from "../users/users.module";
import { ListingsModule } from "../listings/listings.module";
import { MessagesModule } from "../messages/messages.module";
import { Listing } from "../listings/listing.entity";
import { ListingImage } from "../listings/listing-image.entity";
import { Favorite } from "../favorites/favorite.entity";
import { Conversation } from "../messages/conversation.entity";
import { Message } from "../messages/message.entity";
import { Review } from "../reviews/review.entity";
import { AccountController } from "./account.controller";
import { AccountService } from "./account.service";
import { RetentionService } from "./retention.service";

@Module({
  imports: [
    AuthModule,
    UsersModule,
    ListingsModule,
    MessagesModule,
    TypeOrmModule.forFeature([
      Listing,
      ListingImage,
      Favorite,
      Conversation,
      Message,
      Review,
    ]),
  ],
  controllers: [AccountController],
  providers: [AccountService, RetentionService],
  exports: [RetentionService],
})
export class AccountModule {}
