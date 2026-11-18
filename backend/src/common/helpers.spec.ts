import { escapeLike, generateSlug } from "../modules/listings/listings.service";
import { parseCorsOrigins } from "../app.setup";
import { User } from "../modules/users/user.entity";
import { toSelfUser } from "../modules/users/user-views";

describe("escapeLike", () => {
  it("escapes LIKE wildcards and backslashes", () => {
    expect(escapeLike("100%_off\\")).toBe("100\\%\\_off\\\\");
    expect(escapeLike("ايفون 13")).toBe("ايفون 13");
  });
});

describe("generateSlug", () => {
  it("keeps Arabic letters and digits", () => {
    expect(generateSlug("شقة للبيع في دمشق!")).toMatch(
      /^شقة-للبيع-في-دمشق-[0-9a-z]+$/,
    );
  });
  it("lowercases Latin titles and strips punctuation", () => {
    expect(generateSlug("  iPhone 14 Pro — 256GB  ")).toMatch(
      /^iphone-14-pro-256gb-[0-9a-z]+$/,
    );
  });
  it("falls back to the suffix when nothing is left", () => {
    expect(generateSlug("!!!")).toMatch(/^[0-9a-z]+$/);
  });
});

describe("parseCorsOrigins", () => {
  it("defaults to the local dev frontend", () => {
    expect(parseCorsOrigins(undefined)).toEqual([
      "http://localhost:3000",
      "http://127.0.0.1:3000",
    ]);
  });
  it("parses a comma-separated list and trims trailing slashes", () => {
    expect(parseCorsOrigins(" https://a.sy/, https://b.sy ")).toEqual([
      "https://a.sy",
      "https://b.sy",
    ]);
  });
  it("allows any origin only when explicitly set to *", () => {
    expect(parseCorsOrigins("*")).toBe(true);
  });
});

describe("User serialisation", () => {
  const user = Object.assign(new User(), {
    id: "u1",
    username: "sami",
    displayName: "Sami",
    email: "sami@example.com",
    phone: "+963900000000",
    passwordHash: "$2b$10$secret",
    role: "user",
    isActive: true,
    isVerified: false,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-02"),
  });

  it("JSON.stringify only emits public fields", () => {
    const json = JSON.parse(JSON.stringify({ seller: user }));
    expect(Object.keys(json.seller).sort()).toEqual(
      [
        "avatarUrl",
        "bio",
        "createdAt",
        "displayName",
        "id",
        "isVerified",
        "username",
      ].sort(),
    );
  });

  it("toSelfUser includes the owner's contact details but never the hash", () => {
    const self = toSelfUser(user);
    expect(self.email).toBe("sami@example.com");
    expect(self.phone).toBe("+963900000000");
    expect(JSON.stringify(self)).not.toContain("secret");
  });
});
