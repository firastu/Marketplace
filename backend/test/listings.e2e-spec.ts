import { TestApp, TestUser, auth } from "./helpers";

describe("Listings", () => {
  let t: TestApp;
  let seller: TestUser;
  let buyer: TestUser;

  beforeAll(async () => {
    t = await TestApp.create();
    seller = await t.user("seller");
    buyer = await t.user("buyer");
  });
  afterAll(() => t.close());

  describe("soft delete", () => {
    it("deleting a listing hides it but keeps the buyer's conversation and messages", async () => {
      const listing = await t.listing(seller);
      const conv = await t.conversation(buyer, listing.id, "Hi, price?");

      await t
        .http()
        .delete(`/api/listings/${listing.id}`)
        .set(...auth(seller))
        .expect(200);

      await t.http().get(`/api/listings/${listing.id}`).expect(404);
      const mine = (
        await t
          .http()
          .get("/api/listings/my")
          .set(...auth(seller))
      ).body;
      expect(mine.data.map((l: any) => l.id)).not.toContain(listing.id);

      const convs = (
        await t
          .http()
          .get("/api/conversations")
          .set(...auth(buyer))
          .expect(200)
      ).body;
      const kept = convs.find((c: any) => c.id === conv.id);
      expect(kept).toBeDefined();
      expect(kept.listing.title).toBe(listing.title);
      expect(kept.listing.deletedAt).not.toBeNull();

      const msgs = (
        await t
          .http()
          .get(`/api/conversations/${conv.id}/messages`)
          .set(...auth(buyer))
          .expect(200)
      ).body;
      expect(msgs.map((m: any) => m.body)).toEqual(["Hi, price?"]);
      await t
        .http()
        .post(`/api/conversations/${conv.id}/messages`)
        .set(...auth(seller))
        .send({ body: "Sorry, it's gone" })
        .expect(201);

      const [{ count }] = await t.db.query(
        `SELECT COUNT(*)::int AS count FROM listings WHERE id = $1`,
        [listing.id],
      );
      expect(count).toBe(1);
    });

    it("deleted listings drop out of favorites", async () => {
      const listing = await t.listing(seller);
      await t
        .http()
        .post(`/api/favorites/${listing.id}`)
        .set(...auth(buyer))
        .expect(201);
      await t
        .http()
        .delete(`/api/listings/${listing.id}`)
        .set(...auth(seller))
        .expect(200);
      const favs = (
        await t
          .http()
          .get("/api/favorites")
          .set(...auth(buyer))
          .expect(200)
      ).body;
      expect(favs.map((f: any) => f.listingId)).not.toContain(listing.id);
    });

    it("favoriting an unknown listing is a 404, not a database error", async () => {
      await t
        .http()
        .post("/api/favorites/00000000-0000-4000-8000-000000000000")
        .set(...auth(buyer))
        .expect(404);
    });
  });

  describe("visibility", () => {
    it.each(["draft", "removed", "expired"])(
      "a %s listing is visible to its owner only",
      async (status) => {
        const listing = await t.listing(seller);
        await t.db.query(`UPDATE listings SET status = $1 WHERE id = $2`, [
          status,
          listing.id,
        ]);

        await t.http().get(`/api/listings/${listing.id}`).expect(404);
        await t
          .http()
          .get(`/api/listings/${listing.id}`)
          .set(...auth(buyer))
          .expect(404);
        await t.http().get(`/api/listings/${listing.id}/images`).expect(404);
        await t
          .http()
          .get(`/api/listings/${listing.id}`)
          .set(...auth(seller))
          .expect(200);
      },
    );

    it("sold listings stay publicly visible", async () => {
      const listing = await t.listing(seller);
      await t
        .http()
        .patch(`/api/listings/${listing.id}/status`)
        .set(...auth(seller))
        .send({ status: "sold" })
        .expect(200);
      const res = await t.http().get(`/api/listings/${listing.id}`).expect(200);
      expect(res.body.status).toBe("sold");
    });

    it("an invalid token on a public route is treated as a guest", async () => {
      const listing = await t.listing(seller);
      await t
        .http()
        .get(`/api/listings/${listing.id}`)
        .set("Authorization", "Bearer not-a-real-token")
        .expect(200);
    });

    it("deactivated sellers' listings disappear from search and detail pages", async () => {
      const banned = await t.user("banned");
      const listing = await t.listing(banned, {
        title: "Banned seller item zz9",
      });
      await t.db.query(`UPDATE users SET is_active = false WHERE id = $1`, [
        banned.id,
      ]);

      const search = (await t.http().get("/api/listings?q=zz9").expect(200))
        .body;
      expect(search.data).toEqual([]);
      await t.http().get(`/api/listings/${listing.id}`).expect(404);
    });

    it("counts views from others but not from the owner", async () => {
      const listing = await t.listing(seller);
      await t
        .http()
        .get(`/api/listings/${listing.id}`)
        .set(...auth(seller))
        .expect(200);
      await t.http().get(`/api/listings/${listing.id}`).expect(200);
      const res = await t
        .http()
        .get(`/api/listings/${listing.id}`)
        .set(...auth(buyer))
        .expect(200);
      expect(res.body.viewsCount).toBe(2);
    });
  });

  describe("status rules", () => {
    it("owners can't set 'removed' (moderator-only)", async () => {
      const listing = await t.listing(seller);
      await t
        .http()
        .patch(`/api/listings/${listing.id}/status`)
        .set(...auth(seller))
        .send({ status: "removed" })
        .expect(400);
    });

    it("a listing removed by moderation can't be edited or reactivated", async () => {
      const listing = await t.listing(seller);
      await t.db.query(`UPDATE listings SET status = 'removed' WHERE id = $1`, [
        listing.id,
      ]);
      await t
        .http()
        .put(`/api/listings/${listing.id}`)
        .set(...auth(seller))
        .send({ title: "Trying to sneak back" })
        .expect(403);
      await t
        .http()
        .patch(`/api/listings/${listing.id}/status`)
        .set(...auth(seller))
        .send({ status: "active" })
        .expect(403);
    });

    it("new conversations are only possible on available listings", async () => {
      const listing = await t.listing(seller);
      await t
        .http()
        .patch(`/api/listings/${listing.id}/status`)
        .set(...auth(seller))
        .send({ status: "sold" })
        .expect(200);
      await t
        .http()
        .post("/api/conversations")
        .set(...auth(buyer))
        .send({ listingId: listing.id, body: "still there?" })
        .expect(400);
    });
  });

  describe("search & categories", () => {
    it("filtering by a top-level category includes its subcategories", async () => {
      const { root, child, otherRoot } = await t.categoryIds();
      const listing = await t.listing(seller, {
        categoryId: child,
        title: "Pixel 8 tree-test",
      });

      const byRoot = (
        await t
          .http()
          .get(`/api/listings?categoryId=${root}&q=tree-test`)
          .expect(200)
      ).body;
      expect(byRoot.data.map((l: any) => l.id)).toEqual([listing.id]);
      const byOther = (
        await t
          .http()
          .get(`/api/listings?categoryId=${otherRoot}&q=tree-test`)
          .expect(200)
      ).body;
      expect(byOther.data).toEqual([]);
    });

    it("treats % and _ in the search box as literal characters", async () => {
      await t.listing(seller, { title: "Ordinary item for wildcard test" });
      const res = (
        await t
          .http()
          .get(`/api/listings?q=${encodeURIComponent("%")}`)
          .expect(200)
      ).body;
      expect(
        res.data.every((l: any) => `${l.title} ${l.description}`.includes("%")),
      ).toBe(true);
    });

    it("returns 400 (not 500) for malformed filters and unknown categories", async () => {
      await t.http().get("/api/listings?categoryId=not-a-uuid").expect(400);
      await t
        .http()
        .post("/api/listings")
        .set(...auth(seller))
        .send({
          categoryId: "00000000-0000-4000-8000-000000000000",
          title: "Valid title",
          description: "Valid description text",
          price: 10,
        })
        .expect(400);
    });

    it("keeps Arabic letters in the slug", async () => {
      const listing = await t.listing(seller, { title: "سيارة كيا ريو ٢٠١٥" });
      expect(listing.slug).toMatch(/^سيارة-كيا-ريو-٢٠١٥-[0-9a-z]+$/);
    });
  });

  describe("currency", () => {
    it("defaults to SYP and accepts USD", async () => {
      const syp = await t.listing(seller);
      expect(syp.currency).toBe("SYP");
      const usd = await t.listing(seller, {
        currency: "USD",
        title: "Laptop priced in dollars",
      });
      expect(usd.currency).toBe("USD");
    });

    it("rejects currencies other than SYP and USD", async () => {
      const { child } = await t.categoryIds();
      await t
        .http()
        .post("/api/listings")
        .set(...auth(seller))
        .send({
          categoryId: child,
          title: "Euro item",
          description: "Priced in euros",
          price: 5,
          currency: "EUR",
        })
        .expect(400);
    });

    it("can filter search by currency", async () => {
      await t.listing(seller, { currency: "USD", title: "cur-filter dollars" });
      await t.listing(seller, { currency: "SYP", title: "cur-filter pounds" });
      const res = (
        await t
          .http()
          .get("/api/listings?q=cur-filter&currency=USD")
          .expect(200)
      ).body;
      expect(res.data.map((l: any) => l.title)).toEqual(["cur-filter dollars"]);
    });
  });
});
