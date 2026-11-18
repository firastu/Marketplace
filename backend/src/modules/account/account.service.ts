import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import { InjectDataSource, InjectRepository } from "@nestjs/typeorm";
import { DataSource, In, IsNull, Repository } from "typeorm";
import * as bcrypt from "bcrypt";
import { randomBytes } from "crypto";
import { User } from "../users/user.entity";
import { UsersService } from "../users/users.service";
import { toPublicUser, toSelfUser, SelfUser } from "../users/user-views";
import { AuthService, BCRYPT_ROUNDS } from "../auth/auth.service";
import { PasswordResetToken } from "../auth/password-reset-token.entity";
import { Listing } from "../listings/listing.entity";
import { ListingImage } from "../listings/listing-image.entity";
import { ImageProcessingService } from "../listings/image-processing.service";
import { Favorite } from "../favorites/favorite.entity";
import { Conversation } from "../messages/conversation.entity";
import { Message } from "../messages/message.entity";
import { MessagesGateway } from "../messages/messages.gateway";
import { Review } from "../reviews/review.entity";
import { TERMS_VERSION } from "../../common/terms";
import {
  ChangePasswordDto,
  DeleteAccountDto,
  UpdateProfileDto,
} from "./dto/account.dto";

const imagePaths = (img: ListingImage) => ({
  thumb: img.storageKeyThumb
    ? `/uploads/listings/${img.storageKeyThumb}`
    : null,
  medium: img.storageKeyMedium
    ? `/uploads/listings/${img.storageKeyMedium}`
    : null,
  large: img.storageKeyLarge
    ? `/uploads/listings/${img.storageKeyLarge}`
    : null,
});

/**
 * Self-service for the account owner, covering the GDPR rights the app can
 * fulfil directly: rectification (profile), access/portability (export)
 * and erasure (account deletion).
 */
@Injectable()
export class AccountService {
  private readonly logger = new Logger(AccountService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly authService: AuthService,
    private readonly images: ImageProcessingService,
    private readonly gateway: MessagesGateway,
    @InjectDataSource() private readonly dataSource: DataSource,
    @InjectRepository(Listing) private readonly listings: Repository<Listing>,
    @InjectRepository(ListingImage)
    private readonly listingImages: Repository<ListingImage>,
    @InjectRepository(Favorite)
    private readonly favorites: Repository<Favorite>,
    @InjectRepository(Conversation)
    private readonly conversations: Repository<Conversation>,
    @InjectRepository(Message) private readonly messages: Repository<Message>,
    @InjectRepository(Review) private readonly reviews: Repository<Review>,
  ) {}

  async updateProfile(
    userId: string,
    dto: UpdateProfileDto,
  ): Promise<SelfUser> {
    const changes: Partial<User> = {};
    for (const key of ["displayName", "bio", "phone"] as const) {
      if (dto[key] !== undefined) {
        (changes as Record<string, unknown>)[key] = dto[key];
      }
    }
    const user = Object.keys(changes).length
      ? await this.usersService.update(userId, changes)
      : await this.usersService.findById(userId);
    return toSelfUser(user);
  }

  async changePassword(
    userId: string,
    dto: ChangePasswordDto,
  ): Promise<{ accessToken: string }> {
    await this.assertPassword(
      userId,
      dto.currentPassword,
      "Current password is incorrect",
    );
    const updated = await this.authService.setPassword(userId, dto.newPassword);
    // Other sessions are now invalid; this one continues with a new token.
    return { accessToken: this.authService.generateToken(updated) };
  }

