# Wholesale (B2B) Specification

## 1. Overview

Wholesale lets **suppliers** (importers, distributors, factories, big
wholesalers) sell in bulk to **business buyers** (shops, supermarkets,
pharmacies, mobile shops, restaurants, workshops) on the same platform as
the consumer marketplace.

Today this trade in Syria runs on phone calls, WhatsApp price lists that go
stale with every exchange-rate move, Telegram channels and sales reps
visiting shops. Wholesale replaces that with:

- a searchable catalogue with real wholesale terms (pack size, minimum
  order, quantity price breaks),
- prices that stay current (USD price with the supplier's own SYP rate),
- order requests that suppliers confirm, without needing online payment,
- one-tap re-ordering, which is most of what a shop does every week.

The consumer marketplace (classifieds) stays exactly as it is. Wholesale is
a separate section with its own listings and rules, sharing accounts,
messaging, images, search infrastructure and the design system.

## 2. Goals

The system MUST enable:

- A business to create a business profile, prove it is real, and add staff.
- A supplier to publish a branded storefront and a wholesale catalogue.
- A business buyer to find suppliers and products by category, location
  served and price, and compare terms.
- A buyer to send an order request covering several products from one
  supplier, and the supplier to confirm, adjust or decline it.
- Both sides to track orders and re-order in one tap.
- (Phase 3) A buyer to post a request for quotation (RFQ) and compare quotes.

## 3. Roles

| Role | Who | Can |
|---|---|---|
| Consumer | any registered user | use the classifieds marketplace; browse public wholesale pages |
| Business member | user who belongs to a business | act on behalf of that business, per member role |
| Supplier | business with selling enabled and verified | storefront, catalogue, receive and confirm orders, answer RFQs |
| Business buyer | business with buying enabled | see "business-only" prices once verified, send order requests, post RFQs |
| Admin / moderator | platform staff | verify businesses, moderate catalogue, resolve disputes |

A business can be both supplier and buyer (a distributor buys from the
importer and sells to shops).

Member roles inside a business: **Owner** (everything, billing, members),
**Manager** (catalogue, orders, prices), **Sales** (orders and chats only).

## 4. Domain model

- **Business**: legal name, trade name (Arabic and Latin), slug, type
  (supplier / buyer / both), logo, cover image, description, phone,
  WhatsApp, address, governorate, verification status, plan.
- **BusinessMember**: user, business, role.
- **BusinessVerification**: commercial register number (السجل التجاري),
  chamber of commerce / industry membership, uploaded documents (private,
  same storage rules as private image originals), reviewer, decision, reason.
- **SupplierTerms**: governorates served (with delivery days and minimum
  order value per governorate), payment methods offered (cash on delivery,
  bank transfer, mobile wallet, credit for approved customers), typical
  lead time, return policy text.
- **Product** (wholesale, separate from classifieds listings): category,
  title (Arabic/Latin), description, brand, images, **sale unit** (piece,
  pack, carton, dozen, kg, litre), **pack contents** (e.g. "carton of 24 ×
  330 ml"), **minimum order quantity** in sale units, **stock status** (in
  stock / low / out / made to order), **lead time**, **price visibility**
  (public / verified businesses only / on request), status (draft / active /
  paused / removed).
- **PriceTier**: product, minimum quantity, unit price. At least one tier.
  Example: 1–9 cartons $12.40, 10–49 $11.80, 50+ $11.20.
- **Price currency**: products are priced in USD or SYP. A supplier who
  prices in USD can set a **daily SYP rate**; buyers see both, with "rate
  updated today/2 days ago".
- **Cart**: per buyer business, grouped by supplier.
- **OrderRequest**: buyer business, supplier, items (product, quantity,
  unit price at request time), delivery governorate and address, requested
  delivery date, payment method, note, status, totals in the order
  currency, audit trail of changes.
- **RFQ** (phase 3): buyer business, category, description, quantity,
  target price (optional), deadline, governorate; **Quote**: supplier,
  price, validity, lead time, note.
- **SupplierReview**: one per completed order; rating for product
  accuracy, delivery and communication.

## 5. Functional requirements

### 5.1 Business accounts & verification
- Any user can create a business and becomes its Owner; Owners invite
  members by phone or email.
- Selling requires verification. An admin reviews documents and approves or
  rejects with a reason. Verified businesses get a badge; the badge is
  revoked if documents expire or fraud is found.
- Buyers can use Wholesale unverified, but cannot see "verified businesses
  only" prices or send orders to suppliers that require verified buyers.
- Edge cases: duplicate commercial register numbers; member leaves; owner
  transfer; business deactivated (catalogue hidden, open orders frozen,
  both sides notified).

### 5.2 Storefront
- Public page per supplier: cover, logo, name, verified badge, rating,
  response time, governorates served, minimum order, payment methods,
  catalogue with categories and search, "Message supplier", "Follow".
- Shareable link with a rich preview (works in WhatsApp/Telegram).

### 5.3 Catalogue (supplier)
- Create/edit products with tiers, pack contents, MOQ, stock, visibility.
- Bulk update: CSV/Excel import and export (prices and stock), "raise all
  USD prices by x%", and "set today's SYP rate" in one action.
- Pause a product, or the whole storefront (holiday mode).
- Validation: tiers ascending by quantity with non-increasing unit price;
  MOQ ≤ first tier quantity; at least one image for active products.

### 5.4 Discovery (buyer)
- Wholesale home: categories, featured verified suppliers, "re-order"
  shortcut, recently viewed.
- Search products and suppliers; filters: category, **delivers to my
  governorate**, verified only, price range per unit, MOQ at most, in stock,
  payment method (e.g. accepts credit).
- Product card: image, title, supplier with badge, "from $11.20 / carton",
  "MOQ 5 cartons", pack contents, delivery chip. Price-locked state:
  "Verify your business to see prices".
- Product page: gallery, tier table with the buyer's current quantity
  highlighted, pack contents, stock, lead time, supplier card with terms,
  quantity stepper that respects MOQ and pack multiples, "Add to order".

### 5.5 Order requests (phase 2)
- Cart grouped by supplier; each group shows subtotal, the supplier's
  minimum order for the buyer's governorate, and what is missing to reach
  it.
- Submitting creates one **order request** per supplier. Status flow:
  `requested → confirmed | changed_by_supplier | declined →
  (buyer accepts changes) → preparing → out_for_delivery → delivered →
  completed`, plus `cancelled` (either side, before preparing).
- The supplier can change quantities, prices or delivery date; the buyer
  must accept changes before the order proceeds. Every change is logged.
- Payment happens off-platform; the order records the agreed method.
  Credit is only offered to customers the supplier has approved.
- Each order has its own chat thread (reusing conversations).
- **Re-order**: copy a past order into the cart with current prices,
  flagging items whose price or availability changed.
- Notifications on every status change (in-app now; push/Telegram later).

### 5.6 Supplier dashboard
- Today: new order requests, orders to deliver, unread chats, low stock.
- Orders inbox with filters by status and governorate.
- Customers: list of buying businesses, order history, approve for credit,
  assign a price group (phase 3).
- Analytics: storefront views, product views, order requests, conversion,
  top products, revenue by month (from confirmed orders).

### 5.7 RFQs (phase 3)
- Buyer posts an RFQ; matching suppliers (category and governorate served)
  are notified; suppliers answer with quotes; the buyer compares side by
  side and converts a quote into an order request.

### 5.8 Customer price groups & credit (phase 3)
- Supplier-defined groups (e.g. retail, supermarket, distributor) with their
  own tiers; credit limit and terms (e.g. 30 days) per approved customer;
  outstanding balance shown to both sides (informational, no payment
  processing).

## 6. Business rules
- Wholesale products are never mixed into consumer search results; the
  consumer site links to Wholesale from the header.
- Only verified suppliers can publish active products.
- Price shown is always for the stated sale unit; the per-piece price is
  derived and shown as secondary information.
- Prices on an order request are locked at request time; later catalogue
  changes don't alter existing requests.
- All monetary amounts store currency explicitly (USD or SYP), like the
  marketplace.
- Business documents are private and never served publicly.

## 7. Syria-specific requirements
- Arabic first, right-to-left, like the rest of the platform.
- Exchange-rate reality: USD pricing with a supplier-set daily SYP rate and
  a visible "rate updated" date.
- Delivery by governorate, with delivery days per governorate (e.g. Homs:
  Mon/Thu); many suppliers deliver with their own trucks.
- No dependency on card payments; cash on delivery, bank transfer, mobile
  wallets and supplier credit are recorded, not processed.
- Works on low-end phones and slow data: catalogue pages server-rendered,
  images in the same thumb/medium/large pipeline, prices readable without
  loading images.
- Contact via in-app chat plus optional phone/WhatsApp buttons, because
  that's how shops already work.

## 8. Phasing

| Phase | Scope |
|---|---|
| **B1 — Catalogue** | Business accounts, members, verification + admin review, storefronts, wholesale products with pack size / MOQ / tiers / visibility, wholesale browse and search, contact supplier |
| **B2 — Ordering** | Cart by supplier, order requests with confirm/change/decline flow, order chat, re-order, delivery coverage and minimum order per governorate, CSV import/export, supplier dashboard |
| **B3 — Growth** | RFQs and quotes, customer price groups, credit terms, analytics, team roles, subscription plans and featured placement |

Prerequisite: Arabic i18n (in progress) so Wholesale ships bilingual.

## 9. Monetisation (proposal)
- Supplier plans: **Free** (up to 25 products, basic storefront), **Pro**
  (unlimited products, CSV import, analytics, featured category slots),
  **Enterprise** (multiple branches/warehouses, API, account manager).
- Featured suppliers on Wholesale home and category pages.
- No commission while payments happen off-platform.

## 10. Non-goals (for now)
- Online payment, escrow, invoicing and tax documents.
- Logistics/shipping integration.
- Inventory sync with external ERP systems (CSV covers it initially).
- Auctions and dynamic pricing.

## 11. Success metrics
- Number of verified suppliers and active products.
- Order requests per week and confirmation rate.
- Share of orders that are re-orders (habit formation).
- Median supplier response time to a new order request.

## 12. Open questions
- Do suppliers need multiple warehouses/branches with separate stock in B1?
- Should unverified buyers be able to send order requests at all, or only
  messages?
- Verification documents accepted per business type (shop licence vs
  commercial register vs industrial register)?
- Which mobile wallets and banks to list as payment methods?
