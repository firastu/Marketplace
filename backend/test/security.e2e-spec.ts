import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { User } from "../src/modules/users/user.entity";
import { TestApp, auth, connected, nextEvent, receives } from "./helpers";

describe("Auth, authorization & hardening", () => {
  let t: TestApp;

  beforeAll(async () => {
    t = await TestApp.create();
  });
  afterAll(() => t.close());

  describe("deactivated accounts", () => {
    it("can't log in, can't use an existing token, can't open a socket", async () => {
      const u = await t.user("banned");
      await t.db.query(`UPDATE users SET is_active = false WHERE id = $1`, [
        u.id,
      ]);

      await t
        .http()
        .post("/api/auth/login")
        .send({ email: u.email, password: "password123" })
        .expect(403);
      await t
        .http()
        .get("/api/auth/me")
        .set(...auth(u))
        .expect(401);

      const socket = t.socket(u.token);
      try {
        expect(await connected(socket)).toBe(false);
      } finally {
        socket.disconnect();
      }
    });

    it("wrong password is still a plain 401", async () => {
      const u = await t.user();
      await t
        .http()
        .post("/api/auth/login")
        .send({ email: u.email, password: "wrong-password" })
        .expect(401);
    });
  });

  describe("WebSocket conversation rooms", () => {
    it("only participants can join a conversation and receive its messages", async () => {
      const seller = await t.user("seller");
      const buyer = await t.user("buyer");
      const stranger = await t.user("stranger");
      const listing = await t.listing(seller);
      const conv = await t.conversation(buyer, listing.id);

      const spy = t.socket(stranger.token);
      const participant = t.socket(buyer.token);
      try {
        expect(await connected(spy)).toBe(true);
        expect(await connected(participant)).toBe(true);

        expect(
          await spy
            .timeout(3000)
            .emitWithAck("joinConversation", { conversationId: conv.id }),
        ).toEqual({
          ok: false,
          error: "Conversation not found",
        });
        expect(
          await spy
            .timeout(3000)
            .emitWithAck("joinConversation", { conversationId: "nope" }),
        ).toEqual({
          ok: false,
          error: "Invalid conversation ID",
        });
        expect(
          await participant
            .timeout(3000)
            .emitWithAck("joinConversation", { conversationId: conv.id }),
        ).toEqual({
          ok: true,
        });

        const spyGets = receives(spy, "newMessage");
        const participantGets = receives(participant, "newMessage");
        await t
          .http()
          .post(`/api/conversations/${conv.id}/messages`)
          .set(...auth(seller))
          .send({ body: "private offer" })
          .expect(201);
        expect(await participantGets).toBe(true);
        expect(await spyGets).toBe(false);
      } finally {
        spy.disconnect();
        participant.disconnect();
      }
    });

    it("a join sent the moment the socket connects is not lost while the user is still being looked up", async () => {
      const seller = await t.user("seller");
      const buyer = await t.user("buyer");
      const listing = await t.listing(seller);
      const conv = await t.conversation(buyer, listing.id);

      // A slow database: the lookup takes longer than the client needs to
      // send its first event after the transport connects.
      const users: Repository<User> = t.app.get(getRepositoryToken(User));
      const realFindOne = users.findOne.bind(users);
      const slow = jest
        .spyOn(users, "findOne")
        .mockImplementation(async (...args) => {
          await new Promise((r) => setTimeout(r, 300));
          return realFindOne(...args);
        });

      // Exactly what the web client does: emit without waiting.
      const s = t.socket(buyer.token);
      try {
        expect(
          await s
            .timeout(5000)
            .emitWithAck("joinConversation", { conversationId: conv.id }),
        ).toEqual({ ok: true });
        slow.mockRestore();

        const gets = receives(s, "newMessage", 2000);
        await t
          .http()
          .post(`/api/conversations/${conv.id}/messages`)
          .set(...auth(seller))
          .send({ body: "Yes, still available" })
          .expect(201);
        expect(await gets).toBe(true);
      } finally {
        slow.mockRestore();
        s.disconnect();
      }
    });

    it("reading a conversation refreshes the reader's unread badge", async () => {
      const seller = await t.user("seller");
      const buyer = await t.user("buyer");
      const stranger = await t.user("stranger");
      const listing = await t.listing(seller);
      const unread = async () =>
        (
          await t
            .http()
            .get("/api/conversations/unread-count")
            .set(...auth(seller))
            .expect(200)
        ).body.count;

      const s = t.socket(seller.token);
      try {
        expect(await connected(s)).toBe(true);
        let changed = nextEvent(s, "unreadCountChanged");
        const conv = await t.conversation(buyer, listing.id);
        await changed;
        expect(await unread()).toBe(1);

        // Opening the thread marks it read and announces the new count.
        changed = nextEvent(s, "unreadCountChanged");
        await t
          .http()
          .get(`/api/conversations/${conv.id}/messages`)
          .set(...auth(seller))
          .expect(200);
        await changed;
        expect(await unread()).toBe(0);

        // A message arriving while the thread is open: mark read without
        // reloading the thread.
        changed = nextEvent(s, "unreadCountChanged");
        await t
          .http()
          .post(`/api/conversations/${conv.id}/messages`)
          .set(...auth(buyer))
          .send({ body: "Can you do 250?" })
          .expect(201);
        await changed;
        expect(await unread()).toBe(1);

        await t
          .http()
          .post(`/api/conversations/${conv.id}/read`)
          .set(...auth(stranger))
          .expect(403);
        expect(await unread()).toBe(1);

        changed = nextEvent(s, "unreadCountChanged");
        const res = await t
          .http()
          .post(`/api/conversations/${conv.id}/read`)
          .set(...auth(seller))
          .expect(200);
        expect(res.body).toEqual({ updated: 1 });
        await changed;
        expect(await unread()).toBe(0);

        // Nothing left to mark: no event, no error.
        const quiet = receives(s, "unreadCountChanged", 400);
        await t
          .http()
          .post(`/api/conversations/${conv.id}/read`)
          .set(...auth(seller))
          .expect(200, { updated: 0 });
        expect(await quiet).toBe(false);
      } finally {
        s.disconnect();
      }
    });

    it("rejects sockets without a valid token", async () => {
      for (const token of [undefined, "garbage"]) {
        const s = t.socket(token);
        try {
          expect(await connected(s)).toBe(false);
        } finally {
          s.disconnect();
        }
      }
    });
  });

  describe("reviews", () => {
    it("require a real conversation in which the reviewed user replied", async () => {
      const seller = await t.user("seller");
      const buyer = await t.user("buyer");
      const stranger = await t.user("stranger");
      const listing = await t.listing(seller);
      const review = {
        reviewedUserId: seller.id,
        listingId: listing.id,
        rating: 4,
      };

      // Never talked
      await t
        .http()
        .post("/api/reviews")
        .set(...auth(stranger))
        .send(review)
        .expect(403);

      // Buyer wrote, seller hasn't answered yet
      const conv = await t.conversation(buyer, listing.id);
      await t
        .http()
        .post("/api/reviews")
        .set(...auth(buyer))
        .send(review)
        .expect(403);

      await t
        .http()
        .post(`/api/conversations/${conv.id}/messages`)
        .set(...auth(seller))
        .send({ body: "Yes available" })
        .expect(201);
      await t
        .http()
        .post("/api/reviews")
        .set(...auth(buyer))
        .send(review)
        .expect(201);
      await t
        .http()
        .post("/api/reviews")
        .set(...auth(buyer))
        .send(review)
        .expect(409);

      // listingId is now required
      await t
        .http()
        .post("/api/reviews")
        .set(...auth(buyer))
        .send({ reviewedUserId: seller.id, rating: 5 })
        .expect(400);
    });
  });

  it("rejects messages over 5000 characters", async () => {
    const seller = await t.user("seller");
    const buyer = await t.user("buyer");
    const listing = await t.listing(seller);
    await t
      .http()
      .post("/api/conversations")
      .set(...auth(buyer))
      .send({ listingId: listing.id, body: "x".repeat(5001) })
      .expect(400);
  });

  describe("HTTP hardening", () => {
    it("sends security headers", async () => {
      const res = await t.http().get("/api/categories").expect(200);
      expect(res.headers["x-content-type-options"]).toBe("nosniff");
      expect(res.headers["x-powered-by"]).toBeUndefined();
    });

    it("only allows configured CORS origins", async () => {
      const ok = await t
        .http()
        .get("/api/categories")
        .set("Origin", "http://allowed.test");
      expect(ok.headers["access-control-allow-origin"]).toBe(
        "http://allowed.test",
      );
      const blocked = await t
        .http()
        .get("/api/categories")
        .set("Origin", "http://evil.test");
      expect(blocked.headers["access-control-allow-origin"]).toBeUndefined();
    });
  });

  describe("rate limiting", () => {
    const saved = { ...process.env };
    afterEach(() => {
      process.env.THROTTLE_DISABLED = saved.THROTTLE_DISABLED;
      process.env.THROTTLE_AUTH_LIMIT = saved.THROTTLE_AUTH_LIMIT;
      process.env.THROTTLE_WRITE_LIMIT = saved.THROTTLE_WRITE_LIMIT;
    });

    it("limits login attempts", async () => {
      const u = await t.user();
      process.env.THROTTLE_DISABLED = "false";
      process.env.THROTTLE_AUTH_LIMIT = "3";
      const attempt = () =>
        t
          .http()
          .post("/api/auth/login")
          .send({ email: u.email, password: "wrong-password" });
      for (let i = 0; i < 3; i++) expect((await attempt()).status).toBe(401);
      expect((await attempt()).status).toBe(429);
    });

    it("doesn't interfere with WebSocket events when enabled", async () => {
      const seller = await t.user("seller");
      const buyer = await t.user("buyer");
      const listing = await t.listing(seller);
      const conv = await t.conversation(buyer, listing.id);
      process.env.THROTTLE_DISABLED = "false";
      process.env.THROTTLE_WRITE_LIMIT = "1";
      const s = t.socket(buyer.token);
      try {
        expect(await connected(s)).toBe(true);
        for (let i = 0; i < 3; i++) {
          expect(
            await s
              .timeout(3000)
              .emitWithAck("joinConversation", { conversationId: conv.id }),
          ).toEqual({ ok: true });
        }
      } finally {
        s.disconnect();
      }
    });

    it("counts logged-in users separately even from the same IP", async () => {
      const seller = await t.user("seller");
      const a = await t.user("a");
      const b = await t.user("b");
      const listing = await t.listing(seller);
      const convA = await t.conversation(a, listing.id);
      const convB = await t.conversation(b, listing.id);

      process.env.THROTTLE_DISABLED = "false";
      process.env.THROTTLE_WRITE_LIMIT = "2";
      const send = (user: typeof a, convId: string) =>
        t
          .http()
          .post(`/api/conversations/${convId}/messages`)
          .set(...auth(user))
          .send({ body: "spam?" });

      expect((await send(a, convA.id)).status).toBe(201);
      expect((await send(a, convA.id)).status).toBe(201);
      expect((await send(a, convA.id)).status).toBe(429);
      // Same IP (all requests are from localhost), different account
      expect((await send(b, convB.id)).status).toBe(201);
    });
  });
});
