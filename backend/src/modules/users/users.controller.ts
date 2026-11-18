import {
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseUUIDPipe,
} from "@nestjs/common";
import { ApiTags, ApiOperation } from "@nestjs/swagger";
import { UsersService } from "./users.service";
import { Public } from "../auth/public.decorator";
import { toPublicUser } from "./user-views";

@ApiTags("Users")
@Controller("users")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Public()
  @Get(":id")
  @ApiOperation({ summary: "Get a user's public profile by ID" })
  async getUser(@Param("id", ParseUUIDPipe) id: string) {
    const user = await this.usersService.findById(id);
    if (user.deletedAt) throw new NotFoundException("User not found");
    return toPublicUser(user);
  }
}
