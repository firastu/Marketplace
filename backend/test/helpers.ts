import { Test } from "@nestjs/testing";
import { NestExpressApplication } from "@nestjs/platform-express";
import { DataSource } from "typeorm";
import request from "supertest";
import sharp from "sharp";
import { AddressInfo } from "net";
import { io, Socket } from "socket.io-client";
import { AppModule } from "../src/app.module";
import { configureApp } from "../src/app.setup";

export interface TestUser {
  id: string;
  token: string;
  email: string;
  username: string;
}

export class TestApp {
  private counter = 0;

  constructor(
    readonly app: NestExpressApplication,
    readonly db: DataSource,
    readonly port: number,
  ) {}

  static async create(): Promise<TestApp> {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    const app = moduleRef.createNestApplication<NestExpressApplication>({
      logger: ["error"],
    });
    configureApp(app);
    await app.listen(0);
    const { port } = app.getHttpServer().address() as AddressInfo;
    return new TestApp(app, app.get(DataSource), port);
  }

  close() {
    return this.app.close();
  }

  http() {
    return request(this.app.getHttpServer());
  }

  async user(label = "user"): Promise<TestUser> {
    const n = `${label}${Date.now().toString(36)}${this.counter++}`;
    const email = `${n}@test.dev`;
    const res = await this.http()
      .post("/api/auth/register")
      .send({ email, username: n, password: "password123", displayName: n })
      .expect(201);
    return {
      id: res.body.user.id,
      token: res.body.accessToken,
      email,
      username: n,
    };
  }

  async categoryIds(): Promise<{
    root: string;
    child: string;
    otherRoot: string;
  }> {
    const res = await this.http().get("/api/categories").expect(200);
    const electronics = res.body.find((c: any) => c.slug === "electronics");
    const vehicles = res.body.find((c: any) => c.slug === "vehicles");
    return {
      root: electronics.id,
      child: electronics.children.find((c: any) => c.slug === "smartphones").id,
      otherRoot: vehicles.id,
    };
  }

  async listing(owner: TestUser, overrides: Record<string, unknown> = {}) {
    const { child } = await this.categoryIds();
    const res = await this.http()
      .post("/api/listings")
      .set("Authorization", `Bearer ${owner.token}`)
      .send({
        categoryId: child,
        title: "Samsung Galaxy S23",
        description: "Phone in very good condition, with charger.",
        price: 300,
        ...overrides,
      })
      .expect(201);
    return res.body;
  }

  upload(
    owner: TestUser,
    listingId: string,
    buffer: Buffer,
    filename = "photo.png",
    contentType = "image/png",
  ) {
    return this.http()
      .post(`/api/listings/${listingId}/images`)
      .set("Authorization", `Bearer ${owner.token}`)
      .attach("file", buffer, { filename, contentType });
  }

  async conversation(
    buyer: TestUser,
    listingId: string,
    body = "Is it still available?",
  ) {
    const res = await this.http()
      .post("/api/conversations")
      .set("Authorization", `Bearer ${buyer.token}`)
      .send({ listingId, body })
      .expect(201);
    return res.body.conversation;
  }

  socket(token?: string): Socket {
    return io(`http://localhost:${this.port}/chat`, {
      auth: token ? { token } : {},
      transports: ["websocket"],
      reconnection: false,
      forceNew: true,
    });
  }
}

export function png(
  color = "#cc3333",
  width = 64,
  height = 48,
): Promise<Buffer> {
  return sharp({ create: { width, height, channels: 3, background: color } })
    .png()
    .toBuffer();
}

export function auth(user: TestUser): [string, string] {
  return ["Authorization", `Bearer ${user.token}`];
}

/** Resolve with the first event of that name, or reject after `ms`. */
export function nextEvent<T = unknown>(
  socket: Socket,
  event: string,
  ms = 1500,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`no ${event} within ${ms}ms`)),
      ms,
    );
    socket.once(event, (data: T) => {
      clearTimeout(timer);
      resolve(data);
    });
  });
}

/** Resolve true if the event arrives within `ms`, false otherwise. */
export function receives(
  socket: Socket,
  event: string,
  ms = 700,
): Promise<boolean> {
  return nextEvent(socket, event, ms).then(
    () => true,
    () => false,
  );
}

/**
 * Resolve true if the socket is (still) connected shortly after connecting.
 * The server authenticates in handleConnection and may disconnect right
 * after the transport-level connect, hence the settle delay.
 */
export function connected(socket: Socket, ms = 3000): Promise<boolean> {
  const settle = () =>
    new Promise<boolean>((r) => setTimeout(() => r(socket.connected), 300));
  if (socket.connected) return settle();
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(false), ms);
    const done = (value: boolean | Promise<boolean>) => {
      clearTimeout(timer);
      resolve(value);
    };
    socket.once("connect", () => done(settle()));
    socket.once("disconnect", () => done(false));
    socket.once("connect_error", () => done(false));
  });
}

export const SENSITIVE_USER_KEYS = [
  "passwordHash",
  "email",
  "phone",
  "role",
  "lastLoginAt",
];

/** Fail if any nested object in `body` carries a sensitive user field. */
export function findSensitiveKeys(body: unknown, path = "$"): string[] {
  if (Array.isArray(body)) {
    return body.flatMap((item, i) => findSensitiveKeys(item, `${path}[${i}]`));
  }
  if (body && typeof body === "object") {
    return Object.entries(body as Record<string, unknown>).flatMap(([k, v]) => [
      ...(SENSITIVE_USER_KEYS.includes(k) ? [`${path}.${k}`] : []),
      ...findSensitiveKeys(v, `${path}.${k}`),
    ]);
  }
  return [];
}
