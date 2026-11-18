import {
  IsEmail,
  IsString,
  IsOptional,
  MinLength,
  MaxLength,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";

const normaliseEmail = ({ value }: { value: unknown }) =>
  typeof value === "string" ? value.trim().toLowerCase() : value;
const trim = ({ value }: { value: unknown }) =>
  typeof value === "string" ? value.trim() : value;

export class RegisterDto {
  @ApiProperty({ example: "user@example.com" })
  @Transform(normaliseEmail)
  @IsEmail()
  email: string;

  @ApiProperty({ example: "johndoe" })
  @Transform(trim)
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  username: string;

  @ApiProperty({ example: "securePassword123" })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password: string;

  @ApiPropertyOptional({ example: "John Doe" })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  displayName?: string;
}

export class LoginDto {
  @ApiProperty({ example: "user@example.com" })
  @Transform(normaliseEmail)
  @IsEmail()
  email: string;

  @ApiProperty({ example: "securePassword123" })
  @IsString()
  password: string;
}
