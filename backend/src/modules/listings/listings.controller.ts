import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
} from "@nestjs/swagger";
import { ListingsService } from "./listings.service";
import { CreateListingDto } from "./dto/create-listing.dto";
import { UpdateListingDto } from "./dto/update-listing.dto";
import { UpdateListingStatusDto } from "./dto/update-listing-status.dto";
import { GetListingsQueryDto } from "./dto/get-listings-query.dto";
import { Public } from "../auth/public.decorator";
import { CurrentUser } from "../auth/current-user.decorator";
import {
  imageDiskStorage,
  ImageFileValidator,
} from "../../common/image-upload.utils";

@ApiTags("Listings")
@Controller("listings")
export class ListingsController {
  constructor(private readonly listingsService: ListingsService) {}

  // ── Listing image sub-resource ────────────────────────────────────────────

  @Get(":listingId/images")
  @ApiOperation({ summary: "Get all images for a listing" })
  async getListingImages(@Param("listingId", ParseUUIDPipe) listingId: string) {
    return this.listingsService.getListingImages(listingId);
  }

  @Post(":listingId/images")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Upload an image for a listing" })
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

  @Patch(":listingId/images/order")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Reorder listing images" })
  async reorderImages(
    @Param("listingId", ParseUUIDPipe) listingId: string,
    @CurrentUser("id") userId: string,
    @Body() body: { imageIds: string[] },
  ) {
    await this.listingsService.reorderImages(listingId, userId, body.imageIds);
    return { message: "Images reordered" };
  }

  @Patch(":listingId/images/:imageId/cover")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Set an image as the cover" })
  async setCover(
    @Param("listingId", ParseUUIDPipe) listingId: string,
    @Param("imageId", ParseUUIDPipe) imageId: string,
    @CurrentUser("id") userId: string,
  ) {
    return this.listingsService.setCoverImage(listingId, imageId, userId);
  }

  @Delete(":listingId/images/:imageId")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Delete a listing image" })
  async deleteImage(
    @Param("listingId", ParseUUIDPipe) _listingId: string,
    @Param("imageId", ParseUUIDPipe) imageId: string,
    @CurrentUser("id") userId: string,
  ) {
    await this.listingsService.removeImage(imageId, userId);
    return { message: "Image deleted" };
  }

  // ── Listing CRUD ─────────────────────────────────────────────────────────

  @Public()
  @Get()
  @ApiOperation({ summary: "Get all active listings (paginated, filterable)" })
  async getAll(@Query() query: GetListingsQueryDto) {
    const { page = 1, limit = 20, ...filters } = query;
    return this.listingsService.findAll({ page, limit }, filters);
  }

  @Get("my")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get my listings" })
  async getMyListings(
    @CurrentUser("id") userId: string,
    @Query() query: GetListingsQueryDto,
  ) {
    const { page = 1, limit = 20 } = query;
    return this.listingsService.findByUser(userId, { page, limit });
  }

  @Public()
  @Get(":id")
  @ApiOperation({ summary: "Get listing by ID" })
  async getById(@Param("id", ParseUUIDPipe) id: string) {
    return this.listingsService.findById(id);
  }

  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: "Create a new listing" })
  async create(
    @CurrentUser("id") userId: string,
    @Body() dto: CreateListingDto,
  ) {
    return this.listingsService.create(userId, dto);
  }

  @Put(":id")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Update a listing" })
  async update(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser("id") userId: string,
    @Body() dto: UpdateListingDto,
  ) {
    return this.listingsService.update(id, userId, dto);
  }

  @Patch(":id/status")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Change listing status (sold, reserved, etc.)" })
  async updateStatus(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser("id") userId: string,
    @Body() dto: UpdateListingStatusDto,
  ) {
    return this.listingsService.updateStatus(id, userId, dto.status);
  }

  @Delete(":id")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Delete a listing" })
  async remove(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser("id") userId: string,
  ) {
    await this.listingsService.remove(id, userId);
    return { message: "Listing deleted" };
  }
}
