import { IsIn } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";
import { OWNER_SETTABLE_STATUSES } from "../listing.entity";

export class UpdateListingStatusDto {
  @ApiProperty({ enum: OWNER_SETTABLE_STATUSES })
  @IsIn(OWNER_SETTABLE_STATUSES)
  status: string;
}
