import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { ConfigService } from "@nestjs/config";
import { UsersService } from "../users/users.service";

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
}

export interface AuthUser {
  id: string;
  email: string;
  role: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      // No fallback: a missing secret must stop the app, not silently make
      // every token forgeable with a well-known string.
      secretOrKey: config.getOrThrow<string>("JWT_SECRET"),
    });
  }

  /**
   * Re-reads the user on every request so that deactivating an account (or
   * changing its role) takes effect immediately instead of when the
   * 7-day token expires.
   */
  async validate(payload: JwtPayload): Promise<AuthUser> {
    const user = await this.usersService
      .findById(payload.sub)
      .catch(() => null);
    if (!user || !user.isActive) {
      throw new UnauthorizedException("Account not found or deactivated");
    }
    return { id: user.id, email: user.email, role: user.role };
  }
}
