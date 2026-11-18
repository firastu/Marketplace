import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { MessagesModule } from "../messages/messages.module";
import { Listing } from "../listings/listing.entity";
import { User } from "../users/user.entity";
import { Report } from "./report.entity";
import { ModerationAction } from "./moderation-action.entity";
import { ModerationService } from "./moderation.service";
import { ReportsController } from "./reports.controller";
import { ModerationController } from "./moderation.controller";

@Module({
  imports: [
    MessagesModule,
    TypeOrmModule.forFeature([Report, ModerationAction, Listing, User]),
  ],
  controllers: [ReportsController, ModerationController],
  providers: [ModerationService],
})
export class ModerationModule {}