  /** Everything stored about the user, as one JSON document. */
  async exportData(userId: string) {
    const user = await this.usersService.findById(userId);

    const listings = await this.listings.find({
      where: { userId },
      relations: ["images", "category"],
      withDeleted: true,
      order: { createdAt: "DESC" },
    });

    const favorites = await this.favorites.find({
      where: { userId },
      relations: ["listing"],
      withDeleted: true,
      order: { createdAt: "DESC" },
    });

    const conversations = await this.conversations.find({
      where: [{ buyerId: userId }, { sellerId: userId }],
      relations: ["listing", "buyer", "seller"],
      withDeleted: true,
      order: { createdAt: "DESC" },
    });
    const conversationIds = conversations.map((c) => c.id);
    const messages = conversationIds.length
      ? await this.messages.find({
          where: { conversationId: In(conversationIds) },
          order: { createdAt: "ASC" },
        })
      : [];

    const reviewsWritten = await this.reviews.find({
      where: { reviewerId: userId },
      order: { createdAt: "DESC" },
    });
    const reviewsReceived = await this.reviews.find({
      where: { reviewedUserId: userId },
      relations: ["reviewer"],
      order: { createdAt: "DESC" },
    });

    return {
      exportedAt: new Date().toISOString(),
      notes:
        "Image paths are served by the API under /uploads. Messages include both sides of each of your conversations.",
      account: {
        ...toSelfUser(user),
        currentTermsVersion: TERMS_VERSION,
      },
      listings: listings.map((l) => ({
        id: l.id,
        title: l.title,
        description: l.description,
        price: l.price,
        currency: l.currency,
        condition: l.condition,
        status: l.status,
        category: l.category?.name ?? null,
        locationCity: l.locationCity,
        viewsCount: l.viewsCount,
        createdAt: l.createdAt,
        updatedAt: l.updatedAt,
        deletedAt: l.deletedAt,
        images: (l.images ?? [])
          .filter((img) => !img.deletedAt)
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .map(imagePaths),
      })),
      favorites: favorites.map((f) => ({
        listingId: f.listingId,
        listingTitle: f.listing?.title ?? null,
        createdAt: f.createdAt,
      })),
      conversations: conversations.map((c) => {
        const other = c.buyerId === userId ? c.seller : c.buyer;
        return {
          id: c.id,
          role: c.buyerId === userId ? "buyer" : "seller",
          listingId: c.listingId,
          listingTitle: c.listing?.title ?? null,
          with: other ? toPublicUser(other).username : null,
          messages: messages
            .filter((m) => m.conversationId === c.id)
            .map((m) => ({
              fromMe: m.senderId === userId,
              body: m.body,
              isRead: m.isRead,
              createdAt: m.createdAt,
            })),
        };
      }),
      reviewsWritten: reviewsWritten.map((r) => ({
        reviewedUserId: r.reviewedUserId,
        listingId: r.listingId,
        rating: r.rating,
        title: r.title,
        body: r.body,
        createdAt: r.createdAt,
      })),
      reviewsReceived: reviewsReceived.map((r) => ({
        from: r.reviewer ? toPublicUser(r.reviewer).username : null,
        listingId: r.listingId,
        rating: r.rating,
        title: r.title,
        body: r.body,
        createdAt: r.createdAt,
      })),
    };
  }

  /**
   * Erases the account's personal data. The user row stays (anonymised) so
   * other people's chats keep a sender; listings are deleted and their
   * photos removed; favorites and reviews written by the user go too.
   */
  async deleteAccount(userId: string, dto: DeleteAccountDto): Promise<void> {
    await this.assertPassword(userId, dto.password, "Password is incorrect");

    const ownListings = await this.listings.find({
      where: { userId },
      withDeleted: true,
      select: { id: true },
    });
    const listingIds = ownListings.map((l) => l.id);
    const photos = listingIds.length
      ? await this.listingImages.find({
          where: { listingId: In(listingIds) },
          withDeleted: true,
        })
      : [];

    const now = new Date();
    const randomPassword = await bcrypt.hash(
      randomBytes(32).toString("hex"),
      BCRYPT_ROUNDS,
    );

    await this.dataSource.transaction(async (em) => {
      if (listingIds.length) {
        await em.update(
          Listing,
          { id: In(listingIds), deletedAt: IsNull() },
          { deletedAt: now },
        );
        await em.update(
          ListingImage,
          { listingId: In(listingIds) },
          {
            status: "deleted",
            isPrimary: false,
            url: "",
            storageKeyOriginal: null as unknown as string,
            storageKeyThumb: null as unknown as string,
            storageKeyMedium: null as unknown as string,
            storageKeyLarge: null as unknown as string,
          },
        );
        await em
          .createQueryBuilder()
          .update(ListingImage)
          .set({ deletedAt: now })
          .where("listing_id IN (:...ids) AND deleted_at IS NULL", {
            ids: listingIds,
          })
          .execute();
      }
      await em.delete(Favorite, { userId });
      await em.delete(Review, { reviewerId: userId });
      await em.delete(PasswordResetToken, { userId });
      await em.update(User, userId, {
        email: `deleted-${userId}@deleted.invalid`,
        username: `deleted-${userId.replace(/-/g, "").slice(0, 12)}`,
        displayName: null as unknown as string,
        avatarUrl: null as unknown as string,
        phone: null as unknown as string,
        bio: null as unknown as string,
        passwordHash: randomPassword,
        isActive: false,
        deletedAt: now,
        passwordChangedAt: now,
      });
      await em.increment(User, { id: userId }, "tokenVersion", 1);
    });

    // Files can't take part in the transaction; remove them once it held.
    await Promise.all(photos.map((p) => this.images.deleteImageFiles(p)));
    this.gateway.disconnectUser(userId);
    this.logger.log(`Account ${userId} deleted by its owner`);
  }

  private async assertPassword(
    userId: string,
    password: string,
    message: string,
  ): Promise<void> {
    const user = await this.usersService.findByIdWithPassword(userId);
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) throw new BadRequestException(message);
  }
}
