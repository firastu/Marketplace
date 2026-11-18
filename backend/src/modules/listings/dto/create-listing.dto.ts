import {
  IsString,
  IsNumber,
  IsUUID,
  IsOptional,
  IsBoolean,
  IsIn,
  MinLength,
  MaxLength,
  Min,
  Max,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { CONDITIONS, CURRENCIES } from "../listing.entity";

// Limits mirror the column sizes in migration 003 so oversize input is a
// 400 with a message, not a database error surfacing as a 500.
export class CreateListingDto {
  @ApiProperty()
  @IsUUID()
  categoryId: string;

  @ApiProperty()
  @IsString()
  @MinLength(5)
  @MaxLength(200)
  title: string;

  @ApiProperty()
  @IsString()
  @MinLength(10)
  @MaxLength(10000)
  description: string;

  @ApiProperty({ description: "0 means free / giveaway" })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(9_999_999_999)
  price: number;

  @ApiPropertyOptional({ enum: CURRENCIES, default: "SYP" })
  @IsOptional()
  @IsIn(CURRENCIES)
  currency?: string;

  @ApiPropertyOptional({ enum: CONDITIONS })
  @IsOptional()
  @IsIn(CONDITIONS)
  condition?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  locationCity?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(20)
  locationZip?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isNegotiable?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isShippingAvailable?: boolean;
}
