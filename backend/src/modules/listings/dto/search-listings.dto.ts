import { IsString, IsOptional, IsNumber, IsIn, Min } from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";

export class SearchListingsDto {
  @ApiPropertyOptional({
    description: "Keyword search on title and description",
  })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional({ description: "Filter by category UUID" })
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiPropertyOptional({ description: "Minimum price" })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minPrice?: number;

  @ApiPropertyOptional({ description: "Maximum price" })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxPrice?: number;

  @ApiPropertyOptional({ enum: ["new", "like_new", "used", "fair", "poor"] })
  @IsOptional()
  @IsIn(["new", "like_new", "used", "fair", "poor"])
  condition?: string;

  @ApiPropertyOptional({ description: "Filter by city name" })
  @IsOptional()
  @IsString()
  locationCity?: string;

  @ApiPropertyOptional({
    enum: ["newest", "price_asc", "price_desc"],
    default: "newest",
  })
  @IsOptional()
  @IsIn(["newest", "price_asc", "price_desc"])
  sortBy?: string;
}
