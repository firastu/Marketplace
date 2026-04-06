import {
  Controller,
  Post,
  Param,
  ParseUUIDPipe,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  Query,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
} from "@nestjs/swagger";
import { ListingsService } from "../listings/listings.service";
import { CurrentUser } from "../auth/current-user.decorator";
import {
  imageDiskStorage,
  ImageFileValidator,
} from "../../common/image-upload.utils";

@ApiTags("Uploads")
@ApiBearerAuth()
@Controller("uploads")
export class UploadsController {
  constructor(private readonly listingsService: ListingsService) {}

  @Post("listings/:listingId")
  @ApiOperation({ summary: "Upload an image for a listing (alias)" })
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      properties: { file: { type: "string", format: "binary" } },
    },
  })
  @UseInterceptors(
    FileInterceptor("file", {
      storage: imageDiskStorage,
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  async uploadImage(
    @Param("listingId", ParseUUIDPipe) listingId: string,
    @CurrentUser("id") userId: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 }),
          new ImageFileValidator(),
        ],
      }),
    )
    file: Express.Multer.File,
    @Query("primary") primary?: string,
  ) {
    const url = `/uploads/listings/${file.filename}`;
    const isPrimary = primary === "true";
    return this.listingsService.addImage(listingId, userId, url, isPrimary);
  }
}
