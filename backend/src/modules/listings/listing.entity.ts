import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from "typeorm";
import { User } from "../users/user.entity";
import { Category } from "../categories/category.entity";
import { ListingImage } from "./listing-image.entity";

/** Syrian pound and US dollar — the two currencies used for pricing in Syria. */
export const CURRENCIES = ["SYP", "USD"] as const;
export type Currency = (typeof CURRENCIES)[number];

export const CONDITIONS = ["new", "like_new", "used", "fair", "poor"] as const;

/** Statuses a listing owner may set. "removed" is reserved for moderators. */
export const OWNER_SETTABLE_STATUSES = ["active", "reserved", "sold"] as const;

/** Statuses anyone may view. Sold listings stay visible (spec §6). */
export const PUBLIC_STATUSES = ["active", "reserved", "sold"];

/**
 * Held for a moderator because the text matched the prohibited-terms list
 * (migration 013). Visible only to the owner and staff.
 */
export const PENDING_REVIEW = "pending_review";

@Entity("listings")
export class Listing {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ name: "user_id" })
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: "user_id" })
  user: User;

  @Column({ name: "category_id" })
  categoryId: string;

  @ManyToOne(() => Category)
  @JoinColumn({ name: "category_id" })
  category: Category;

  @Column({ length: 200 })
  title: string;

  @Column({ length: 250 })
  slug: string;

  @Column({ type: "text" })
  description: string;

  @Column({ type: "numeric", precision: 12, scale: 2 })
  price: number;

  @Column({ length: 3, default: "SYP" })
  currency: Currency;

  @Column({ length: 20, default: "used" })
  condition: string;

  @Column({ length: 20, default: "active" })
  status: string;

  @Column({ name: "location_city", length: 100, nullable: true })
  locationCity: string;

  @Column({ name: "location_zip", length: 20, nullable: true })
  locationZip: string;

  @Column({ name: "location_lat", type: "double precision", nullable: true })
  locationLat: number;

  @Column({ name: "location_lng", type: "double precision", nullable: true })
  locationLng: number;

  @Column({ name: "views_count", default: 0 })
  viewsCount: number;

  @Column({ name: "is_negotiable", default: true })
  isNegotiable: boolean;

  @Column({ name: "is_shipping_available", default: false })
  isShippingAvailable: boolean;

  @Column({ name: "expires_at", type: "timestamptz", nullable: true })
  expiresAt: Date;

  /** Prohibited terms that put the listing on hold (empty when clean). */
  @Column({
    name: "moderation_flags",
    type: "text",
    array: true,
    default: () => "'{}'",
  })
  moderationFlags: string[];

  @OneToMany(() => ListingImage, (img) => img.listing, { cascade: true })
  images: ListingImage[];

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt: Date;

  // Soft delete (migration 009). Deleting a listing used to hard-delete it,
  // which cascaded to conversations and erased the buyer's chat history.
  @DeleteDateColumn({ name: "deleted_at", type: "timestamptz", nullable: true })
  deletedAt: Date | null;
}
