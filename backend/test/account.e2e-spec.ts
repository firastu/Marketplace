import { existsSync } from "fs";
import { join } from "path";
import {
  TestApp,
  TestUser,
  auth,
  png,
  connected,
  findSensitiveKeys,
} from "./helpers";
import { MailService } from "../src/modules/mail/mail.service";
import { RetentionService } from "../src/modules/account/retention.service";
import { TERMS_VERSION } from "../src/common/terms";

const tokenFrom = (text: string) => {
  const match = text.match(/reset-password\?token=([A-Za-z0-9_-]+)/);
  if (!match) throw new Error("no reset link in email");
  return match[1];
};

describe("Account recovery & GDPR self-service", () => {
  let t: TestApp;
  let mail: MailService;

  beforeAll(async () => {
    t = await TestApp.create();
    mail = t.app.get(MailService);
  });
  afterAll(() => t.close());
  beforeEach(() => mail.outbox.splice(0));

  describe("sign-up consent", () => {
    it("requires accepting the terms and records version and time", async () => {
      const base = {
        email: `c${Date.now()}@test.dev`,
        username: `c${Date.now()}`,
        password: "password123",
      };
      await t.http().post("/api/auth/register").send(base).expect(400);
      await t
        .http()
        .post("/api/auth/register")
        .send({ ...base, acceptTerms: false })
        .expect(400);
      const res = await t
        .http()
        .post("/api/auth/register")
        .send({ ...base, acceptTerms: true })
        .expect(201);
      expect(res.body.user.termsVersion).toBe(TERMS_VERSION);
      expect(new Date(res.body.user.termsAcceptedAt).getTime()).toBeGreaterThan(
        Date.now() - 60_000,
      );
    });
  });

  describe("password reset", () => {
    it("answers the same for unknown emails and sends nothing", async () => {
      const res = await t
        .http()
        .post("/api/auth/forgot-password")
        .send({ email: "nobody@test.dev" })
        .expect(200);
      expect(res.body.message).toMatch(/If an account exists/);
      expect(mail.outbox).toHaveLength(0);
    });

    it("emails a bilingual link that resets the password once and signs out old sessions", async () => {
      const u = await t.user("reset");
      const res = await t
        .http()
        .post("/api/auth/forgot-password")
        .send({ email: u.email.toUpperCase() })
        .expect(200);
      expect(res.body.message).toMatch(/If an account exists/);
      expect(mail.outbox).toHaveLength(1);
      expect(mail.outbox[0].to).toBe(u.email);
      expect(mail.outbox[0].text).toContain("إعادة تعيين كلمة المرور");
      expect(mail.outbox[0].text).toContain("reset the password");
      expect(mail.outbox[0].text).toContain(
        "http://localhost:3000/reset-password?token=",
      );
      const token = tokenFrom(mail.outbox[0].text);

      await t
        .http()
        .post("/api/auth/reset-password")
        .send({ token, password: "brand-new-pass" })
        .expect(200);

      await t
        .http()
        .get("/api/auth/me")
        .set(...auth(u))
        .expect(401);
      await t
        .http()
        .post("/api/auth/login")
        .send({ email: u.email, password: "password123" })
        .expect(401);
      await t
        .http()
        .post("/api/auth/login")
        .send({ email: u.email, password: "brand-new-pass" })
        .expect(200);

      const reuse = await t
        .http()
        .post("/api/auth/reset-password")
        .send({ token, password: "another-pass-1" })
        .expect(400);
      expect(reuse.body.message).toMatch(/invalid or has expired/);
    });

    it("uses the English link for locale en and only the latest link works", async () => {
      const u = await t.user("reset2");
      await t
        .http()
        .post("/api/auth/forgot-password")
        .send({ email: u.email, locale: "en" })
        .expect(200);
      await t
        .http()
        .post("/api/auth/forgot-password")
        .send({ email: u.email, locale: "en" })
        .expect(200);
      expect(mail.outbox[1].text).toContain("/en/reset-password?token=");
      const first = tokenFrom(mail.outbox[0].text);
      const second = tokenFrom(mail.outbox[1].text);
      await t
        .http()
        .post("/api/auth/reset-password")
        .send({ token: first, password: "brand-new-pass" })
        .expect(400);
      await t
        .http()
        .post("/api/auth/reset-password")
        .send({ token: second, password: "brand-new-pass" })
        .expect(200);
    });

    it("rejects expired links", async () => {
      const u = await t.user("reset3");
      await t
        .http()
        .post("/api/auth/forgot-password")
        .send({ email: u.email })
        .expect(200);
      await t.db.query(
        `UPDATE password_reset_tokens SET expires_at = NOW() - interval '1 minute' WHERE user_id = $1`,
        [u.id],
      );
      await t
        .http()
        .post("/api/auth/reset-password")
        .send({
          token: tokenFrom(mail.outbox[0].text),
          password: "brand-new-pass",
        })
        .expect(400);
    });

    it("sends nothing to deactivated accounts", async () => {
      const u = await t.user("reset4");
      await t.db.query(`UPDATE users SET is_active = false WHERE id = $1`, [
        u.id,
      ]);
      await t
        .http()
        .post("/api/auth/forgot-password")
        .send({ email: u.email })
        .expect(200);
      expect(mail.outbox).toHaveLength(0);
    });

    it("stores only a hash of the token", async () => {
      const u = await t.user("reset5");
      await t
        .http()
        .post("/api/auth/forgot-password")
        .send({ email: u.email })
        .expect(200);
      const token = tokenFrom(mail.outbox[0].text);
      const rows: { token_hash: string }[] = await t.db.query(
        `SELECT token_hash FROM password_reset_tokens WHERE user_id = $1`,
        [u.id],
      );
      expect(rows).toHaveLength(1);
      expect(rows[0].token_hash).not.toContain(token);
      expect(rows[0].token_hash).toMatch(/^[0-9a-f]{64}$/);
    });
  });

  describe("profile", () => {
    it("edits display name, bio and phone, normalising the phone", async () => {
      const u = await t.user("prof");
      const res = await t
        .http()
        .patch("/api/users/me")
        .set(...auth(u))
        .send({
          displayName: "  سامي  ",
          bio: "أبيع أجهزة مستعملة",
          phone: "+963 933-123 456",
        })
        .expect(200);
      expect(res.body).toMatchObject({
        displayName: "سامي",
        bio: "أبيع أجهزة مستعملة",
        phone: "+963933123456",
        email: u.email,
      });

      const cleared = await t
        .http()
        .patch("/api/users/me")
        .set(...auth(u))
        .send({ phone: "", bio: null })
        .expect(200);
      expect(cleared.body.phone).toBeNull();
      expect(cleared.body.bio).toBeNull();
      expect(cleared.body.displayName).toBe("سامي");

      await t
        .http()
        .patch("/api/users/me")
        .set(...auth(u))
        .send({ phone: "0933 123 456" })
        .expect(400);
      await t
        .http()
        .patch("/api/users/me")
        .set(...auth(u))
        .send({ email: "hijack@test.dev" })
        .expect(400);

      const pub = await t.http().get(`/api/users/${u.id}`).expect(200);
      expect(pub.body.displayName).toBe("سامي");
      expect(findSensitiveKeys(pub.body)).toEqual([]);
    });
  });

  describe("change password", () => {
    it("checks the current password, returns a new token and signs out other sessions", async () => {
      const u = await t.user("pw");
      await t
        .http()
        .post("/api/users/me/password")
        .set(...auth(u))
        .send({
          currentPassword: "wrong-password",
          newPassword: "new-password-1",
        })
        .expect(400);

      const res = await t
        .http()
        .post("/api/users/me/password")
        .set(...auth(u))
        .send({ currentPassword: "password123", newPassword: "new-password-1" })
        .expect(200);
      const fresh = res.body.accessToken as string;
      expect(fresh).toBeTruthy();

      await t
        .http()
        .get("/api/auth/me")
        .set(...auth(u))
        .expect(401);
      await t
        .http()
        .get("/api/auth/me")
        .set("Authorization", `Bearer ${fresh}`)
        .expect(200);
      await t
        .http()
        .post("/api/auth/login")
        .send({ email: u.email, password: "new-password-1" })
        .expect(200);

      const socket = t.socket(u.token);
      try {
        expect(await connected(socket)).toBe(false);
      } finally {
        socket.disconnect();
      }
    });
  });

  describe("data export", () => {
    it("downloads everything stored about the user, without secrets", async () => {
      const seller = await t.user("seller");
      const buyer = await t.user("buyer");
      const listing = await t.listing(seller, { title: "Export test bike" });
      await t.upload(seller, listing.id, await png()).expect(201);
      const conv = await t.conversation(
        buyer,
        listing.id,
        "Is the bike available?",
      );
      await t
        .http()
        .post(`/api/conversations/${conv.id}/messages`)
        .set(...auth(seller))
        .send({ body: "Yes, come by" })
        .expect(201);
      await t
        .http()
        .post(`/api/favorites/${listing.id}`)
        .set(...auth(buyer))
        .expect(201);
      await t
        .http()
        .post("/api/reviews")
        .set(...auth(buyer))
        .send({ reviewedUserId: seller.id, listingId: listing.id, rating: 5 })
        .expect(201);

      const res = await t
        .http()
        .get("/api/users/me/export")
        .set(...auth(seller))
        .expect(200);
      expect(res.headers["content-disposition"]).toMatch(
        /attachment; filename="marketplace-data-\d{4}-\d{2}-\d{2}\.json"/,
      );
      const data = res.body;
      expect(data.account.email).toBe(seller.email);
      expect(data.listings.map((l: { title: string }) => l.title)).toContain(
        "Export test bike",
      );
      expect(data.listings[0].images[0].thumb).toMatch(
        /^\/uploads\/listings\//,
      );
      expect(
        data.conversations[0].messages.map((m: { body: string }) => m.body),
      ).toEqual(["Is the bike available?", "Yes, come by"]);
      expect(data.reviewsReceived).toHaveLength(1);
      expect(JSON.stringify(data)).not.toMatch(/passwordHash|\$2b\$/);

      const buyerData = (
        await t
          .http()
          .get("/api/users/me/export")
          .set(...auth(buyer))
          .expect(200)
      ).body;
      expect(buyerData.favorites[0].listingTitle).toBe("Export test bike");
      expect(buyerData.reviewsWritten).toHaveLength(1);
    });
  });

  describe("account deletion", () => {
    let seller: TestUser;
    let buyer: TestUser;
    let listingId: string;
    let convId: string;
    let photoPath: string;

    beforeAll(async () => {
      seller = await t.user("leaver");
      buyer = await t.user("stayer");
      const listing = await t.listing(seller, { title: "Leaving soon zq4" });
      listingId = listing.id;
      const img = (await t.upload(seller, listing.id, await png()).expect(201))
        .body;
      photoPath = join(
        process.env.UPLOAD_DIR!,
        "listings",
        img.storageKeyThumb,
      );
      const conv = await t.conversation(buyer, listing.id, "Hello");
      convId = conv.id;
      await t
        .http()
        .post(`/api/conversations/${conv.id}/messages`)
        .set(...auth(seller))
        .send({ body: "Hi from the seller" })
        .expect(201);
      await t
        .http()
        .post(`/api/favorites/${listing.id}`)
        .set(...auth(seller))
        .expect(201);
    });

    it("refuses a wrong password", async () => {
      await t
        .http()
        .delete("/api/users/me")
        .set(...auth(seller))
        .send({ password: "wrong-password" })
        .expect(400);
    });

    it("erases personal data, listings and photos but keeps the other side's chat", async () => {
      expect(existsSync(photoPath)).toBe(true);
      const res = await t
        .http()
        .delete("/api/users/me")
        .set(...auth(seller))
        .send({ password: "password123" })
        .expect(200);
      expect(res.body.message).toMatch(/deleted/);

      await t
        .http()
        .get("/api/auth/me")
        .set(...auth(seller))
        .expect(401);
      await t
        .http()
        .post("/api/auth/login")
        .send({ email: seller.email, password: "password123" })
        .expect(401);
      await t.http().get(`/api/users/${seller.id}`).expect(404);
      await t.http().get(`/api/listings/${listingId}`).expect(404);
      const search = (await t.http().get("/api/listings?q=zq4").expect(200))
        .body;
      expect(search.data).toEqual([]);
      expect(existsSync(photoPath)).toBe(false);

      const [row] = await t.db.query(
        `SELECT email, username, display_name, phone, bio, is_active, deleted_at FROM users WHERE id = $1`,
        [seller.id],
      );
      expect(row.email).toMatch(/^deleted-.+@deleted\.invalid$/);
      expect(row.username).toMatch(/^deleted-/);
      expect(row.display_name).toBeNull();
      expect(row.is_active).toBe(false);
      expect(row.deleted_at).not.toBeNull();
      const [{ count }] = await t.db.query(
        `SELECT COUNT(*)::int AS count FROM favorites WHERE user_id = $1`,
        [seller.id],
      );
      expect(count).toBe(0);

      const msgs = (
        await t
          .http()
          .get(`/api/conversations/${convId}/messages`)
          .set(...auth(buyer))
          .expect(200)
      ).body;
      expect(msgs.map((m: { body: string }) => m.body)).toEqual([
        "Hello",
        "Hi from the seller",
      ]);
      expect(msgs[1].sender.username).toMatch(/^deleted-/);
      expect(msgs[1].sender.displayName).toBeNull();
    });

    it("frees the email for a new registration", async () => {
      await t
        .http()
        .post("/api/auth/register")
        .send({
          email: seller.email,
          username: `${seller.username}x`,
          password: "password123",
          acceptTerms: true,
        })
        .expect(201);
    });
  });

  describe("retention", () => {
    it("removes photos of listings deleted longer ago than the retention period", async () => {
      const owner = await t.user("ret");
      const old = await t.listing(owner, { title: "Old deleted listing" });
      const recent = await t.listing(owner, {
        title: "Recently deleted listing",
      });
      const removedByMod = await t.listing(owner, {
        title: "Removed by moderator",
      });
      const paths: Record<string, string> = {};
      for (const l of [old, recent, removedByMod]) {
        const img = (await t.upload(owner, l.id, await png()).expect(201)).body;
        paths[l.id] = join(
          process.env.UPLOAD_DIR!,
          "listings",
          img.storageKeyMedium,
        );
      }
      await t
        .http()
        .delete(`/api/listings/${old.id}`)
        .set(...auth(owner))
        .expect(200);
      await t
        .http()
        .delete(`/api/listings/${recent.id}`)
        .set(...auth(owner))
        .expect(200);
      await t.db.query(
        `UPDATE listings SET deleted_at = NOW() - interval '40 days' WHERE id = $1`,
        [old.id],
      );
      await t.db.query(`UPDATE listings SET status = 'removed' WHERE id = $1`, [
        removedByMod.id,
      ]);

      const result = await t.app.get(RetentionService).runOnce();
      expect(result.photos).toBeGreaterThanOrEqual(1);
      expect(existsSync(paths[old.id])).toBe(false);
      expect(existsSync(paths[recent.id])).toBe(true);
      expect(existsSync(paths[removedByMod.id])).toBe(true);

      const [img] = await t.db.query(
        `SELECT storage_key_original, storage_key_medium FROM listing_images WHERE listing_id = $1`,
        [old.id],
      );
      expect(img).toEqual({
        storage_key_original: null,
        storage_key_medium: null,
      });
    });
  });

  describe("internal key for server-side rendering", () => {
    const saved = { ...process.env };
    afterEach(() => {
      process.env.THROTTLE_DISABLED = saved.THROTTLE_DISABLED;
      process.env.THROTTLE_LIMIT = saved.THROTTLE_LIMIT;
      process.env.INTERNAL_API_KEY = saved.INTERNAL_API_KEY;
    });

    it("lets requests with the shared key skip guest rate limits", async () => {
      process.env.THROTTLE_DISABLED = "false";
      process.env.THROTTLE_LIMIT = "2";
      process.env.INTERNAL_API_KEY = "k".repeat(40);
      const get = (key?: string) => {
        const req = t.http().get("/api/categories");
        return key ? req.set("X-Internal-Key", key) : req;
      };
      for (let i = 0; i < 5; i++) {
        expect((await get("k".repeat(40))).status).toBe(200);
      }
      expect((await get()).status).toBe(200);
      expect((await get()).status).toBe(200);
      expect((await get()).status).toBe(429);
      expect((await get("wrong-key".padEnd(40, "x"))).status).toBe(429);
    });

    it("ignores keys shorter than 32 characters", async () => {
      process.env.THROTTLE_DISABLED = "false";
      process.env.THROTTLE_LIMIT = "1";
      process.env.INTERNAL_API_KEY = "short-key";
      const r1 = await t
        .http()
        .get("/api/listings")
        .set("X-Internal-Key", "short-key");
      const r2 = await t
        .http()
        .get("/api/listings")
        .set("X-Internal-Key", "short-key");
      expect([r1.status, r2.status]).toEqual([200, 429]);
    });
  });
});
