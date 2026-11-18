import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { ConfigService } from "@nestjs/config";
import { UsersService } from "../users/users.service";
import { isTokenCurrent } from "./token-validity";

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  /** Account token version at issue time (see isTokenCurrent). */
  tv?: number;
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
   * Re-reads the user on every request so that deactivating or deleting an
   * account, changing its role, or changing its password (which signs out
   * other sessions) takes effect immediately instead of when the 7-day
   * token expires.
   */
  async validate(payload: JwtPayload): Promise<AuthUser> {
    const user = await this.usersService
      .findById(payload.sub)
      .catch(() => null);
    if (!user || !isTokenCurrent(user, payload.tv)) {
      throw new UnauthorizedException("Session expired or account unavailable");
    }
    return { id: user.id, email: user.email, role: user.role };
  }
}
