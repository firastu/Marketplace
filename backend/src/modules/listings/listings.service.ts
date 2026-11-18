import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  UnprocessableEntityException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, SelectQueryBuilder } from "typeorm";
import { Listing, PUBLIC_STATUSES } from "./listing.entity";
import { ListingImage } from "./listing-image.entity";
import { Category } from "../categories/category.entity";
import { CreateListingDto } from "./dto/create-listing.dto";
import { UpdateListingDto } from "./dto/update-listing.dto";
import { SearchListingsDto } from "./dto/search-listings.dto";
import { PaginationDto, paginate, PaginatedResult } from "../../common";
import { ImageProcessingService } from "./image-processing.service";

export const MAX_IMAGES_PER_LISTING = 15;

const STAFF_ROLES = ["admin", "moderator"];

/** The authenticated caller, if any (guests are undefined). */
export interface Viewer {
  id: string;
  role: string;
}

/** Escape LIKE wildcards so a search for "100%" doesn't match everything. */
export function escapeLike(term: string): string {
  return term.replace(/[\\%_]/g, (c) => `\\${c}`);
}

/**
 * URL slug that keeps Arabic (and any other) letters. The old a-z-only
 * version turned every Arabic title into an empty slug.
 */
export function generateSlug(title: string): string {
  const base = title
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 200);
  const suffix = Date.now().toString(36);
  return base ? `${base}-${suffix}` : suffix;
}

function sortImages(listing: Listing): Listing {
  listing.images?.sort((a, b) => a.sortOrder - b.sortOrder);
  return listing;
}

@Injectable()
export class ListingsService {
  constructor(
    @InjectRepository(Listing)
    private readonly listingsRepo: Repository<Listing>,
    @InjectRepository(ListingImage)
    private readonly imagesRepo: Repository<ListingImage>,
    @InjectRepository(Category)
    private readonly categoriesRepo: Repository<Category>,
    private readonly imageProcessing: ImageProcessingService,
  ) {}

  async findAll(
    pagination: PaginationDto,
    filters: SearchListingsDto,
  ): Promise<PaginatedResult<Listing>> {
    const { page = 1, limit = 20 } = pagination;
    // Soft-deleted listings and images are excluded automatically
    // (@DeleteDateColumn). Listings of deactivated sellers are hidden.
    const qb = this.listingsRepo
      .createQueryBuilder("listing")
      .leftJoinAndSelect("listing.images", "images")
      .leftJoinAndSelect("listing.category", "category")
      .innerJoinAndSelect("listing.user", "user", "user.isActive = true")
      .where("listing.status = :status", { status: "active" });

    this.applyFilters(qb, filters);

    const sortBy = filters.sortBy || "newest";
    if (sortBy === "price_asc") {
      qb.orderBy("listing.price", "ASC");
    } else if (sortBy === "price_desc") {
      qb.orderBy("listing.price", "DESC");
    } else {
      qb.orderBy("listing.createdAt", "DESC");
    }
    // Tie-breaker: without it, listings with the same price (or timestamp)
    // can repeat or go missing between pages.
    qb.addOrderBy("listing.id", "ASC");

    qb.skip((page - 1) * limit).take(limit);

    const [data, total] = await qb.getManyAndCount();
    return paginate(data.map(sortImages), total, page, limit);
  }

  private applyFilters(
    qb: SelectQueryBuilder<Listing>,
    filters: SearchListingsDto,
  ): void {
    if (filters.q) {
      qb.andWhere(
        "(listing.title ILIKE :term OR listing.description ILIKE :term)",
        { term: `%${escapeLike(filters.q)}%` },
      );
    }
    if (filters.categoryId) {
      // Choosing a top-level category (e.g. Electronics) must also return
      // listings filed under its subcategories (e.g. Smartphones).
      qb.andWhere(
        "(listing.categoryId = :categoryId OR category.parentId = :categoryId)",
        { categoryId: filters.categoryId },
      );
    }
    if (filters.currency) {
      qb.andWhere("listing.currency = :currency", {
        currency: filters.currency,
      });
    }
    if (filters.minPrice !== undefined) {
      qb.andWhere("listing.price >= :minPrice", {
        minPrice: filters.minPrice,
      });
    }
    if (filters.maxPrice !== undefined) {
      qb.andWhere("listing.price <= :maxPrice", {
        maxPrice: filters.maxPrice,
      });
    }
    if (filters.condition) {
      qb.andWhere("listing.condition = :condition", {
        condition: filters.condition,
      });
    }
    if (filters.locationCity) {
      qb.andWhere("listing.locationCity ILIKE :city", {
        city: `%${escapeLike(filters.locationCity)}%`,
      });
    }
  }

