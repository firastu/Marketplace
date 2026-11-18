import {
  Injectable,
  ConflictException,
  ForbiddenException,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";
import { UsersService } from "../users/users.service";
import { RegisterDto, LoginDto } from "./dto/auth.dto";
import { toSelfUser } from "../users/user-views";

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const existingEmail = await this.usersService.findByEmail(dto.email);
    if (existingEmail) {
      throw new ConflictException("Email already registered");
    }

    const existingUsername = await this.usersService.findByUsername(
      dto.username,
    );
    if (existingUsername) {
      throw new ConflictException("Username already taken");
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const user = await this.usersService.create({
      email: dto.email,
      username: dto.username,
      passwordHash: hashedPassword,
      ...(dto.displayName ? { displayName: dto.displayName } : {}),
    });

    return { user: toSelfUser(user), accessToken: this.generateToken(user) };
  }

  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmailWithPassword(dto.email);
    if (!user) {
      throw new UnauthorizedException("Invalid credentials");
    }

    const passwordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordValid) {
      throw new UnauthorizedException("Invalid credentials");
    }

    // Checked after the password so this doesn't reveal which emails exist.
    if (!user.isActive) {
      throw new ForbiddenException("This account has been deactivated");
    }

    const updated = await this.usersService.update(user.id, {
      lastLoginAt: new Date(),
    });
    return {
      user: toSelfUser(updated),
      accessToken: this.generateToken(updated),
    };
  }

  private generateToken(user: {
    id: string;
    email: string;
    role: string;
  }): string {
    return this.jwtService.sign({
      sub: user.id,
      email: user.email,
      role: user.role,
    });
  }
}
