import {
  TestApp,
  auth,
  findSensitiveKeys,
  nextEvent,
  connected,
} from "./helpers";

describe("User data privacy", () => {
  let t: TestApp;

  beforeAll(async () => {
    t = await TestApp.create();
  });
  afterAll(() => t.close());

  it("public listing endpoints expose no password hash, email or phone", async () => {
    const seller = await t.user("seller");
    await t.db.query(`UPDATE users SET phone = '+963900000000' WHERE id = $1`, [
      seller.id,
    ]);
    const listing = await t.listing(seller);

    const list = await t.http().get("/api/listings").expect(200);
    expect(list.body.data.length).toBeGreaterThan(0);
    expect(findSensitiveKeys(list.body)).toEqual([]);
    expect(JSON.stringify(list.body)).not.toContain("$2b$");

    const detail = await t
      .http()
      .get(`/api/listings/${listing.id}`)
      .expect(200);
    expect(detail.body.user.username).toBe(seller.username);
    expect(findSensitiveKeys(detail.body)).toEqual([]);
    expect(JSON.stringify(detail.body)).not.toContain("+963900000000");
  });

  it("public profile hides contact details", async () => {
    const u = await t.user();
    const res = await t.http().get(`/api/users/${u.id}`).expect(200);
    expect(res.body.username).toBe(u.username);
    expect(findSensitiveKeys(res.body)).toEqual([]);
  });

  it("the account owner still sees their own email, but never the hash", async () => {
    const u = await t.user();
    const me = await t
      .http()
      .get("/api/auth/me")
      .set(...auth(u))
      .expect(200);
    expect(me.body.email).toBe(u.email);
    expect(me.body.passwordHash).toBeUndefined();

    const login = await t
      .http()
      .post("/api/auth/login")
      .send({ email: u.email, password: "password123" })
      .expect(200);
    expect(login.body.user.email).toBe(u.email);
    expect(login.body.user.passwordHash).toBeUndefined();
  });

  it("login email is case-insensitive", async () => {
    const u = await t.user();
    await t
      .http()
      .post("/api/auth/login")
      .send({ email: u.email.toUpperCase(), password: "password123" })
      .expect(200);
  });

  it("conversations, messages and reviews don't leak the other user's details", async () => {
    const seller = await t.user("seller");
    const buyer = await t.user("buyer");
    const listing = await t.listing(seller);
    const conv = await t.conversation(buyer, listing.id);
    await t
      .http()
      .post(`/api/conversations/${conv.id}/messages`)
      .set(...auth(seller))
      .send({ body: "Yes, still available" })
      .expect(201);

    const convs = await t
      .http()
      .get("/api/conversations")
      .set(...auth(buyer))
      .expect(200);
    expect(convs.body[0].seller.username).toBe(seller.username);
    expect(findSensitiveKeys(convs.body)).toEqual([]);

    const msgs = await t
      .http()
      .get(`/api/conversations/${conv.id}/messages`)
      .set(...auth(buyer))
      .expect(200);
    expect(msgs.body).toHaveLength(2);
    expect(findSensitiveKeys(msgs.body)).toEqual([]);

    await t
      .http()
      .post("/api/reviews")
      .set(...auth(buyer))
      .send({ reviewedUserId: seller.id, listingId: listing.id, rating: 5 })
      .expect(201);
    const reviews = await t
      .http()
      .get(`/api/reviews/user/${seller.id}`)
      .expect(200);
    expect(reviews.body).toHaveLength(1);
    expect(findSensitiveKeys(reviews.body)).toEqual([]);
  });

  it("WebSocket message payloads only carry the sender's public fields", async () => {
    const seller = await t.user("seller");
    const buyer = await t.user("buyer");
    const listing = await t.listing(seller);
    const conv = await t.conversation(buyer, listing.id);

    const socket = t.socket(buyer.token);
    try {
      expect(await connected(socket)).toBe(true);
      const ack = await socket
        .timeout(3000)
        .emitWithAck("joinConversation", { conversationId: conv.id });
      expect(ack).toEqual({ ok: true });

      const incoming = nextEvent<any>(socket, "newMessage");
      await t
        .http()
        .post(`/api/conversations/${conv.id}/messages`)
        .set(...auth(seller))
        .send({ body: "Hello from the seller" })
        .expect(201);
      const msg = await incoming;
      expect(msg.body).toBe("Hello from the seller");
      expect(msg.sender.username).toBe(seller.username);
      expect(findSensitiveKeys(msg)).toEqual([]);
    } finally {
      socket.disconnect();
    }
  });
});
