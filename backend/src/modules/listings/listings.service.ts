import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, SelectQueryBuilder, Not, IsNull } from "typeorm";
import { Listing } from "./listing.entity";
import { ListingImage } from "./listing-image.entity";
import { CreateListingDto } from "./dto/create-listing.dto";
import { UpdateListingDto } from "./dto/update-listing.dto";
import { SearchListingsDto } from "./dto/search-listings.dto";
import { PaginationDto, paginate, PaginatedResult } from "../../common";
import { ImageProcessingService } from "./image-processing.service";

const MAX_IMAGES_PER_LISTING = 15;

@Injectable()
export class ListingsService {
  constructor(
    @InjectRepository(Listing)
    private readonly listingsRepo: Repository<Listing>,
    @InjectRepository(ListingImage)
    private readonly imagesRepo: Repository<ListingImage>,
    private readonly imageProcessing: ImageProcessingService,
  ) {}

  async findAll(
    pagination: PaginationDto,
    filters: SearchListingsDto,
  ): Promise<PaginatedResult<Listing>> {
    const { page = 1, limit = 20 } = pagination;
    const qb = this.listingsRepo
      .createQueryBuilder("listing")
      .leftJoinAndSelect("listing.images", "images")
      .leftJoinAndSelect("listing.category", "category")
      .leftJoinAndSelect("listing.user", "user")
      .where("listing.status = :status", { status: "active" })
      .andWhere("images.deleted_at IS NULL");

    this.applyFilters(qb, filters);

    const sortBy = filters.sortBy || "newest";
    if (sortBy === "price_asc") {
      qb.orderBy("listing.price", "ASC");
    } else if (sortBy === "price_desc") {
      qb.orderBy("listing.price", "DESC");
    } else {
      qb.orderBy("listing.createdAt", "DESC");
    }

    qb.skip((page - 1) * limit).take(limit);

    const [data, total] = await qb.getManyAndCount();
    return paginate(data, total, page, limit);
  }

  private applyFilters(
    qb: SelectQueryBuilder<Listing>,
    filters: SearchListingsDto,
  ): void {
    if (filters.q) {
      const term = `%${filters.q}%`;
      qb.andWhere(
        "(listing.title ILIKE :term OR listing.description ILIKE :term)",
        { term },
      );
    }
    if (filters.categoryId) {
      qb.andWhere("listing.categoryId = :categoryId", {
        categoryId: filters.categoryId,
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
        city: `%${filters.locationCity}%`,
      });
    }
  }

  async findById(id: string): Promise<Listing> {
    const listing = await this.listingsRepo.findOne({
      where: { id },
      relations: ["images", "category", "user"],
    });
    if (!listing) throw new NotFoundException("Listing not found");
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
    return paginate(data, total, page, limit);
  }

  async create(userId: string, dto: CreateListingDto): Promise<Listing> {
    const slug = this.generateSlug(dto.title);
    const listing = this.listingsRepo.create({
      ...dto,
      userId,
      slug,
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

    if (dto.title) {
      (dto as UpdateListingDto & { slug?: string }).slug = this.generateSlug(
        dto.title,
      );
    }

    await this.listingsRepo.update(id, dto);
    return this.findById(id);
  }

  async updateStatus(
    id: string,
    userId: string,
    status: string,
  ): Promise<Listing> {
    const listing = await this.findById(id);
    this.assertOwnership(listing, userId);
    await this.listingsRepo.update(id, { status });
    return this.findById(id);
  }

  async remove(id: string, userId: string): Promise<void> {
    const listing = await this.findById(id);
    this.assertOwnership(listing, userId);
    await this.listingsRepo.remove(listing);
  }

  async addImage(
    listingId: string,
    userId: string,
    url: string,
    isPrimary = false,
  ): Promise<ListingImage> {
    const listing = await this.findById(listingId);
    this.assertOwnership(listing, userId);

    const count = await this.imagesRepo.count({
      where: { listingId, deletedAt: Not(IsNull()) },
    });
    if (count >= MAX_IMAGES_PER_LISTING) {
      throw new BadRequestException(
        `Maximum ${MAX_IMAGES_PER_LISTING} images per listing`,
      );
    }

    if (isPrimary) {
      await this.imagesRepo.update(
        { listingId, deletedAt: Not(IsNull()) },
        { isPrimary: false },
      );
    }

    const image = this.imagesRepo.create({
      listingId,
      url,
      status: "processing",
      isPrimary: isPrimary || count === 0,
      sortOrder: count,
    });
    const saved = await this.imagesRepo.save(image);

    try {
      return await this.imageProcessing.processImage(saved.id);
    } catch {
      return saved;
    }
  }

  async getListingImages(listingId: string): Promise<ListingImage[]> {
    const images = await this.imagesRepo.find({
      where: { listingId, deletedAt: IsNull() },
      order: { sortOrder: "ASC" },
    });
    return images;
  }

  async removeImage(imageId: string, userId: string): Promise<void> {
    const image = await this.imagesRepo.findOne({
      where: { id: imageId },
      relations: ["listing"],
    });
    if (!image) throw new NotFoundException("Image not found");
    this.assertOwnership(image.listing, userId);

    await this.imageProcessing.deleteImageFiles(image);
    await this.imagesRepo.update(imageId, {
      status: "deleted",
      deletedAt: new Date(),
    });
  }

  async setCoverImage(
    listingId: string,
    imageId: string,
    userId: string,
  ): Promise<ListingImage> {
    const listing = await this.findById(listingId);
    this.assertOwnership(listing, userId);

    const image = await this.imagesRepo.findOne({
      where: { id: imageId, listingId, deletedAt: Not(IsNull()) },
    });
    if (!image) throw new NotFoundException("Image not found");

    await this.imagesRepo.update(
      { listingId, deletedAt: Not(IsNull()) },
      { isPrimary: false },
    );
    await this.imagesRepo.update(imageId, { isPrimary: true });
    return this.imagesRepo.findOneOrFail({ where: { id: imageId } });
  }

  async reorderImages(
    listingId: string,
    userId: string,
    orderedIds: string[],
  ): Promise<void> {
    const listing = await this.findById(listingId);
    this.assertOwnership(listing, userId);

    const images = await this.imagesRepo.find({
      where: { listingId, deletedAt: Not(IsNull()) },
    });

    const validIds = new Set(images.map((i) => i.id));
    if (orderedIds.some((id) => !validIds.has(id))) {
      throw new BadRequestException("Invalid image IDs provided");
    }

    await Promise.all(
      orderedIds.map((id, index) =>
        this.imagesRepo.update(id, { sortOrder: index }),
      ),
    );
  }

  private assertOwnership(listing: Listing, userId: string): void {
    if (listing.userId !== userId) {
      throw new ForbiddenException("You do not own this listing");
    }
  }

  private generateSlug(title: string): string {
    return (
      title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "") +
      "-" +
      Date.now().toString(36)
    );
  }
}
