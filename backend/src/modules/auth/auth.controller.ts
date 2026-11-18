import {
  Controller,
  Post,
  Body,
  Get,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { AuthService } from "./auth.service";
import { UsersService } from "../users/users.service";
import { RegisterDto, LoginDto } from "./dto/auth.dto";
import { Public } from "./public.decorator";
import { CurrentUser } from "./current-user.decorator";
import { Throttle } from "@nestjs/throttler";
import { AUTH_THROTTLE } from "../../common/throttle";
import { toSelfUser } from "../users/user-views";

@ApiTags("Auth")
@Controller("auth")
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
  ) {}

  @Public()
  @Throttle(AUTH_THROTTLE)
  @Post("register")
  @ApiOperation({ summary: "Register a new user" })
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Public()
  @Throttle(AUTH_THROTTLE)
  @Post("login")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Login with email and password" })
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Get("me")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get current authenticated user" })
  async me(@CurrentUser("id") userId: string) {
    const user = await this.usersService.findById(userId);
    return toSelfUser(user);
  }
}
