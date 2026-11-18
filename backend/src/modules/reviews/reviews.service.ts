import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Review } from "./review.entity";
import { Conversation } from "../messages/conversation.entity";
import { CreateReviewDto } from "./dto/reviews.dto";
import { UpdateReviewDto } from "./dto/reviews.dto";

@Injectable()
export class ReviewsService {
  constructor(
    @InjectRepository(Review)
    private readonly reviewRepo: Repository<Review>,
    @InjectRepository(Conversation)
    private readonly convRepo: Repository<Conversation>,
  ) {}

  async findByUser(userId: string): Promise<Review[]> {
    return this.reviewRepo.find({
      where: { reviewedUserId: userId },
      relations: ["reviewer", "listing"],
      order: { createdAt: "DESC" },
    });
  }

  async create(reviewerId: string, dto: CreateReviewDto): Promise<Review> {
    if (reviewerId === dto.reviewedUserId) {
      throw new ForbiddenException("Cannot review yourself");
    }

    // Buyer and seller can rate each other, but only after they actually
    // exchanged messages about this listing.
    const conversation = await this.convRepo
      .createQueryBuilder("c")
      .innerJoin("c.messages", "m")
      .where("c.listing_id = :listingId", { listingId: dto.listingId })
      .andWhere(
        "((c.buyer_id = :a AND c.seller_id = :b) OR (c.buyer_id = :b AND c.seller_id = :a))",
        { a: reviewerId, b: dto.reviewedUserId },
      )
      .andWhere("m.sender_id = :b", { b: dto.reviewedUserId })
      .getOne();
    if (!conversation) {
      throw new ForbiddenException(
        "You can only review someone you have exchanged messages with about this listing",
      );
    }

    const existing = await this.reviewRepo.findOne({
      where: {
        reviewerId,
        reviewedUserId: dto.reviewedUserId,
        listingId: dto.listingId,
      },
    });
    if (existing) {
      throw new ConflictException(
        "You already reviewed this user for this listing",
      );
    }

    const review = this.reviewRepo.create({ ...dto, reviewerId });
    return this.reviewRepo.save(review);
  }

  async update(
    id: string,
    userId: string,
    dto: UpdateReviewDto,
  ): Promise<Review> {
    const review = await this.reviewRepo.findOne({ where: { id } });
    if (!review) throw new NotFoundException("Review not found");
    if (review.reviewerId !== userId) {
      throw new ForbiddenException("Not your review");
    }

    Object.assign(review, dto);
    return this.reviewRepo.save(review);
  }

  async remove(id: string, userId: string): Promise<void> {
    const review = await this.reviewRepo.findOne({ where: { id } });
    if (!review) throw new NotFoundException("Review not found");
    if (review.reviewerId !== userId) {
      throw new ForbiddenException("Not your review");
    }
    await this.reviewRepo.remove(review);
  }

  async getAverageRating(
    userId: string,
  ): Promise<{ average: number; count: number }> {
    const result = await this.reviewRepo
      .createQueryBuilder("r")
      .select("AVG(r.rating)", "average")
      .addSelect("COUNT(r.id)", "count")
      .where("r.reviewed_user_id = :userId", { userId })
      .getRawOne();

    return {
      average: result.average ? parseFloat(result.average) : 0,
      count: parseInt(result.count, 10),
    };
  }
}
