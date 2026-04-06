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
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { ListingsService } from "./listings.service";
import { CreateListingDto } from "./dto/create-listing.dto";
import { UpdateListingDto } from "./dto/update-listing.dto";
import { UpdateListingStatusDto } from "./dto/update-listing-status.dto";
import { GetListingsQueryDto } from "./dto/get-listings-query.dto";
import { Public } from "../auth/public.decorator";
import { CurrentUser } from "../auth/current-user.decorator";

@ApiTags("Listings")
@Controller("listings")
export class ListingsController {
  constructor(private readonly listingsService: ListingsService) {}

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
