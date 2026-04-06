import {
  Controller,
  Post,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { FavoritesService } from "./favorites.service";
import { CurrentUser } from "../auth/current-user.decorator";

@ApiTags("Favorites")
@ApiBearerAuth()
@Controller("favorites")
export class FavoritesController {
  constructor(private readonly favoritesService: FavoritesService) {}

  @Get()
  @ApiOperation({ summary: "Get my favorites" })
  async getMyFavorites(@CurrentUser("id") userId: string) {
    return this.favoritesService.getUserFavorites(userId);
  }

  @Post(":listingId")
  @ApiOperation({ summary: "Add listing to my favorites" })
  async add(
    @CurrentUser("id") userId: string,
    @Param("listingId", ParseUUIDPipe) listingId: string,
  ) {
    return this.favoritesService.addFavorite(userId, listingId);
  }

  @Delete(":listingId")
  @ApiOperation({ summary: "Remove listing from my favorites" })
  async remove(
    @CurrentUser("id") userId: string,
    @Param("listingId", ParseUUIDPipe) listingId: string,
  ) {
    return this.favoritesService.removeFavorite(userId, listingId);
  }
}
