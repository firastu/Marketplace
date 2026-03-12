import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Listing } from './listing.entity';
import { ListingImage } from './listing-image.entity';
import { CreateListingDto } from './dto/create-listing.dto';
import { UpdateListingDto } from './dto/update-listing.dto';
import { PaginationDto, paginate, PaginatedResult } from '../../common';

@Injectable()
export class ListingsService {
  constructor(
    @InjectRepository(Listing)
    private readonly listingsRepo: Repository<Listing>,
    @InjectRepository(ListingImage)
    private readonly imagesRepo: Repository<ListingImage>,
  ) {}

  async findAll(pagination: PaginationDto): Promise<PaginatedResult<Listing>> {
    const { page = 1, limit = 20 } = pagination;
    const [data, total] = await this.listingsRepo.findAndCount({
      where: { status: 'active' },
      relations: ['images', 'category', 'user'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return paginate(data, total, page, limit);
  }

  async findById(id: string): Promise<Listing> {
    const listing = await this.listingsRepo.findOne({
      where: { id },
      relations: ['images', 'category', 'user'],
    });
    if (!listing) throw new NotFoundException('Listing not found');
    return listing;
  }

  async findByUser(userId: string, pagination: PaginationDto): Promise<PaginatedResult<Listing>> {
    const { page = 1, limit = 20 } = pagination;
    const [data, total] = await this.listingsRepo.findAndCount({
      where: { userId },
      relations: ['images', 'category'],
      order: { createdAt: 'DESC' },
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

  async update(id: string, userId: string, dto: UpdateListingDto): Promise<Listing> {
    const listing = await this.findById(id);
    this.assertOwnership(listing, userId);

    if (dto.title) {
      (dto as any).slug = this.generateSlug(dto.title);
    }

    await this.listingsRepo.update(id, dto);
    return this.findById(id);
  }

  async updateStatus(id: string, userId: string, status: string): Promise<Listing> {
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

  async addImage(listingId: string, userId: string, url: string, isPrimary = false): Promise<ListingImage> {
    const listing = await this.findById(listingId);
    this.assertOwnership(listing, userId);

    if (isPrimary) {
      await this.imagesRepo.update({ listingId }, { isPrimary: false });
    }

    const count = await this.imagesRepo.count({ where: { listingId } });
    const image = this.imagesRepo.create({
      listingId,
      url,
      isPrimary: isPrimary || count === 0,
      sortOrder: count,
    });
    return this.imagesRepo.save(image);
  }

  async removeImage(imageId: string, userId: string): Promise<void> {
    const image = await this.imagesRepo.findOne({
      where: { id: imageId },
      relations: ['listing'],
    });
    if (!image) throw new NotFoundException('Image not found');
    this.assertOwnership(image.listing, userId);
    await this.imagesRepo.remove(image);
  }

  private assertOwnership(listing: Listing, userId: string): void {
    if (listing.userId !== userId) {
      throw new ForbiddenException('You do not own this listing');
    }
  }

  private generateSlug(title: string): string {
    return (
      title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '') +
      '-' +
      Date.now().toString(36)
    );
  }
}
