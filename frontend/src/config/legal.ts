/**
 * Everything the legal pages (/terms, /privacy, /imprint, /rules) need to
 * know about the operator lives in this one object.
 *
 * TODO before going public: replace every value written as "[…]" and have
 * the four texts in src/content/legal/ checked by a lawyer. Unfilled values
 * are highlighted on the pages while `draft` is true.
 */
export const LEGAL = {
  /**
   * true  → every legal page shows a "Draft — needs legal review" note and
   *         highlights unfilled placeholders.
   * false → set this only after legal review, with all placeholders filled.
   */
  draft: true,

  /**
   * Date of the current texts (ISO). Keep it equal to the backend's
   * TERMS_VERSION, which is stored with each sign-up consent.
   */
  version: '2026-11-18',

  /** Youngest age allowed to hold an account. */
  minimumAge: 18,

  /** The natural or legal person who runs the service (the "controller"). */
  operator: {
    name: '[OPERATOR NAME OR COMPANY]',
    legalForm: '[LEGAL FORM, e.g. sole trader / GmbH / B.V.]',
    street: '[STREET AND NUMBER]',
    city: '[POSTCODE AND CITY]',
    country: '[EU COUNTRY]',
    email: '[CONTACT EMAIL]',
    phone: '[PHONE NUMBER]',
    /** Managing director or other authorised representative. */
    representative: '[AUTHORISED REPRESENTATIVE]',
    /** Commercial register and number, if registered. */
    register: '[REGISTER COURT AND NUMBER, or "not registered"]',
    vatId: '[VAT ID, or "none"]',
    /** Person responsible for editorial content (in Germany: § 18 (2) MStV). */
    contentResponsible: '[NAME AND ADDRESS OF THE PERSON RESPONSIBLE FOR CONTENT]',
  },

  /** Where privacy requests (access, objection, restriction…) are sent. */
  privacyEmail: '[PRIVACY CONTACT EMAIL]',

  /** Data protection officer, if one has been appointed. */
  dataProtectionOfficer: '[DATA PROTECTION OFFICER, or "none appointed"]',

  /** Contact for authorities and users under the EU Digital Services Act. */
  dsaContactEmail: '[DSA CONTACT EMAIL]',

  /** The data protection authority competent for the operator. */
  supervisoryAuthority: {
    name: '[COMPETENT DATA PROTECTION AUTHORITY]',
    website: '[AUTHORITY WEBSITE]',
  },

  /** Processors acting on the operator's behalf (Art. 28 GDPR). */
  processors: {
    hosting: { name: '[HOSTING PROVIDER]', location: '[EU DATA CENTRE LOCATION]' },
    email: { name: '[EMAIL DELIVERY PROVIDER]', location: '[PROVIDER COUNTRY]' },
  },

  /** Law that governs the Terms, and the courts named in them. */
  governingLaw: '[COUNTRY WHOSE LAW APPLIES]',
  jurisdiction: '[PLACE OF JURISDICTION]',
} as const;

export type LegalConfig = typeof LEGAL;

/** The four legal routes, in the order they are linked. */
export const LEGAL_PAGES = ['terms', 'privacy', 'rules', 'imprint'] as const;
export type LegalPage = (typeof LEGAL_PAGES)[number];

/** A config value that still has to be filled in. */
export function isPlaceholder(value: string): boolean {
  return value.startsWith('[');
}
