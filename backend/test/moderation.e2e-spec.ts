import { TestApp, TestUser, auth, findSensitiveKeys } from "./helpers";
import { MailService } from "../src/modules/mail/mail.service";

describe("Reports & moderation", () => {
  let t: TestApp;
  let mod: TestUser;
  let admin: TestUser;

  const makeRole = (u: TestUser, role: string) =>
    t.db.query(`UPDATE users SET role = $1 WHERE id = $2`, [role, u.id]);

  beforeAll(async () => {
    t = await TestApp.create();
    mod = await t.user("mod");
    admin = await t.user("admin");
    await makeRole(mod, "moderator");
    await makeRole(admin, "admin");
  });
  afterAll(() => t.close());

  describe("reporting", () => {
    it("lets users report a listing once, not their own, and not unknown ones", async () => {
      const seller = await t.user("seller");
      const reporter = await t.user("reporter");
      const listing = await t.listing(seller);
      const body = {
        targetType: "listing",
        targetId: listing.id,
        reason: "scam",
        details: "Asks for money upfront",
      };

      await t.http().post("/api/reports").send(body).expect(401);
      const res = await t
        .http()
        .post("/api/reports")
        .set(...auth(reporter))
        .send(body)
        .expect(201);
      expect(res.body).toMatchObject({
        targetType: "listing",
        reason: "scam",
        status: "open",
      });

      const dup = await t
        .http()
        .post("/api/reports")
        .set(...auth(reporter))
        .send(body)
        .expect(409);
      expect(dup.body.message).toBe("You have already reported this");
      await t
        .http()
        .post("/api/reports")
        .set(...auth(seller))
        .send(body)
        .expect(400);
      await t
        .http()
        .post("/api/reports")
        .set(...auth(reporter))
        .send({ ...body, targetId: "00000000-0000-4000-8000-000000000000" })
        .expect(404);
      await t
        .http()
        .post("/api/reports")
        .set(...auth(reporter))
        .send({ ...body, reason: "boring" })
        .expect(400);
    });

    it("lets users report other users but not themselves", async () => {
      const a = await t.user("a");
      const b = await t.user("b");
      await t
        .http()
        .post("/api/reports")
        .set(...auth(a))
        .send({ targetType: "user", targetId: b.id, reason: "harassment" })
        .expect(201);
      await t
        .http()
        .post("/api/reports")
        .set(...auth(a))
        .send({ targetType: "user", targetId: a.id, reason: "harassment" })
        .expect(400);
    });
  });

  describe("access", () => {
    it("keeps the moderation area for staff only", async () => {
      const u = await t.user();
      await t.http().get("/api/admin/stats").expect(401);
      await t
        .http()
        .get("/api/admin/stats")
        .set(...auth(u))
        .expect(403);
      await t
        .http()
        .get("/api/admin/reports")
        .set(...auth(u))
        .expect(403);
      await t
        .http()
        .get("/api/admin/stats")
        .set(...auth(mod))
        .expect(200);
      await t
        .http()
        .get("/api/admin/stats")
        .set(...auth(admin))
        .expect(200);
    });
  });

  describe("handling a reported listing", () => {
    it("shows the report with context, removes the listing and resolves its reports", async () => {
      const seller = await t.user("badseller");
      const r1 = await t.user("r1");
      const r2 = await t.user("r2");
      const listing = await t.listing(seller, {
        title: "Too good to be true phone",
      });
      for (const r of [r1, r2]) {
        await t
          .http()
          .post("/api/reports")
          .set(...auth(r))
          .send({ targetType: "listing", targetId: listing.id, reason: "scam" })
          .expect(201);
      }

      const queue = (
        await t
          .http()
          .get("/api/admin/reports?status=open&limit=100")
          .set(...auth(mod))
          .expect(200)
      ).body;
      const row = queue.data.find(
        (x: { targetId: string }) => x.targetId === listing.id,
      );
      expect(row.listing).toMatchObject({
        id: listing.id,
        title: "Too good to be true phone",
        status: "active",
      });
      expect(row.user).toMatchObject({ id: seller.id, isActive: true });
      expect(row.reporter.username).toBeTruthy();
      expect(row.openReportsOnTarget).toBe(2);
      expect(findSensitiveKeys(queue)).toEqual([]);

      await t
        .http()
        .post(`/api/admin/listings/${listing.id}/remove`)
        .set(...auth(mod))
        .send({})
        .expect(400);
      await t
        .http()
        .post(`/api/admin/listings/${listing.id}/remove`)
        .set(...auth(mod))
        .send({ reason: "Confirmed scam pattern" })
        .expect(200);

      await t.http().get(`/api/listings/${listing.id}`).expect(404);
      await t
        .http()
        .put(`/api/listings/${listing.id}`)
        .set(...auth(seller))
        .send({ title: "Back again" })
        .expect(403);

      const resolved = (
        await t
          .http()
          .get("/api/admin/reports?status=resolved&limit=100")
          .set(...auth(mod))
          .expect(200)
      ).body;
      const closed = resolved.data.filter(
        (x: { targetId: string }) => x.targetId === listing.id,
      );
      expect(closed).toHaveLength(2);
      expect(closed[0].resolutionNote).toBe("Confirmed scam pattern");

      const log = (
        await t
          .http()
          .get("/api/admin/actions")
          .set(...auth(admin))
          .expect(200)
      ).body;
      expect(log.data[0]).toMatchObject({
        action: "remove_listing",
        targetId: listing.id,
        reason: "Confirmed scam pattern",
      });
      expect(log.data[0].moderator.id).toBe(mod.id);

      await t
        .http()
        .post(`/api/admin/listings/${listing.id}/restore`)
        .set(...auth(mod))
        .send({})
        .expect(200);
      await t.http().get(`/api/listings/${listing.id}`).expect(200);
    });

    it("dismisses a report with a note", async () => {
      const seller = await t.user("fine");
      const r = await t.user("picky");
      const listing = await t.listing(seller);
      const rep = (
        await t
          .http()
          .post("/api/reports")
          .set(...auth(r))
          .send({
            targetType: "listing",
            targetId: listing.id,
            reason: "wrong_category",
          })
          .expect(201)
      ).body;
      const res = await t
        .http()
        .patch(`/api/admin/reports/${rep.id}`)
        .set(...auth(mod))
        .send({ status: "dismissed", note: "Category is correct" })
        .expect(200);
      expect(res.body).toMatchObject({
        status: "dismissed",
        resolutionNote: "Category is correct",
      });
      expect(res.body.resolvedAt).toBeTruthy();
      // a fresh report is possible again once the old one is closed
      await t
        .http()
        .post("/api/reports")
        .set(...auth(r))
        .send({ targetType: "listing", targetId: listing.id, reason: "other" })
        .expect(201);
    });
  });

  describe("suspending users", () => {
    it("signs the user out, hides their listings and resolves reports about them", async () => {
      const bad = await t.user("troll");
      const r = await t.user("victim");
      const listing = await t.listing(bad, { title: "Troll listing qq8" });
      await t
        .http()
        .post("/api/reports")
        .set(...auth(r))
        .send({ targetType: "user", targetId: bad.id, reason: "harassment" })
        .expect(201);

      await t
        .http()
        .post(`/api/admin/users/${bad.id}/suspend`)
        .set(...auth(mod))
        .send({})
        .expect(400);
      const res = await t
        .http()
        .post(`/api/admin/users/${bad.id}/suspend`)
        .set(...auth(mod))
        .send({ reason: "Repeated harassment" })
        .expect(200);
      expect(res.body.isActive).toBe(false);

      await t
        .http()
        .get("/api/auth/me")
        .set(...auth(bad))
        .expect(401);
      await t.http().get(`/api/listings/${listing.id}`).expect(404);
      const reports = (
        await t
          .http()
          .get("/api/admin/reports?status=resolved&limit=100")
          .set(...auth(mod))
          .expect(200)
      ).body;
      expect(
        reports.data.some((x: { targetId: string }) => x.targetId === bad.id),
      ).toBe(true);

      await t
        .http()
        .post(`/api/admin/users/${bad.id}/reactivate`)
        .set(...auth(mod))
        .send({})
        .expect(200);
      await t
        .http()
        .post("/api/auth/login")
        .send({ email: bad.email, password: "password123" })
        .expect(200);
    });

    it("doesn't let moderators act on admins or anyone act on themselves", async () => {
      await t
        .http()
        .post(`/api/admin/users/${admin.id}/suspend`)
        .set(...auth(mod))
        .send({ reason: "Trying my luck" })
        .expect(403);
      await t
        .http()
        .post(`/api/admin/users/${mod.id}/suspend`)
        .set(...auth(mod))
        .send({ reason: "Oops myself" })
        .expect(403);
    });
  });

  describe("listings held for review", () => {
    it("holds listings mentioning prohibited items until a moderator approves them", async () => {
      const seller = await t.user("hunter");
      const listing = await t.listing(seller, {
        title: "مسدس للبيع nn5",
        description: "بحالة جيدة مع ذخيرة",
      });
      expect(listing.status).toBe("pending_review");
      expect(listing.moderationFlags).toEqual(
        expect.arrayContaining(["مسدس", "ذخيرة"]),
      );

      await t.http().get(`/api/listings/${listing.id}`).expect(404);
      await t
        .http()
        .get(`/api/listings/${listing.id}`)
        .set(...auth(seller))
        .expect(200);
      expect(
        (await t.http().get("/api/listings?q=nn5").expect(200)).body.data,
      ).toEqual([]);
      await t
        .http()
        .patch(`/api/listings/${listing.id}/status`)
        .set(...auth(seller))
        .send({ status: "sold" })
        .expect(403);

      const pending = (
        await t
          .http()
          .get("/api/admin/listings/pending")
          .set(...auth(mod))
          .expect(200)
      ).body;
      const row = pending.data.find((l: { id: string }) => l.id === listing.id);
      expect(row.moderationFlags).toEqual(expect.arrayContaining(["مسدس"]));
      expect(row.user.id).toBe(seller.id);
      expect(
        (
          await t
            .http()
            .get("/api/admin/stats")
            .set(...auth(mod))
        ).body.pendingListings,
      ).toBeGreaterThanOrEqual(1);

      await t
        .http()
        .post(`/api/admin/listings/${listing.id}/approve`)
        .set(...auth(mod))
        .send({ note: "Water pistol toy, fine" })
        .expect(200);
      await t.http().get(`/api/listings/${listing.id}`).expect(200);

      // a price edit doesn't send an approved listing back to review
      const priced = await t
        .http()
        .put(`/api/listings/${listing.id}`)
        .set(...auth(seller))
        .send({ price: 99 })
        .expect(200);
      expect(priced.body.status).toBe("active");
    });

    it("releases a held listing when the owner removes the flagged words", async () => {
      const seller = await t.user("seller2");
      const listing = await t.listing(seller, { title: "AK-47 replica xx7" });
      expect(listing.status).toBe("pending_review");
      const edited = await t
        .http()
        .put(`/api/listings/${listing.id}`)
        .set(...auth(seller))
        .send({ title: "Toy blaster replica xx7" })
        .expect(200);
      expect(edited.body.status).toBe("active");
      expect(edited.body.moderationFlags).toEqual([]);
    });

    it("publishes ordinary listings straight away", async () => {
      const seller = await t.user("normal");
      const listing = await t.listing(seller, {
        title: "قلم رصاص وألوان للأطفال",
      });
      expect(listing.status).toBe("active");
    });
  });

  it("includes filed reports in the reporter's data export", async () => {
    const seller = await t.user("s");
    const r = await t.user("exporter");
    const listing = await t.listing(seller);
    await t
      .http()
      .post("/api/reports")
      .set(...auth(r))
      .send({ targetType: "listing", targetId: listing.id, reason: "spam" })
      .expect(201);
    const data = (
      await t
        .http()
        .get("/api/users/me/export")
        .set(...auth(r))
        .expect(200)
    ).body;
    expect(data.reportsFiled).toEqual([
      expect.objectContaining({
        targetId: listing.id,
        reason: "spam",
        status: "open",
      }),
    ]);
  });

  describe("statement of reasons", () => {
    it("emails the affected user what was decided, why, and how to contest it", async () => {
      const mail = t.app.get(MailService);
      mail.outbox.splice(0);
      const seller = await t.user("notified");
      const listing = await t.listing(seller, { title: "Notify me listing" });

      await t
        .http()
        .post(`/api/admin/listings/${listing.id}/remove`)
        .set(...auth(mod))
        .send({ reason: "Counterfeit brand goods" })
        .expect(200);
      const removed = mail.outbox.find((m) => m.to === seller.email)!;
      expect(removed.subject).toContain("Your listing was removed");
      expect(removed.text).toContain("«Notify me listing»");
      expect(removed.text).toContain("السبب: Counterfeit brand goods");
      expect(removed.text).toContain("Reason: Counterfeit brand goods");
      expect(removed.text).toContain("/rules");
      expect(removed.text).toContain("contest it by replying");

      mail.outbox.splice(0);
      await t
        .http()
        .post(`/api/admin/users/${seller.id}/suspend`)
        .set(...auth(mod))
        .send({ reason: "Repeated violations" })
        .expect(200);
      expect(mail.outbox).toHaveLength(1);
      expect(mail.outbox[0].subject).toContain("Your account was suspended");

      mail.outbox.splice(0);
      await t
        .http()
        .post(`/api/admin/users/${seller.id}/reactivate`)
        .set(...auth(mod))
        .send({})
        .expect(200);
      expect(mail.outbox[0].subject).toContain("Your account was reactivated");
      expect(mail.outbox[0].text).not.toContain("contest");
    });
  });
});
