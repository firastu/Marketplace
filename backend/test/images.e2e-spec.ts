import { readdirSync, existsSync } from "fs";
import { join } from "path";
import sharp from "sharp";
import { TestApp, TestUser, auth, png } from "./helpers";

function filesUnder(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((d) => d.isFile())
    .map((d) => join(d.parentPath ?? d.path, d.name));
}

describe("Listing images", () => {
  let t: TestApp;
  let owner: TestUser;
  const uploadsDir = () => join(process.env.UPLOAD_DIR!, "listings");

  beforeAll(async () => {
    t = await TestApp.create();
    owner = await t.user("owner");
  });
  afterAll(() => t.close());

  /** Where the private original is stored (not part of API responses). */
  async function originalKey(imageId: string): Promise<string> {
    const rows = await t.db.query(
      `SELECT storage_key_original FROM listing_images WHERE id = $1`,
      [imageId],
    );
    return rows[0].storage_key_original;
  }

  it("first upload becomes the cover, later uploads are appended in order", async () => {
    const listing = await t.listing(owner);
    const a = (await t.upload(owner, listing.id, await png("#c33")).expect(201))
      .body;
    const b = (await t.upload(owner, listing.id, await png("#33c")).expect(201))
      .body;

    expect(a).toMatchObject({ isPrimary: true, sortOrder: 0, status: "ready" });
    expect(b).toMatchObject({
      isPrimary: false,
      sortOrder: 1,
      status: "ready",
    });
    expect(a.url).toMatch(/\/medium\/.+\.webp$/);
  });

  it("set cover switches the primary image", async () => {
    const listing = await t.listing(owner);
    await t.upload(owner, listing.id, await png()).expect(201);
    const b = (await t.upload(owner, listing.id, await png("#3c3")).expect(201))
      .body;

    await t
      .http()
      .patch(`/api/listings/${listing.id}/images/${b.id}/cover`)
      .set(...auth(owner))
      .expect(200);

    const imgs = (
      await t.http().get(`/api/listings/${listing.id}/images`).expect(200)
    ).body;
    expect(imgs.filter((i: any) => i.isPrimary).map((i: any) => i.id)).toEqual([
      b.id,
    ]);
  });

  it("reorder saves the new order and validates the ID list", async () => {
    const listing = await t.listing(owner);
    const a = (await t.upload(owner, listing.id, await png()).expect(201)).body;
    const b = (await t.upload(owner, listing.id, await png("#3c3")).expect(201))
      .body;
    const c = (await t.upload(owner, listing.id, await png("#33c")).expect(201))
      .body;

    await t
      .http()
      .patch(`/api/listings/${listing.id}/images/order`)
      .set(...auth(owner))
      .send({ imageIds: [c.id, a.id, b.id] })
      .expect(200);
    const detail = (
      await t.http().get(`/api/listings/${listing.id}`).expect(200)
    ).body;
    expect(detail.images.map((i: any) => i.id)).toEqual([c.id, a.id, b.id]);

    // partial list, duplicates, missing body → 400 instead of 500/corruption
    for (const body of [
      { imageIds: [a.id, b.id] },
      { imageIds: [a.id, a.id, b.id] },
      {},
    ]) {
      await t
        .http()
        .patch(`/api/listings/${listing.id}/images/order`)
        .set(...auth(owner))
        .send(body)
        .expect(400);
    }
  });

  it("deleting the cover promotes the next image and hides the deleted one", async () => {
    const listing = await t.listing(owner);
    const a = (await t.upload(owner, listing.id, await png()).expect(201)).body;
    const b = (await t.upload(owner, listing.id, await png("#3c3")).expect(201))
      .body;

    await t
      .http()
      .delete(`/api/listings/${listing.id}/images/${a.id}`)
      .set(...auth(owner))
      .expect(200);

    const detail = (
      await t.http().get(`/api/listings/${listing.id}`).expect(200)
    ).body;
    expect(detail.images.map((i: any) => i.id)).toEqual([b.id]);
    expect(detail.images[0].isPrimary).toBe(true);

    const search = (
      await t.http().get(`/api/listings?q=${encodeURIComponent(listing.title)}`)
    ).body;
    const inSearch = search.data.find((l: any) => l.id === listing.id);
    expect(inSearch.images.map((i: any) => i.id)).toEqual([b.id]);
  });

  it("a listing whose only image was deleted still appears in search", async () => {
    const listing = await t.listing(owner, { title: "Lonely listing qx7" });
    const a = (await t.upload(owner, listing.id, await png()).expect(201)).body;
    await t
      .http()
      .delete(`/api/listings/${listing.id}/images/${a.id}`)
      .set(...auth(owner))
      .expect(200);

    const search = (await t.http().get("/api/listings?q=qx7").expect(200)).body;
    expect(search.data.map((l: any) => l.id)).toEqual([listing.id]);
    expect(search.data[0].images).toEqual([]);
  });

  it(`enforces the 15-image limit`, async () => {
    const listing = await t.listing(owner);
    const img = await png("#999", 16, 16);
    for (let i = 0; i < 15; i++)
      await t.upload(owner, listing.id, img).expect(201);
    await t.upload(owner, listing.id, img).expect(400);
  });

  it("rejects non-image bytes even when the client claims image/png, and writes nothing", async () => {
    const listing = await t.listing(owner);
    const before = filesUnder(uploadsDir()).length;
    const res = await t
      .upload(
        owner,
        listing.id,
        Buffer.from("<script>alert(1)</script>"),
        "evil.html",
        "image/png",
      )
      .expect(400);
    expect(res.body.message).toMatch(/not a valid image/i);
    expect(filesUnder(uploadsDir()).length).toBe(before);
  });

  it("names stored files by detected type, not the client filename", async () => {
    const listing = await t.listing(owner);
    const img = (
      await t
        .upload(owner, listing.id, await png(), "photo.html", "image/png")
        .expect(201)
    ).body;
    expect(await originalKey(img.id)).toMatch(/\/original\/[0-9a-f-]+\.png$/);
    const stored = filesUnder(join(uploadsDir(), listing.id));
    expect(stored.some((f) => f.endsWith(".html"))).toBe(false);
  });

  it("keeps originals private and serves EXIF-free WebP variants", async () => {
    const listing = await t.listing(owner);
    const jpegWithExif = await sharp({
      create: { width: 80, height: 60, channels: 3, background: "#456" },
    })
      .jpeg()
      .withExif({ IFD0: { Copyright: "secret-owner-info" } })
      .toBuffer();
    expect((await sharp(jpegWithExif).metadata()).exif).toBeDefined();

    const img = (
      await t
        .upload(owner, listing.id, jpegWithExif, "p.jpg", "image/jpeg")
        .expect(201)
    ).body;

    // Neither the upload response nor the public listing says where the
    // original is stored.
    expect(img).not.toHaveProperty("storageKeyOriginal");
    expect(img).not.toHaveProperty("processingError");
    const detail = await t.http().get(`/api/listings/${listing.id}`);
    expect(JSON.stringify(detail.body)).not.toContain("/original/");

    const key = await originalKey(img.id);
    expect(filesUnder(join(uploadsDir(), listing.id))).toContain(
      join(uploadsDir(), key),
    );
    // The static file server decodes and normalises the path, so every
    // spelling of it must be refused, not just the canonical one.
    const spellings = [
      key,
      key.replace("/original/", "/%6Friginal/"),
      key.replace("/original/", "/%6f%72iginal/"),
      key.replace("/original/", "//original/"),
      key.replace("/original/", "/./original/"),
      key.replace("/original/", "/thumb/../original/"),
      key.replace("/original/", "%2Foriginal/"),
      key.replace("/original/", "/original%2F"),
      key.replace("/original/", "/original//"),
    ];
    for (const spelling of spellings) {
      const res = await t.http().get(`/uploads/listings/${spelling}`);
      expect([spelling, res.status]).toEqual([spelling, 404]);
    }
    await t.http().get(`/uploads//listings/${key}`).expect(404);

    const thumb = await t
      .http()
      .get(`/uploads/listings/${img.storageKeyThumb}`)
      .buffer(true)
      .parse((res, cb) => {
        const chunks: Buffer[] = [];
        res.on("data", (c: Buffer) => chunks.push(c));
        res.on("end", () => cb(null, Buffer.concat(chunks)));
      })
      .expect(200);
    expect(thumb.headers["content-type"]).toBe("image/webp");
    expect(thumb.headers["cache-control"]).toContain("immutable");
    const meta = await sharp(thumb.body as Buffer).metadata();
    expect(meta.format).toBe("webp");
    expect(meta.exif).toBeUndefined();
  });

  it("refuses uploads to someone else's listing without storing the file", async () => {
    const other = await t.user("other");
    const listing = await t.listing(other);
    const before = filesUnder(uploadsDir()).length;
    await t.upload(owner, listing.id, await png()).expect(403);
    expect(filesUnder(uploadsDir()).length).toBe(before);
  });

  it("can't delete an image through a different listing's URL", async () => {
    const listing = await t.listing(owner);
    const other = await t.listing(owner);
    const img = (await t.upload(owner, listing.id, await png()).expect(201))
      .body;
    await t
      .http()
      .delete(`/api/listings/${other.id}/images/${img.id}`)
      .set(...auth(owner))
      .expect(404);
  });

  it("deleting an image of an already deleted listing is a 404, not a crash", async () => {
    const listing = await t.listing(owner);
    const img = (await t.upload(owner, listing.id, await png()).expect(201))
      .body;
    await t
      .http()
      .delete(`/api/listings/${listing.id}`)
      .set(...auth(owner))
      .expect(200);
    await t
      .http()
      .delete(`/api/listings/${listing.id}/images/${img.id}`)
      .set(...auth(owner))
      .expect(404);
  });

  it("images of a deactivated seller's listing are hidden like the listing", async () => {
    const seller = await t.user("gone");
    const listing = await t.listing(seller);
    await t.upload(seller, listing.id, await png()).expect(201);
    await t.http().get(`/api/listings/${listing.id}/images`).expect(200);
    await t.db.query(`UPDATE users SET is_active = false WHERE id = $1`, [
      seller.id,
    ]);
    await t.http().get(`/api/listings/${listing.id}`).expect(404);
    await t.http().get(`/api/listings/${listing.id}/images`).expect(404);
  });

  it("serves a 1200×630 JPEG link-preview image for public listings only", async () => {
    const listing = await t.listing(owner);
    await t.http().get(`/api/listings/${listing.id}/og-image`).expect(404);

    await t.upload(owner, listing.id, await png("#c33", 800, 600)).expect(201);
    const res = await t
      .http()
      .get(`/api/listings/${listing.id}/og-image`)
      .buffer(true)
      .parse((r, cb) => {
        const chunks: Buffer[] = [];
        r.on("data", (c: Buffer) => chunks.push(c));
        r.on("end", () => cb(null, Buffer.concat(chunks)));
      })
      .expect(200);
    expect(res.headers["content-type"]).toBe("image/jpeg");
    expect(res.headers["cache-control"]).toContain("public");
    const meta = await sharp(res.body as Buffer).metadata();
    expect(meta).toMatchObject({ format: "jpeg", width: 1200, height: 630 });

    await t.db.query(`UPDATE listings SET status = 'draft' WHERE id = $1`, [
      listing.id,
    ]);
    await t.http().get(`/api/listings/${listing.id}/og-image`).expect(404);
  });
});
