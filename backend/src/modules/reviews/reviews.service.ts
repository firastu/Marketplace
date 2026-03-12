import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Review } from './review.entity';
import { CreateReviewDto } from './dto/reviews.dto';
import { UpdateReviewDto } from './dto/reviews.dto';

@Injectable()
export class ReviewsService {
  constructor(
    @InjectRepository(Review)
    private readonly reviewRepo: Repository<Review>,
  ) {}

  async findByUser(userId: string): Promise<Review[]> {
    return this.reviewRepo.find({
      where: { reviewedUserId: userId },
      relations: ['reviewer', 'listing'],
      order: { createdAt: 'DESC' },
    });
  }

  async create(reviewerId: string, dto: CreateReviewDto): Promise<Review> {
    if (reviewerId === dto.reviewedUserId) {
      throw new ForbiddenException('Cannot review yourself');
    }

    const existing = await this.reviewRepo.findOne({
      where: {
        reviewerId,
        reviewedUserId: dto.reviewedUserId,
        listingId: dto.listingId ?? undefined,
      },
    });
    if (existing) {
      throw new ConflictException('You already reviewed this user for this listing');
    }

    const review = this.reviewRepo.create({ ...dto, reviewerId });
    return this.reviewRepo.save(review);
  }

  async update(id: string, userId: string, dto: UpdateReviewDto): Promise<Review> {
    const review = await this.reviewRepo.findOne({ where: { id } });
    if (!review) throw new NotFoundException('Review not found');
    if (review.reviewerId !== userId) {
      throw new ForbiddenException('Not your review');
    }

    Object.assign(review, dto);
    return this.reviewRepo.save(review);
  }

  async remove(id: string, userId: string): Promise<void> {
    const review = await this.reviewRepo.findOne({ where: { id } });
    if (!review) throw new NotFoundException('Review not found');
    if (review.reviewerId !== userId) {
      throw new ForbiddenException('Not your review');
    }
    await this.reviewRepo.remove(review);
  }

  async getAverageRating(userId: string): Promise<{ average: number; count: number }> {
    const result = await this.reviewRepo
      .createQueryBuilder('r')
      .select('AVG(r.rating)', 'average')
      .addSelect('COUNT(r.id)', 'count')
      .where('r.reviewed_user_id = :userId', { userId })
      .getRawOne();

    return {
      average: result.average ? parseFloat(result.average) : 0,
      count: parseInt(result.count, 10),
    };
  }
}
