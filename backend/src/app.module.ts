import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ThrottlerModule } from "@nestjs/throttler";
import { DEFAULT_THROTTLE } from "./common/throttle";
import { DatabaseModule } from "./database/database.module";
import { AuthModule } from "./modules/auth/auth.module";
import { UsersModule } from "./modules/users/users.module";
import { CategoriesModule } from "./modules/categories/categories.module";
import { ListingsModule } from "./modules/listings/listings.module";
import { FavoritesModule } from "./modules/favorites/favorites.module";
import { UploadsModule } from "./modules/uploads/uploads.module";
import { MessagesModule } from "./modules/messages/messages.module";
import { ReviewsModule } from "./modules/reviews/reviews.module";
import { MailModule } from "./modules/mail/mail.module";
import { AccountModule } from "./modules/account/account.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ".env",
    }),
    // In-memory counters: fine for one backend instance. Use a Redis
    // storage adapter once there is more than one.
    ThrottlerModule.forRoot([DEFAULT_THROTTLE]),
    DatabaseModule,
    AuthModule,
    UsersModule,
    CategoriesModule,
    ListingsModule,
    FavoritesModule,
    UploadsModule,
    MessagesModule,
    ReviewsModule,
    MailModule,
    AccountModule,
  ],
})
export class AppModule {}
