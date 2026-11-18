import { TestApp, auth, png } from "./helpers";

describe("Robustness: races, odd input and stale data", () => {
  let t: TestApp;

  beforeAll(async () => {
    t = await TestApp.create();
  });
  afterAll(() => t.close());

  const statuses = (responses: { status: number }[]) =>
    responses.map((r) => r.status).sort();

  describe("simultaneous duplicate requests (double tap on a slow connection)", () => {
    it("registering the same account twice gives one 201 and 409s, never a 500", async () => {
      const body = {
        email: "race@test.dev",
        username: "raceuser",
        password: "password123",
      };
      const responses = await Promise.all(
        [1, 2, 3].map(() => t.http().post("/api/auth/register").send(body)),
      );
      expect(statuses(responses)).toEqual([201, 409, 409]);
      const conflict = responses.find((r) => r.status === 409)!;
      expect(conflict.body.message).toMatch(/already/i);
    });

    it("starting the same conversation twice reuses one conversation", async () => {
      const seller = await t.user("seller");
      const buyer = await t.user("buyer");
      const listing = await t.listing(seller);
      const responses = await Promise.all(
        [1, 2, 3].map(() =>
          t
            .http()
            .post("/api/conversations")
            .set(...auth(buyer))
            .send({ listingId: listing.id, body: "Still available?" }),
        ),
      );
      expect(statuses(responses)).toEqual([201, 201, 201]);
      expect(new Set(responses.map((r) => r.body.conversation.id)).size).toBe(
        1,
      );
      const inbox = await t
        .http()
        .get("/api/conversations")
        .set(...auth(buyer))
        .expect(200);
      expect(inbox.body).toHaveLength(1);
    });

    it("favoriting twice gives one 201 and 409s", async () => {
      const seller = await t.user("seller");
      const buyer = await t.user("buyer");
      const listing = await t.listing(seller);
      const responses = await Promise.all(
        [1, 2, 3].map(() =>
          t
            .http()
            .post(`/api/favorites/${listing.id}`)
            .set(...auth(buyer)),
        ),
      );
      expect(statuses(responses)).toEqual([201, 409, 409]);
    });
  });

  it("text PostgreSQL can't store (NUL character) is a 400, not a 500", async () => {
    const seller = await t.user("seller");
    const { child } = await t.categoryIds();
    await t.http().get("/api/listings?q=%00").expect(400);
    await t
      .http()
      .post("/api/listings")
      .set(...auth(seller))
      .send({
        categoryId: child,
        title: "bad\u0000title",
        description: "A perfectly normal description.",
        price: 10,
      })
      .expect(400);
  });

  describe("categories", () => {
    it("an unknown slug is a 404", async () => {
      await t.http().get("/api/categories/does-not-exist").expect(404);
      const ok = await t.http().get("/api/categories/electronics").expect(200);
      expect(ok.body.slug).toBe("electronics");
      expect(ok.body.children.length).toBeGreaterThan(0);
    });

    it("deactivated subcategories are not offered, children come in sort order", async () => {
      await t.db.query(
        `INSERT INTO categories (name, slug, parent_id, sort_order, is_active)
         SELECT 'Hidden Sub', 'hidden-sub', id, 0, FALSE FROM categories WHERE slug = 'electronics'`,
      );
      try {
        const roots = (await t.http().get("/api/categories").expect(200)).body;
        const electronics = roots.find((c: any) => c.slug === "electronics");
        const slugs = electronics.children.map((c: any) => c.slug);
        expect(slugs).toContain("smartphones");
        expect(slugs).not.toContain("hidden-sub");
        const order = electronics.children.map((c: any) => c.sortOrder);
        expect(order).toEqual([...order].sort((a, b) => a - b));

        const bySlug = await t.http().get("/api/categories/electronics");
        expect(bySlug.body.children.map((c: any) => c.slug)).not.toContain(
          "hidden-sub",
        );
      } finally {
        await t.db.query(`DELETE FROM categories WHERE slug = 'hidden-sub'`);
      }
    });
  });

  it("favorites stop showing listings that were taken down", async () => {
    const seller = await t.user("seller");
    const goneSeller = await t.user("goneseller");
    const buyer = await t.user("buyer");
    const sold = await t.listing(seller, { title: "Sold but visible" });
    const removed = await t.listing(seller, { title: "Removed by moderator" });
    const orphan = await t.listing(goneSeller, { title: "Seller deactivated" });
    for (const l of [sold, removed, orphan]) {
      await t
        .http()
        .post(`/api/favorites/${l.id}`)
        .set(...auth(buyer))
        .expect(201);
    }
    await t
      .http()
      .patch(`/api/listings/${sold.id}/status`)
      .set(...auth(seller))
      .send({ status: "sold" })
      .expect(200);
    await t.db.query(`UPDATE listings SET status = 'removed' WHERE id = $1`, [
      removed.id,
    ]);
    await t.db.query(`UPDATE users SET is_active = false WHERE id = $1`, [
      goneSeller.id,
    ]);

    const favorites = await t
      .http()
      .get("/api/favorites")
      .set(...auth(buyer))
      .expect(200);
    expect(favorites.body.map((f: any) => f.listing.title)).toEqual([
      "Sold but visible",
    ]);
    expect(JSON.stringify(favorites.body)).not.toContain("passwordHash");
    expect(JSON.stringify(favorites.body)).not.toContain("@test.dev");

    // ...and a deactivated seller's listing can't be favorited anymore
    const other = await t.user("other");
    await t
      .http()
      .post(`/api/favorites/${orphan.id}`)
      .set(...auth(other))
      .expect(404);
  });

  it("paging through equal-priced listings returns each one exactly once", async () => {
    const seller = await t.user("seller");
    const marker = `tiebreak${Date.now().toString(36)}`;
    const created: string[] = [];
    for (let i = 0; i < 7; i++) {
      created.push(
        (await t.listing(seller, { title: `${marker} item ${i}`, price: 77 }))
          .id,
      );
    }
    // Same price and, to be thorough, same timestamp.
    await t.db.query(
      `UPDATE listings SET created_at = NOW() WHERE id = ANY($1)`,
      [created],
    );
    for (const sortBy of ["price_asc", "newest"]) {
      const seen: string[] = [];
      for (let page = 1; page <= 4; page++) {
        const res = await t
          .http()
          .get(
            `/api/listings?q=${marker}&sortBy=${sortBy}&limit=2&page=${page}`,
          )
          .expect(200);
        seen.push(...res.body.data.map((l: any) => l.id));
      }
      expect(seen).toHaveLength(7);
      expect([...seen].sort()).toEqual([...created].sort());
    }
  });

  it("search can be limited to one seller (public seller page)", async () => {
    const seller = await t.user("shop");
    const other = await t.user("othershop");
    const mine = await t.listing(seller, { title: "From this seller" });
    await t.listing(other, { title: "From someone else" });
    const res = await t
      .http()
      .get(`/api/listings?userId=${seller.id}`)
      .expect(200);
    expect(res.body.data.map((l: any) => l.id)).toEqual([mine.id]);
    await t.http().get("/api/listings?userId=not-a-uuid").expect(400);
  });

  it("the inbox carries a preview of the last message and the listing's cover photo", async () => {
    const seller = await t.user("seller");
    const buyer = await t.user("buyer");
    const listing = await t.listing(seller);
    const first = (await t.upload(seller, listing.id, await png()).expect(201))
      .body;
    const second = (
      await t.upload(seller, listing.id, await png("#3333cc")).expect(201)
    ).body;
    await t
      .http()
      .patch(`/api/listings/${listing.id}/images/${second.id}/cover`)
      .set(...auth(seller))
      .expect(200);
    const conv = await t.conversation(buyer, listing.id, "Is it available?");
    await t
      .http()
      .post(`/api/conversations/${conv.id}/messages`)
      .set(...auth(seller))
      .send({ body: "Yes, come by tomorrow" })
      .expect(201);

    const inbox = await t
      .http()
      .get("/api/conversations")
      .set(...auth(buyer))
      .expect(200);
    const row = inbox.body.find((c: any) => c.id === conv.id);
    expect(row.lastMessage).toMatchObject({
      body: "Yes, come by tomorrow",
      senderId: seller.id,
    });
    expect(row.listing.images.map((i: any) => i.id)).toEqual([second.id]);
    expect(first.id).not.toBe(second.id);
    expect(JSON.stringify(row)).not.toContain("/original/");

    // A deleted listing keeps its chat but shows no photo.
    await t
      .http()
      .delete(`/api/listings/${listing.id}`)
      .set(...auth(seller))
      .expect(200);
    const after = await t
      .http()
      .get("/api/conversations")
      .set(...auth(buyer))
      .expect(200);
    expect(after.body[0].listing.images).toEqual([]);
    expect(after.body[0].listing.deletedAt).toBeTruthy();
  });
});
