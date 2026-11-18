import { ExecutionContext, Injectable } from "@nestjs/common";
import { ThrottlerGuard } from "@nestjs/throttler";
import { timingSafeEqual } from "crypto";

const MINUTE = 60_000;

/** Read a positive integer from the environment at request time. */
const envInt = (name: string, fallback: number) => () => {
  const value = Number(process.env[name]);
  return Number.isInteger(value) && value > 0 ? value : fallback;
};

/** Every route: generous, only stops runaway clients and scrapers. */
export const DEFAULT_THROTTLE = {
  name: "default",
  ttl: MINUTE,
  limit: envInt("THROTTLE_LIMIT", 300),
};

/** Login / register: slows password guessing and mass sign-ups. */
export const AUTH_THROTTLE = {
  default: { ttl: MINUTE, limit: envInt("THROTTLE_AUTH_LIMIT", 20) },
};

/** Creating listings, uploading images, sending messages: anti-spam. */
export const WRITE_THROTTLE = {
  default: { ttl: MINUTE, limit: envInt("THROTTLE_WRITE_LIMIT", 60) },
};

/**
 * Logged-in requests are counted per user, guests per IP. Syrian mobile
 * carriers put many customers behind one public IP (carrier-grade NAT), so
 * per-IP limits alone would block unrelated people sharing an address.
 *
 * Registered right after JwtAuthGuard in AuthModule so req.user is set.
 */
@Injectable()
export class UserAwareThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: {
    user?: { id?: string };
    ip?: string;
  }): Promise<string> {
    const userId = req.user?.id;
    return userId ? `user:${userId}` : `ip:${req.ip}`;
  }

  protected async shouldSkip(context: ExecutionContext): Promise<boolean> {
    if (process.env.THROTTLE_DISABLED === "true") return true;
    const req = context.switchToHttp().getRequest<{
      headers?: Record<string, string | string[] | undefined>;
    }>();
    return isInternalRequest(req?.headers?.["x-internal-key"]);
  }
}

/**
 * True when the request carries the INTERNAL_API_KEY shared with the web
 * app's server (server-side rendering). Those requests come from one IP for
 * all visitors and must not share a guest rate-limit bucket. The key must
 * be at least 32 characters; it is compared in constant time.
 */
export function isInternalRequest(
  header: string | string[] | undefined,
): boolean {
  const key = process.env.INTERNAL_API_KEY ?? "";
  if (key.length < 32 || typeof header !== "string") return false;
  const a = Buffer.from(header);
  const b = Buffer.from(key);
  return a.length === b.length && timingSafeEqual(a, b);
}
