import {
  Injectable,
  ConflictException,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Favorite } from "./favorite.entity";
import { Listing, PUBLIC_STATUSES } from "../listings/listing.entity";

@Injectable()
export class FavoritesService {
  constructor(
    @InjectRepository(Favorite)
    private readonly favoritesRepo: Repository<Favorite>,
    @InjectRepository(Listing)
    private readonly listingsRepo: Repository<Listing>,
  ) {}

  async addFavorite(userId: string, listingId: string): Promise<Favorite> {
    const listing = await this.listingsRepo.findOne({
      where: { id: listingId },
      relations: ["user"],
    });
    if (!listing || !isPubliclyVisible(listing)) {
      throw new NotFoundException("Listing not found");
    }

    const existing = await this.favoritesRepo.findOne({
      where: { userId, listingId },
    });
    if (existing) throw new ConflictException("Already in favorites");
    const fav = this.favoritesRepo.create({ userId, listingId });
    return this.favoritesRepo.save(fav);
  }

  async removeFavorite(userId: string, listingId: string): Promise<void> {
    await this.favoritesRepo.delete({ userId, listingId });
  }

  /**
   * Soft-deleted listings drop out of the join, so they are filtered here,
   * together with listings that are no longer public (removed by a
   * moderator, expired, seller deactivated): a favorite must not keep
   * showing content that was taken down.
   * Sold/reserved listings stay, with their status, so the user sees why
   * the item is no longer available (spec §5.5 edge cases).
   */
  async getUserFavorites(userId: string): Promise<Favorite[]> {
    const favorites = await this.favoritesRepo.find({
      where: { userId },
      relations: ["listing", "listing.images", "listing.user"],
      order: { createdAt: "DESC" },
    });
    return favorites
      .filter((fav) => !!fav.listing && isPubliclyVisible(fav.listing))
      .map((fav) => {
        fav.listing.images?.sort((a, b) => a.sortOrder - b.sortOrder);
        return fav;
      });
  }
}

function isPubliclyVisible(listing: Listing): boolean {
  return PUBLIC_STATUSES.includes(listing.status) && !!listing.user?.isActive;
}
