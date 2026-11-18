import {
  IsString,
  IsOptional,
  IsNumber,
  IsIn,
  IsUUID,
  Min,
  MaxLength,
} from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { CONDITIONS, CURRENCIES } from "../listing.entity";

export class SearchListingsDto {
  @ApiPropertyOptional({
    description: "Keyword search on title and description",
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  q?: string;

  @ApiPropertyOptional({
    description: "Filter by category UUID (includes its subcategories)",
  })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional({
    description: "Only listings of this seller (public seller page)",
  })
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiPropertyOptional({
    enum: CURRENCIES,
    description: "Only listings priced in this currency",
  })
  @IsOptional()
  @IsIn(CURRENCIES)
  currency?: string;

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

  @ApiPropertyOptional({ enum: CONDITIONS })
  @IsOptional()
  @IsIn(CONDITIONS)
  condition?: string;

  @ApiPropertyOptional({ description: "Filter by city name" })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  locationCity?: string;

  @ApiPropertyOptional({
    enum: ["newest", "price_asc", "price_desc"],
    default: "newest",
  })
  @IsOptional()
  @IsIn(["newest", "price_asc", "price_desc"])
  sortBy?: string;
}
