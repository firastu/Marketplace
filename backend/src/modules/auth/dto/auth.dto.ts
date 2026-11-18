import {
  Equals,
  IsEmail,
  IsIn,
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

  @ApiProperty({
    example: true,
    description: "Must be true: the user accepts the Terms and Privacy Policy",
  })
  @Equals(true, {
    message: "You must accept the Terms and the Privacy Policy",
  })
  acceptTerms: boolean;
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

export class ForgotPasswordDto {
  @ApiProperty({ example: "user@example.com" })
  @Transform(normaliseEmail)
  @IsEmail()
  email: string;

  @ApiPropertyOptional({ enum: ["ar", "en"], default: "ar" })
  @IsOptional()
  @IsIn(["ar", "en"])
  locale?: "ar" | "en";
}

export class ResetPasswordDto {
  @ApiProperty({ description: "Token from the reset link" })
  @IsString()
  @MinLength(20)
  @MaxLength(200)
  token: string;

  @ApiProperty({ example: "newSecurePassword123" })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password: string;
}
