import { ArrayMaxSize, ArrayNotEmpty, IsArray, IsUUID } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class ReorderImagesDto {
  @ApiProperty({
    type: [String],
    description: "Every active image ID of the listing, in the new order",
  })
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(50)
  @IsUUID("all", { each: true })
  imageIds: string[];
}