  /** Internal lookup: any non-deleted listing, no visibility rules. */
  async findById(id: string): Promise<Listing> {
    const listing = await this.listingsRepo.findOne({
      where: { id },
      relations: ["images", "category", "user"],
    });
    if (!listing) throw new NotFoundException("Listing not found");
    return sortImages(listing);
  }

  /**
   * Public lookup. Drafts, expired and moderator-removed listings (and
   * listings of deactivated sellers) are only visible to their owner and
   * to staff; everyone else gets a 404 as if the listing didn't exist.
   */
  async findVisibleById(id: string, viewer?: Viewer): Promise<Listing> {
    const listing = await this.findById(id);
    const { isOwner } = this.assertVisible(listing, viewer);

    if (!isOwner) {
      await this.listingsRepo.increment({ id }, "viewsCount", 1);
      listing.viewsCount += 1;
    }
    return listing;
  }

  async findByUser(
    userId: string,
    pagination: PaginationDto,
  ): Promise<PaginatedResult<Listing>> {
    const { page = 1, limit = 20 } = pagination;
    const [data, total] = await this.listingsRepo.findAndCount({
      where: { userId },
      relations: ["images", "category"],
      order: { createdAt: "DESC" },
      skip: (page - 1) * limit,
      take: limit,
    });
    return paginate(data.map(sortImages), total, page, limit);
  }

  async create(userId: string, dto: CreateListingDto): Promise<Listing> {
    await this.assertCategoryExists(dto.categoryId);
    const listing = this.listingsRepo.create({
      ...dto,
      currency: (dto.currency as Listing["currency"]) ?? "SYP",
      userId,
      slug: generateSlug(dto.title),
    });
    const saved = await this.listingsRepo.save(listing);
    return this.findById(saved.id);
  }

  async update(
    id: string,
    userId: string,
    dto: UpdateListingDto,
  ): Promise<Listing> {
    const listing = await this.findById(id);
    this.assertOwnership(listing, userId);
    this.assertNotRemoved(listing);
    if (dto.categoryId) await this.assertCategoryExists(dto.categoryId);

    const changes: Partial<Listing> = {
      ...(dto as Partial<Listing>),
      ...(dto.title ? { slug: generateSlug(dto.title) } : {}),
    };
    await this.listingsRepo.update(id, changes);
    return this.findById(id);
  }

  async updateStatus(
    id: string,
    userId: string,
    status: string,
  ): Promise<Listing> {
    const listing = await this.findById(id);
    this.assertOwnership(listing, userId);
    this.assertNotRemoved(listing);
    await this.listingsRepo.update(id, { status });
    return this.findById(id);
  }

  /**
   * Soft delete. The listing disappears from search, detail pages and
   * favorites, but existing conversations about it (and their messages)
   * are kept, and the row can be restored or inspected by moderators.
   */
  async remove(id: string, userId: string): Promise<void> {
    const listing = await this.findById(id);
    this.assertOwnership(listing, userId);
    await this.listingsRepo.softDelete(id);
  }

  async addImage(
    listingId: string,
    userId: string,
    buffer: Buffer,
    isPrimary = false,
  ): Promise<ListingImage> {
    const listing = await this.findById(listingId);
    this.assertOwnership(listing, userId);
    this.assertNotRemoved(listing);

    // Deleted images are excluded by @DeleteDateColumn.
    const existing = await this.imagesRepo.find({ where: { listingId } });
    if (existing.length >= MAX_IMAGES_PER_LISTING) {
      throw new BadRequestException(
        `Maximum ${MAX_IMAGES_PER_LISTING} images per listing`,
      );
    }

    // Rejects anything that isn't really a JPEG/PNG/WebP before it
    // touches the disk.
    const detected = await this.imageProcessing.detectFormat(buffer);

    const makePrimary = isPrimary || !existing.some((img) => img.isPrimary);
    if (makePrimary) {
      await this.imagesRepo.update({ listingId }, { isPrimary: false });
    }

    const nextSortOrder =
      existing.reduce((max, img) => Math.max(max, img.sortOrder), -1) + 1;

    const saved = await this.imagesRepo.save(
      this.imagesRepo.create({
        listingId,
        url: "",
        status: "processing",
        isPrimary: makePrimary,
        sortOrder: nextSortOrder,
      }),
    );

    try {
      return await this.imageProcessing.processImage(
        saved.id,
        buffer,
        detected,
      );
    } catch {
      // Don't leave a broken image attached to the listing.
      const failed = await this.imagesRepo.findOneOrFail({
        where: { id: saved.id },
      });
      await this.imageProcessing.deleteImageFiles(failed);
      await this.imagesRepo.softDelete(saved.id);
      if (makePrimary) await this.promoteFirstImage(listingId);
      throw new UnprocessableEntityException(
        "The image could not be processed. Try a different photo.",
      );
    }
  }

