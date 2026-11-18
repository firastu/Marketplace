import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnModuleDestroy,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ListingImage } from "../listings/listing-image.entity";
import { ImageProcessingService } from "../listings/image-processing.service";
import { AuthService } from "../auth/auth.service";

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Daily clean-up required by the retention promises in the privacy policy:
 * - photos of listings deleted more than LISTING_RETENTION_DAYS (default
 *   30) days ago are removed from disk;
 * - expired and used password-reset tokens are deleted.
 * Listings removed by moderators are not deleted, so their photos stay as
 * evidence until a moderator decides otherwise.
 */
@Injectable()
export class RetentionService
  implements OnApplicationBootstrap, OnModuleDestroy
{
  private readonly logger = new Logger(RetentionService.name);
  private timers: NodeJS.Timeout[] = [];

  constructor(
    private readonly config: ConfigService,
    private readonly images: ImageProcessingService,
    private readonly authService: AuthService,
    @InjectRepository(ListingImage)
    private readonly listingImages: Repository<ListingImage>,
  ) {}

  onApplicationBootstrap() {
    if (this.config.get<string>("NODE_ENV") === "test") return;
    const run = () =>
      this.runOnce().catch((err) =>
        this.logger.error(`Retention run failed: ${err}`),
      );
    // First run shortly after start, then daily.
    this.timers.push(setTimeout(run, 60_000).unref());
    this.timers.push(setInterval(run, DAY_MS).unref());
  }

  onModuleDestroy() {
    this.timers.forEach((t) => clearTimeout(t));
  }

  retentionDays(): number {
    const days = Number(this.config.get<string>("LISTING_RETENTION_DAYS"));
    return Number.isFinite(days) && days >= 0 ? days : 30;
  }

  async runOnce(): Promise<{ photos: number; resetTokens: number }> {
    const cutoff = new Date(Date.now() - this.retentionDays() * DAY_MS);
    const stale = await this.listingImages
      .createQueryBuilder("img")
      .withDeleted()
      .innerJoin("img.listing", "listing")
      .where("listing.deleted_at IS NOT NULL")
      .andWhere("listing.deleted_at < :cutoff", { cutoff })
      .andWhere(
        "(img.storage_key_original IS NOT NULL OR img.storage_key_thumb IS NOT NULL OR img.storage_key_medium IS NOT NULL OR img.storage_key_large IS NOT NULL)",
      )
      .getMany();

    for (const img of stale) {
      await this.images.deleteImageFiles(img);
      await this.listingImages
        .createQueryBuilder()
        .update(ListingImage)
        .set({
          status: "deleted",
          url: "",
          storageKeyOriginal: () => "NULL",
          storageKeyThumb: () => "NULL",
          storageKeyMedium: () => "NULL",
          storageKeyLarge: () => "NULL",
          deletedAt: () => "COALESCE(deleted_at, NOW())",
        })
        .where("id = :id", { id: img.id })
        .execute();
    }

    const resetTokens = await this.authService.purgeResetTokens();
    if (stale.length || resetTokens) {
      this.logger.log(
        `Retention: removed ${stale.length} photo(s) of deleted listings, ${resetTokens} reset token(s)`,
      );
    }
    return { photos: stale.length, resetTokens };
  }
}
