/**
 * Terms that hold a listing for moderator review (status "pending_review")
 * instead of publishing it. Matching is deliberately broad: a false
 * positive (e.g. "مسدس شمع", a glue gun) only delays the listing until a
 * moderator approves it, while a miss puts weapons or drugs on the site.
 *
 * Words with an everyday meaning are left out or used as a phrase:
 * رصاص (also "lead", قلم رصاص = pencil), رشاش (garden sprinkler), صاعق
 * (bug zapper), قنبلة alone ("عرض قنبلة" = a bomb of a deal), "gun"
 * (glue/heat/nail gun), "forged" (forged steel).
 *
 * Arabic terms match anywhere in the normalised text, because Arabic
 * attaches prefixes (و، ب، ال، ل) to words. Latin terms match whole words
 * only, so "gun" doesn't flag "begun".
 */
const ARABIC_TERMS = [
  // weapons & ammunition
  "سلاح",
  "أسلحة",
  "مسدس",
  "بندقية",
  "بنادق",
  "كلاشنكوف",
  "كلاشن",
  "بومباكشن",
  "جفت صيد",
  "ذخيرة",
  "طلقات",
  "قنبلة يدوية",
  "قنابل يدوية",
  "متفجرات",
  "ديناميت",
  // drugs
  "كبتاغون",
  "كبتاجون",
  "حشيش",
  "مخدرات",
  "مخدر",
  "حبوب مخدرة",
  "هيروين",
  "كوكايين",
  "ترامادول",
  "بانغو",
  "شابو",
  // forged documents
  "مزور",
  "تزوير",
];

const LATIN_TERMS = [
  // weapons & ammunition
  "pistol",
  "pistols",
  "rifle",
  "rifles",
  "ak47",
  "ak-47",
  "kalashnikov",
  "ammo",
  "ammunition",
  "bullets",
  "grenade",
  "grenades",
  "explosive",
  "explosives",
  "dynamite",
  // drugs
  "captagon",
  "cocaine",
  "heroin",
  "hashish",
  "cannabis",
  "marijuana",
  "meth",
  "tramadol",
  // forged documents
  "fake passport",
  "fake id",
  "counterfeit passport",
];

/**
 * Same folding as the database's normalize_search_text() (migration 010):
 * hamza/alef forms, ى→ي, ة→ه, ؤ→و, ئ→ي, Arabic-Indic digits → 0-9,
 * diacritics, tatweel and zero-width marks removed, lowercase, single
 * spaces.
 */
export function normaliseText(input: string): string {
  return input
    .toLowerCase()
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/[\u064B-\u065F\u0670\u0640\u200B-\u200F]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const ARABIC_MATCHERS = ARABIC_TERMS.map((term) => ({
  term,
  normalised: normaliseText(term),
}));

const LATIN_MATCHERS = LATIN_TERMS.map((term) => ({
  term,
  // whole word: not preceded or followed by a letter or digit
  pattern: new RegExp(
    `(?<![\\p{L}\\p{N}])${escapeRegExp(normaliseText(term))}(?![\\p{L}\\p{N}])`,
    "u",
  ),
}));

/** The prohibited terms found in the text (empty when it is clean). */
export function findProhibitedTerms(
  ...texts: (string | undefined)[]
): string[] {
  const text = normaliseText(texts.filter(Boolean).join(" "));
  if (!text) return [];
  const found = new Set<string>();
  for (const { term, normalised } of ARABIC_MATCHERS) {
    if (text.includes(normalised)) found.add(term);
  }
  for (const { term, pattern } of LATIN_MATCHERS) {
    if (pattern.test(text)) found.add(term);
  }
  return [...found];
}
