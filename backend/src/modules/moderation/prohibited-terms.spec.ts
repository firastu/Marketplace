import { findProhibitedTerms, normaliseText } from "./prohibited-terms";

describe("normaliseText", () => {
  it("folds Arabic spelling variants like the database does", () => {
    expect(normaliseText("أسلحة")).toBe("اسلحه");
    expect(normaliseText("كُرْسِيّ مـــكتب")).toBe("كرسي مكتب");
    expect(normaliseText("شاشة ٤٣  ۱۲۸")).toBe("شاشه 43 128");
    expect(normaliseText("  AK-47  Rifle ")).toBe("ak-47 rifle");
  });
});

describe("findProhibitedTerms", () => {
  it("flags weapons and drugs in Arabic, with prefixes and spelling variants", () => {
    expect(findProhibitedTerms("مسدس للبيع")).toEqual(["مسدس"]);
    expect(findProhibitedTerms("والمسدسات نظيفة")).toEqual(["مسدس"]);
    expect(findProhibitedTerms("اسلحه وذخيره")).toEqual(
      expect.arrayContaining(["أسلحة", "ذخيرة"]),
    );
    expect(findProhibitedTerms("حبوب كبتاجون")).toContain("كبتاجون");
    expect(findProhibitedTerms("هوية مزوّرة")).toContain("مزور");
  });

  it("flags Latin terms as whole words only", () => {
    expect(findProhibitedTerms("AK-47 rifle, mint")).toEqual(
      expect.arrayContaining(["ak-47", "rifle"]),
    );
    expect(findProhibitedTerms("Glock pistol")).toEqual(["pistol"]);
    expect(findProhibitedTerms("The work has begun")).toEqual([]);
    expect(findProhibitedTerms("Garden hammock and gunny sacks")).toEqual([]);
    expect(findProhibitedTerms("Method acting books")).toEqual([]);
  });

  it("doesn't flag everyday words that share a term", () => {
    expect(findProhibitedTerms("قلم رصاص وألوان")).toEqual([]);
    expect(findProhibitedTerms("رشاش مياه للحديقة")).toEqual([]);
    expect(findProhibitedTerms("صاعق حشرات كهربائي")).toEqual([]);
    expect(findProhibitedTerms("عرض قنبلة على الموبايلات")).toEqual([]);
    expect(findProhibitedTerms("Hot glue gun and heat gun")).toEqual([]);
    expect(findProhibitedTerms("Forged steel chef knife")).toEqual([]);
    expect(findProhibitedTerms("قنبلة يدوية")).toEqual(["قنبلة يدوية"]);
  });

  it("leaves ordinary listings alone", () => {
    expect(
      findProhibitedTerms("آيفون 13 برو", "بحالة ممتازة مع الشاحن"),
    ).toEqual([]);
    expect(findProhibitedTerms("Sofa", "Three seats, grey fabric")).toEqual([]);
    expect(findProhibitedTerms("")).toEqual([]);
  });

  it("checks title and description together", () => {
    expect(findProhibitedTerms("Hunting gear", "comes with ammo")).toEqual([
      "ammo",
    ]);
  });
});
