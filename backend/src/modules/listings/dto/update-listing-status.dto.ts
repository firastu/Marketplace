import { IsIn } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class UpdateListingStatusDto {
  @ApiProperty({ enum: ["active", "sold", "reserved", "expired", "removed"] })
  @IsIn(["active", "sold", "reserved", "expired", "removed"])
  status: string;
}
