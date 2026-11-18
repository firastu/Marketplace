import {
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  ValidateIf,
} from "class-validator";
import { Transform } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

const trimOrNull = ({ value }: { value: unknown }) => {
  if (value === null) return null;
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
};

/** "+963 933-123 456" → "+963933123456"; empty → null. */
const normalisePhone = ({ value }: { value: unknown }) => {
  if (value === null) return null;
  if (typeof value !== "string") return value;
  const compact = value.replace(/[\s\-().]/g, "");
  return compact === "" ? null : compact;
};

/** Fields left out are unchanged; null or "" clears them. */
export class UpdateProfileDto {
  @ApiPropertyOptional({ nullable: true, maxLength: 150 })
  @IsOptional()
  @Transform(trimOrNull)
  @ValidateIf((_o, v) => v !== null)
  @IsString()
  @MaxLength(150)
  displayName?: string | null;

  @ApiPropertyOptional({ nullable: true, maxLength: 1000 })
  @IsOptional()
  @Transform(trimOrNull)
  @ValidateIf((_o, v) => v !== null)
  @IsString()
  @MaxLength(1000)
  bio?: string | null;

  @ApiPropertyOptional({ nullable: true, example: "+963933123456" })
  @IsOptional()
  @Transform(normalisePhone)
  @ValidateIf((_o, v) => v !== null)
  @IsString()
  @Matches(/^\+[1-9]\d{7,14}$/, {
    message: "phone must be in international format, e.g. +963933123456",
  })
  phone?: string | null;
}

export class ChangePasswordDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  currentPassword: string;

  @ApiProperty({ minLength: 8, maxLength: 128 })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  newPassword: string;
}

export class DeleteAccountDto {
  @ApiProperty({ description: "Current password, to confirm" })
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  password: string;
}
