import { IsUUID, IsString, MinLength, MaxLength } from "class-validator";
import { Transform } from "class-transformer";
import { ApiProperty } from "@nestjs/swagger";

const trim = ({ value }: { value: unknown }) =>
  typeof value === "string" ? value.trim() : value;

export const MAX_MESSAGE_LENGTH = 5000;

export class StartConversationDto {
  @ApiProperty()
  @IsUUID()
  listingId: string;

  @ApiProperty({ maxLength: MAX_MESSAGE_LENGTH })
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(MAX_MESSAGE_LENGTH)
  body: string;
}

export class SendMessageDto {
  @ApiProperty({ maxLength: MAX_MESSAGE_LENGTH })
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(MAX_MESSAGE_LENGTH)
  body: string;
}
