import { Injectable, ExecutionContext } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { Reflector } from "@nestjs/core";
import { IS_PUBLIC_KEY } from "./public.decorator";

/**
 * Global guard. Routes marked @Public() are open to guests, but if the
 * caller does send a valid token we still attach the user, so public
 * routes can tell the owner apart (e.g. an owner viewing their own draft).
 * An invalid token on a public route is treated as a guest, not an error.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard("jwt") {
  constructor(private reflector: Reflector) {
    super();
  }

  private isPublic(context: ExecutionContext): boolean {
    return !!this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (this.isPublic(context)) {
      const req = context.switchToHttp().getRequest();
      if (!req.headers?.authorization) return true;
      try {
        await super.canActivate(context);
      } catch {
        // fall through as guest
      }
      return true;
    }
    return super.canActivate(context) as Promise<boolean>;
  }

  handleRequest<TUser>(
    err: unknown,
    user: TUser,
    info: unknown,
    context: ExecutionContext,
  ): TUser {
    if (this.isPublic(context)) {
      return (user || undefined) as TUser;
    }
    return super.handleRequest(err, user, info, context);
  }
}
