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

@ApiTags("Auth")
@Controller("auth")
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
  ) {}

  @Public()
  @Post("register")
  @ApiOperation({ summary: "Register a new user" })
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Public()
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
    // eslint-disable-next-line @typescript-eslint/no-unused-vars,@typescript-eslint/no-explicit-any
    const { passwordHash, ...result } = user as any;
    return result;
  }
}
