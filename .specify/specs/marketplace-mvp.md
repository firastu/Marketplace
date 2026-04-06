# Marketplace MVP Specification

## 1. Overview

Marketplace is a local-first peer-to-peer platform for buying and selling used items.  
The MVP focuses on trust, fast listing creation, efficient discovery, and simple buyer-seller communication.

This specification defines the minimal feature set required to enable real marketplace activity.

---

## 2. Product Goals

The system MUST enable users to:

- Create and manage accounts
- Publish listings with structured data and images
- Discover listings via search, categories, and filters
- View detailed listing information
- Save listings as favorites
- Communicate with sellers via in-app messaging
- Report listings and users for moderation

---

## 3. User Roles

### 3.1 Guest
- Can browse listings
- Can search and filter
- Cannot create listings, message, or favorite

### 3.2 Registered User (Buyer)
- All guest capabilities
- Can favorite listings
- Can message sellers
- Can report listings/users

### 3.3 Seller
- All buyer capabilities
- Can create, edit, delete listings
- Can mark listings as sold

### 3.4 Moderator/Admin
- Can review reports
- Can remove or hide listings
- Can take moderation actions on users

---

## 4. Core Domain Model

- User
- Profile
- Listing
- ListingImage
- Category
- Favorite
- Conversation
- Message
- Report
- ModerationAction

---

## 5. Functional Requirements

## 5.1 Authentication & Accounts

### User Stories
- As a user, I want to create an account so that I can use marketplace features.
- As a user, I want to log in securely.

### Requirements
- MUST support sign up, sign in, sign out
- MUST support basic profile management

### Validation Rules
- Email must be unique
- Password must meet minimum security requirements

### Edge Cases
- Duplicate email registration
- Invalid credentials
- Expired sessions

---

## 5.2 Listings

### User Stories
- As a seller, I want to create a listing so that I can sell an item.
- As a seller, I want to edit my listing.
- As a seller, I want to mark my item as sold.

### Requirements
- MUST allow create, edit, delete, and mark-as-sold
- MUST support multiple images per listing

### Required Fields
- title
- description
- price (> 0)
- category
- condition
- location
- at least one image

### Authorization
- Only listing owner can modify listing

### Edge Cases
- Missing required fields
- Upload failure
- Editing sold listing

---

## 5.3 Discovery (Search & Browse)

### User Stories
- As a buyer, I want to find relevant listings quickly.

### Requirements
- MUST support:
  - keyword search
  - category browsing
  - filtering (price, condition, location)
  - sorting (newest, price)

### Edge Cases
- No results
- Invalid filter combinations

---

## 5.4 Listing Detail

### Requirements
- MUST display:
  - images
  - title
  - price
  - condition
  - description
  - location
  - seller info

### Actions
- Save to favorites
- Contact seller
- Report listing

---

## 5.5 Favorites

### User Stories
- As a user, I want to save listings to view later.

### Requirements
- MUST allow save/remove favorite
- MUST provide favorites list

### Edge Cases
- Favorited item deleted
- Favorited item marked as sold

---

## 5.6 Messaging (Non-Realtime MVP)

### User Stories
- As a buyer, I want to contact a seller about a listing.

### Requirements
- MUST allow starting a conversation from listing page
- MUST support message threads
- MUST provide conversation list

### Constraints
- NOT realtime (no WebSocket required in MVP)

### Authorization
- Only participants can view conversation

### Edge Cases
- Seller deletes listing mid-conversation
- User blocked or suspended

---

## 5.7 Trust & Safety

### Requirements
- MUST allow reporting:
  - listings
  - users

- MUST include:
  - report reason
  - optional description

---

## 5.8 Moderation

### Requirements
- Admin MUST be able to:
  - view reports
  - hide/remove listings
  - take actions on users
  - record moderation reason

### States

#### Listing
- draft
- published
- sold
- archived
- removed

#### Report
- open
- under_review
- resolved
- dismissed

---

## 6. Business Rules

- Guests can browse but not interact
- Only authenticated users can:
  - create listings
  - message
  - favorite

- Listings remain visible after being marked as sold
- Listings SHOULD be soft-deleted, not permanently removed
- Users can only modify their own data
- Reports MUST be reviewable by moderators

---

## 7. Non-Goals (MVP)

- Payments
- Shipping integration
- Auctions
- Recommendation systems
- Social features
- Multi-language support
- Advanced rating systems

---

## 8. Non-Functional Requirements

### Performance
- Listing pages MUST load efficiently
- Search MUST respond quickly

### Security
- Authentication MUST be secure
- Authorization MUST be enforced on all actions

### Reliability
- Failures MUST provide user feedback
- Critical operations MUST not silently fail

### Accessibility
- Forms MUST be usable
- UI MUST be readable and navigable

---

## 9. Success Metrics

- Users can create listings without assistance
- Users can find relevant items within seconds
- Users can successfully contact sellers
- Low failure rate in listing creation and messaging

---

## 10. Open Questions (To Be Resolved)

- Should messaging support attachments in MVP?
messaging is already supported in the current files!
- Should users be able to edit messages?
yes
- Should deleted users retain listing ownership history?
no