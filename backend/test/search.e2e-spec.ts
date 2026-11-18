import { randomBytes } from "crypto";
import { TestApp, TestUser } from "./helpers";

/**
 * Arabic-aware search (migration 010). Each test puts a unique Latin tag
 * in its listings and searches for it too, so listings created by other
 * tests can't interfere.
 */
describe("Arabic-aware search", () => {
  let t: TestApp;
  let seller: TestUser;
  // Letters only: these tests search for digits, and a tag containing
  // e.g. "43" would match every listing that carries it.
  const tag = () =>
    "tg" +
    Array.from(randomBytes(10), (b) => String.fromCharCode(97 + (b % 26))).join(
      "",
    );

  beforeAll(async () => {
    t = await TestApp.create();
    seller = await t.user("seller");
  });
  afterAll(() => t.close());

  const titles = async (q: string, extra = "") =>
    (
      await t
        .http()
        .get(`/api/listings?q=${encodeURIComponent(q)}${extra}`)
        .expect(200)
    ).body.data.map((l: { title: string }) => l.title);

  it("normalises the text the same way in SQL", async () => {
    const rows: { out: string }[] = await t.db.query(
      `SELECT normalize_search_text(x) AS out
         FROM unnest($1::text[]) WITH ORDINALITY AS v(x, i) ORDER BY i`,
      [
        [
          "أإآٱ",
          "سيارة",
          "مستشفى",
          "كُرْسِيّ",
          "مـــكتب",
          "شاشة ٤٣ ۱۲۸",
          "  iPhone   PRO ",
        ],
      ],
    );
    expect(rows.map((r) => r.out)).toEqual([
      "اااا",
      "سياره",
      "مستشفي",
      "كرسي",
      "مكتب",
      "شاشه 43 128",
      "iphone pro",
    ]);
  });

  it("matches hamza/alef spelling variants", async () => {
    const k = tag();
    await t.listing(seller, { title: `آيفون 13 برو ${k}` });
    for (const q of ["ايفون", "أيفون", "إيفون", "آيفون"]) {
      expect(await titles(`${q} ${k}`)).toEqual([`آيفون 13 برو ${k}`]);
    }
  });

  it("matches ta marbuta / ha and alef maqsura / ya both ways", async () => {
    const k = tag();
    await t.listing(seller, { title: `سيارة كيا ${k}` });
    await t.listing(seller, { title: `سرير مستشفي ${k}` });
    expect(await titles(`سياره ${k}`)).toEqual([`سيارة كيا ${k}`]);
    expect(await titles(`مستشفى ${k}`)).toEqual([`سرير مستشفي ${k}`]);
  });

  it("ignores diacritics and tatweel", async () => {
    const k = tag();
    await t.listing(seller, { title: `كُرْسِيّ مـــكتب ${k}` });
    expect(await titles(`كرسي مكتب ${k}`)).toEqual([`كُرْسِيّ مـــكتب ${k}`]);
  });

  it("treats Arabic-Indic and Latin digits as the same", async () => {
    const k = tag();
    await t.listing(seller, { title: `شاشة 43 بوصة ${k}` });
    await t.listing(seller, { title: `موبايل ١٢٨ جيجا ${k}` });
    expect(await titles(`٤٣ ${k}`)).toEqual([`شاشة 43 بوصة ${k}`]);
    expect(await titles(`128 ${k}`)).toEqual([`موبايل ١٢٨ جيجا ${k}`]);
  });

  it("requires every word, in any order, title or description", async () => {
    const k = tag();
    await t.listing(seller, {
      title: `سيارة كيا ${k}`,
      description: "موديل 2015 ريو بحالة ممتازة",
    });
    await t.listing(seller, { title: `كيا سبورتاج ${k}` });
    expect(await titles(`ريو كيا ${k}`)).toEqual([`سيارة كيا ${k}`]);
    expect(await titles(`كيا ${k}`)).toHaveLength(2);
  });

  it("is case-insensitive for Latin text and keeps wildcards literal", async () => {
    const k = tag();
    await t.listing(seller, { title: `iPhone 15 PRO ${k}` });
    expect(await titles(`iphone pro ${k.toUpperCase()}`)).toEqual([
      `iPhone 15 PRO ${k}`,
    ]);
    expect(await titles(`% ${k}`)).toEqual([]);
    expect(await titles(`_ ${k}`)).toEqual([]);
  });

  it("normalises the city filter too", async () => {
    const k = tag();
    await t.listing(seller, { title: `طاولة ${k}`, locationCity: "حماة" });
    expect(
      await titles(k, `&locationCity=${encodeURIComponent("حماه")}`),
    ).toEqual([`طاولة ${k}`]);
    expect(await titles(k, "&locationCity=aleppo")).toEqual([]);
  });
});
