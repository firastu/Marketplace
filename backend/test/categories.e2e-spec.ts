import { TestApp } from "./helpers";

describe("Category names", () => {
  let t: TestApp;

  beforeAll(async () => {
    t = await TestApp.create();
  });
  afterAll(() => t.close());

  it("returns an Arabic name next to the English one", async () => {
    const res = await t.http().get("/api/categories").expect(200);
    const electronics = res.body.find(
      (c: { slug: string }) => c.slug === "electronics",
    );
    expect(electronics).toMatchObject({
      name: "Electronics",
      nameAr: "إلكترونيات",
    });
    const phones = electronics.children.find(
      (c: { slug: string }) => c.slug === "smartphones",
    );
    expect(phones.nameAr).toBe("موبايلات");
    for (const c of res.body) expect(c.nameAr).toBeTruthy();
  });

  it("includes the Arabic name on a listing's category", async () => {
    const seller = await t.user("seller");
    const listing = await t.listing(seller);
    const res = await t.http().get(`/api/listings/${listing.id}`).expect(200);
    expect(res.body.category.nameAr).toBe("موبايلات");
  });
});