  async getListingImages(
    listingId: string,
    viewer?: Viewer,
  ): Promise<ListingImage[]> {
    // Same visibility rules as the listing itself (no view count bump).
    this.assertVisible(await this.findById(listingId), viewer);
    return this.imagesRepo.find({
      where: { listingId },
      order: { sortOrder: "ASC" },
    });
  }

  async removeImage(
    listingId: string,
    imageId: string,
    userId: string,
  ): Promise<void> {
    const image = await this.imagesRepo.findOne({
      where: { id: imageId, listingId },
      relations: ["listing"],
    });
    // image.listing is null once the listing itself was (soft) deleted.
    if (!image || !image.listing) {
      throw new NotFoundException("Image not found");
    }
    this.assertOwnership(image.listing, userId);

    await this.imageProcessing.deleteImageFiles(image);
    await this.imagesRepo.update(imageId, {
      status: "deleted",
      isPrimary: false,
    });
    await this.imagesRepo.softDelete(imageId);

    // A listing must keep a cover if it still has images.
    if (image.isPrimary) await this.promoteFirstImage(listingId);
  }

  async setCoverImage(
    listingId: string,
    imageId: string,
    userId: string,
  ): Promise<ListingImage> {
    const listing = await this.findById(listingId);
    this.assertOwnership(listing, userId);

    const image = await this.imagesRepo.findOne({
      where: { id: imageId, listingId },
    });
    if (!image) throw new NotFoundException("Image not found");

    await this.imagesRepo.update({ listingId }, { isPrimary: false });
    await this.imagesRepo.update(imageId, { isPrimary: true });
    return this.imagesRepo.findOneOrFail({ where: { id: imageId } });
  }

  async reorderImages(
    listingId: string,
    userId: string,
    orderedIds: string[],
  ): Promise<ListingImage[]> {
    const listing = await this.findById(listingId);
    this.assertOwnership(listing, userId);

    const images = await this.imagesRepo.find({ where: { listingId } });
    const validIds = new Set(images.map((i) => i.id));
    const requested = new Set(orderedIds);

    // Require the complete set exactly once each; a partial list would
    // leave duplicate sort positions.
    if (
      requested.size !== orderedIds.length ||
      requested.size !== validIds.size ||
      orderedIds.some((id) => !validIds.has(id))
    ) {
      throw new BadRequestException(
        "imageIds must list every image of this listing exactly once",
      );
    }

    await this.imagesRepo.manager.transaction(async (em) => {
      for (const [index, id] of orderedIds.entries()) {
        await em.update(ListingImage, id, { sortOrder: index });
      }
    });
    return this.imagesRepo.find({
      where: { listingId },
      order: { sortOrder: "ASC" },
    });
  }

  /**
   * Throws 404 unless the viewer may see the listing: anyone for public
   * statuses of active sellers, otherwise only the owner and staff.
   */
  private assertVisible(
    listing: Listing,
    viewer?: Viewer,
  ): { isOwner: boolean } {
    const isOwner = !!viewer && viewer.id === listing.userId;
    const isStaff = !!viewer && STAFF_ROLES.includes(viewer.role);
    const publiclyVisible =
      PUBLIC_STATUSES.includes(listing.status) && !!listing.user?.isActive;

    if (!publiclyVisible && !isOwner && !isStaff) {
      throw new NotFoundException("Listing not found");
    }
    return { isOwner };
  }

  private async promoteFirstImage(listingId: string): Promise<void> {
    const next = await this.imagesRepo.findOne({
      where: { listingId },
      order: { sortOrder: "ASC" },
    });
    if (next) await this.imagesRepo.update(next.id, { isPrimary: true });
  }

  private async assertCategoryExists(categoryId: string): Promise<void> {
    const exists = await this.categoriesRepo.exists({
      where: { id: categoryId, isActive: true },
    });
    if (!exists) throw new BadRequestException("Unknown category");
  }

  private assertOwnership(listing: Listing, userId: string): void {
    if (listing.userId !== userId) {
      throw new ForbiddenException("You do not own this listing");
    }
  }

  private assertNotRemoved(listing: Listing): void {
    if (listing.status === "removed") {
      throw new ForbiddenException(
        "This listing was removed by moderation and can no longer be changed",
      );
    }
  }
}
