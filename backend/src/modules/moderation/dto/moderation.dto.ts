import {
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from "class-validator";
import { Transform } from "class-transformer";
import {
  ApiProperty,
  ApiPropertyOptional,
  IntersectionType,
} from "@nestjs/swagger";
import { PaginationDto } from "../../../common";
import {
  REPORT_REASONS,
  REPORT_STATUSES,
  REPORT_TARGETS,
} from "../report.entity";

const trim = ({ value }: { value: unknown }) =>
  typeof value === "string" ? value.trim() : value;

export class CreateReportDto {
  @ApiProperty({ enum: REPORT_TARGETS })
  @IsIn(REPORT_TARGETS)
  targetType: (typeof REPORT_TARGETS)[number];

  @ApiProperty()
  @IsUUID()
  targetId: string;

  @ApiProperty({ enum: REPORT_REASONS })
  @IsIn(REPORT_REASONS)
  reason: (typeof REPORT_REASONS)[number];

  @ApiPropertyOptional({ maxLength: 1000 })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(1000)
  details?: string;
}

class ReportStatusFilter {
  @ApiPropertyOptional({ enum: [...REPORT_STATUSES, "all"], default: "open" })
  @IsOptional()
  @IsIn([...REPORT_STATUSES, "all"])
  status?: (typeof REPORT_STATUSES)[number] | "all";
}

export class ListReportsQueryDto extends IntersectionType(
  ReportStatusFilter,
  PaginationDto,
) {}

export class UpdateReportDto {
  @ApiProperty({ enum: ["under_review", "resolved", "dismissed"] })
  @IsIn(["under_review", "resolved", "dismissed"])
  status: "under_review" | "resolved" | "dismissed";

  @ApiPropertyOptional({ maxLength: 1000 })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(1000)
  note?: string;
}

/** A required, non-empty reason for actions that hide content or users. */
export class RequiredReasonDto {
  @ApiProperty({ maxLength: 1000 })
  @Transform(trim)
  @IsString()
  @MinLength(3)
  @MaxLength(1000)
  reason: string;
}

export class OptionalReasonDto {
  @ApiPropertyOptional({ maxLength: 1000 })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(1000)
  reason?: string;

  @ApiPropertyOptional({ maxLength: 1000, description: "Alias of reason" })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(1000)
  note?: string;
}
