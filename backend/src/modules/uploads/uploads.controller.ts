import {
  Controller,
  Post,
  Param,
  ParseUUIDPipe,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
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
import { Throttle } from "@nestjs/throttler";
import { WRITE_THROTTLE } from "../../common/throttle";
import {
  imageUploadOptions,
  ImageFileValidator,
} from "../../common/image-upload.utils";

@ApiTags("Uploads")
@ApiBearerAuth()
@Controller("uploads")
export class UploadsController {
  constructor(private readonly listingsService: ListingsService) {}

  @Throttle(WRITE_THROTTLE)
  @Post("listings/:listingId")
  @ApiOperation({ summary: "Upload an image for a listing (alias)" })
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      properties: { file: { type: "string", format: "binary" } },
    },
  })
  @UseInterceptors(FileInterceptor("file", imageUploadOptions))
  async uploadImage(
    @Param("listingId", ParseUUIDPipe) listingId: string,
    @CurrentUser("id") userId: string,
    @UploadedFile(new ParseFilePipe({ validators: [new ImageFileValidator()] }))
    file: Express.Multer.File,
    @Query("primary") primary?: string,
  ) {
    return this.listingsService.addImage(
      listingId,
      userId,
      file.buffer,
      primary === "true",
    );
  }
}
