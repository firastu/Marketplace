import { INestApplicationContext, ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestExpressApplication } from "@nestjs/platform-express";
import { IoAdapter } from "@nestjs/platform-socket.io";
import type { ServerOptions } from "socket.io";
import type { NextFunction, Request, Response } from "express";
import helmet from "helmet";
import { UPLOADS_DIR } from "./common/image-upload.utils";
import { DatabaseExceptionFilter } from "./common/database-exception.filter";

type CorsOrigin = true | string[];

const DEFAULT_DEV_ORIGINS = ["http://localhost:3000", "http://127.0.0.1:3000"];

/**
 * CORS_ORIGINS="https://example.sy,https://www.example.sy" → that list.
 * CORS_ORIGINS="*" → any origin (only for LAN testing).
 * Unset → the local Next.js dev server only.
 */
export function parseCorsOrigins(raw?: string): CorsOrigin {
  const value = raw?.trim();
  if (!value) return DEFAULT_DEV_ORIGINS;
  if (value === "*") return true;
  return value
    .split(",")
    .map((origin) => origin.trim().replace(/\/$/, ""))
    .filter(Boolean);
}

/** Socket.IO server that uses the same CORS allowlist as the REST API. */
class CorsIoAdapter extends IoAdapter {
  constructor(
    app: INestApplicationContext,
    private readonly origin: CorsOrigin,
  ) {
    super(app);
  }

  createIOServer(port: number, options?: ServerOptions) {
    return super.createIOServer(port, {
      ...options,
      cors: { origin: this.origin, credentials: true },
    });
  }
}

/**
 * Original uploads keep the camera's EXIF data (often including GPS
 * coordinates of the seller's home) and are stored for reprocessing only.
 * Only the re-encoded, metadata-free variants are public.
 *
 * The check runs on the path the way the static file server will resolve
 * it: percent-decoded and split on any run of slashes. Matching the raw
 * URL let "/%6Friginal/", "//original/" or "/thumb/../original/" through.
 */
export function isPrivateUploadPath(rawPath: string): boolean {
  let decoded: string;
  try {
    decoded = decodeURIComponent(rawPath);
  } catch {
    return true;
  }
  if (decoded.includes("\0")) return true;
  return decoded
    .split(/[\\/]+/)
    .some((segment) => segment.toLowerCase() === "original");
}

function blockOriginalUploads(req: Request, res: Response, next: NextFunction) {
  if (isPrivateUploadPath(req.path)) {
    res.status(404).end();
    return;
  }
  next();
}

/**
 * Everything both main.ts and the e2e tests need, so tests exercise the
 * real HTTP configuration (security headers, CORS, validation, uploads).
 */
export function configureApp(app: NestExpressApplication): void {
  const config = app.get(ConfigService);

  // Behind nginx / a load balancer, set TRUST_PROXY (e.g. "1") so rate
  // limiting sees the client's IP instead of the proxy's.
  const trustProxy = config.get<string>("TRUST_PROXY");
  if (trustProxy) {
    const asNumber = Number(trustProxy);
    app.set("trust proxy", Number.isNaN(asNumber) ? trustProxy : asNumber);
  }

  app.setGlobalPrefix("api");

  app.use(
    helmet({
      // Images are loaded by the frontend from another origin (or a CDN).
      crossOriginResourcePolicy: { policy: "cross-origin" },
    }),
  );

  app.use("/uploads", blockOriginalUploads);
  // File names are random UUIDs that never change content, so clients on
  // slow connections can cache them for a long time.
  app.useStaticAssets(UPLOADS_DIR, {
    prefix: "/uploads",
    index: false,
    dotfiles: "deny",
    maxAge: "30d",
    immutable: true,
  });

  const origins = parseCorsOrigins(config.get<string>("CORS_ORIGINS"));
  app.enableCors({ origin: origins, credentials: true });
  app.useWebSocketAdapter(new CorsIoAdapter(app, origins));

  app.useGlobalFilters(new DatabaseExceptionFilter());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
}
