import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from "typeorm";
import { Listing } from "./listing.entity";
import { ImageJob } from "./image-job.entity";

export type ImageStatus =
  | "uploaded"
  | "processing"
  | "ready"
  | "failed"
  | "deleted";

@Entity("listing_images")
export class ListingImage {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ name: "listing_id" })
  listingId: string;

  @ManyToOne(() => Listing, (listing) => listing.images, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "listing_id" })
  listing: Listing;

  @Column({ type: "text" })
  url: string;

  @Column({ name: "alt_text", length: 255, nullable: true })
  altText: string;

  @Column({ name: "sort_order", default: 0 })
  sortOrder: number;

  @Column({ name: "is_primary", default: false })
  isPrimary: boolean;

  @Column({ name: "mime_type", length: 50, nullable: true })
  mimeType: string;

  @Column({ name: "file_size_bytes", type: "bigint", nullable: true })
  fileSizeBytes: number;

  @Column({ type: "int", nullable: true })
  width: number;

  @Column({ type: "int", nullable: true })
  height: number;

  @Column({ name: "storage_key_original", type: "text", nullable: true })
  storageKeyOriginal: string;

  @Column({ name: "storage_key_thumb", type: "text", nullable: true })
  storageKeyThumb: string;

  @Column({ name: "storage_key_medium", type: "text", nullable: true })
  storageKeyMedium: string;

  @Column({ name: "storage_key_large", type: "text", nullable: true })
  storageKeyLarge: string;

  @Column({
    type: "varchar",
    length: 20,
    default: "processing",
  })
  status: ImageStatus;

  @Column({ name: "processing_error", type: "text", nullable: true })
  processingError: string;

  // Soft delete: TypeORM automatically leaves rows with deleted_at set out
  // of find() results and relation joins (listing.images), so deleted
  // images never reach clients and need no manual IS NULL filters.
  @DeleteDateColumn({ name: "deleted_at", type: "timestamptz", nullable: true })
  deletedAt: Date | null;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt: Date;

  @OneToMany(() => ImageJob, (job) => job.image)
  jobs: ImageJob[];

  /**
   * Server-side details stay out of API responses: where the private
   * original (with its EXIF data) is stored, and internal error text.
   */
  toJSON(): Partial<ListingImage> {
    const publicFields: Partial<ListingImage> = { ...this };
    delete publicFields.storageKeyOriginal;
    delete publicFields.processingError;
    delete publicFields.jobs;
    delete publicFields.listing;
    return publicFields;
  }
}
