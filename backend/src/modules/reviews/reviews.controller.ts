import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  ParseUUIDPipe,
} from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { ReviewsService } from "./reviews.service";
import { CreateReviewDto, UpdateReviewDto } from "./dto/reviews.dto";
import { CurrentUser } from "../auth/current-user.decorator";
import { Public } from "../auth/public.decorator";

@ApiTags("Reviews")
@ApiBearerAuth()
@Controller("reviews")
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Public()
  @Get("user/:userId")
  @ApiOperation({ summary: "Get all reviews for a user" })
  findByUser(@Param("userId", ParseUUIDPipe) userId: string) {
    return this.reviewsService.findByUser(userId);
  }

  @Public()
  @Get("user/:userId/rating")
  @ApiOperation({ summary: "Get average rating for a user" })
  getAverageRating(@Param("userId", ParseUUIDPipe) userId: string) {
    return this.reviewsService.getAverageRating(userId);
  }

  @Post()
  @ApiOperation({ summary: "Leave a review for a user" })
  create(@Body() dto: CreateReviewDto, @CurrentUser("id") userId: string) {
    return this.reviewsService.create(userId, dto);
  }

  @Put(":id")
  @ApiOperation({ summary: "Update your review" })
  update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateReviewDto,
    @CurrentUser("id") userId: string,
  ) {
    return this.reviewsService.update(id, userId, dto);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Delete your review" })
  remove(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser("id") userId: string,
  ) {
    return this.reviewsService.remove(id, userId);
  }
}
