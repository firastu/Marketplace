import {
  IsUUID,
  IsInt,
  Min,
  Max,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";

export class CreateReviewDto {
  @IsUUID()
  reviewedUserId: string;

  /**
   * The listing the two users talked about. Required: a review must come
   * from a real conversation, otherwise anyone could rate anyone.
   */
  @IsUUID()
  listingId: string;

  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @IsString()
  @MaxLength(200)
  @IsOptional()
  title?: string;

  @IsString()
  @MaxLength(2000)
  @IsOptional()
  body?: string;
}

export class UpdateReviewDto {
  @IsInt()
  @Min(1)
  @Max(5)
  @IsOptional()
  rating?: number;

  @IsString()
  @MaxLength(200)
  @IsOptional()
  title?: string;

  @IsString()
  @MaxLength(2000)
  @IsOptional()
  body?: string;
}
