import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { ListingImage } from "./listing-image.entity";

export type ImageJobType = "generate_variants" | "delete_files" | "reprocess";
export type ImageJobStatus = "pending" | "running" | "done" | "failed";

@Entity("image_jobs")
export class ImageJob {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ name: "image_id" })
  imageId: string;

  @ManyToOne(() => ListingImage, (img) => img.jobs, { onDelete: "CASCADE" })
  @JoinColumn({ name: "image_id" })
  image: ListingImage;

  @Column({ name: "job_type", type: "varchar", length: 30 })
  jobType: ImageJobType;

  @Column({
    type: "varchar",
    length: 20,
    default: "pending",
  })
  status: ImageJobStatus;

  @Column({ name: "attempt_count", default: 0 })
  attemptCount: number;

  @Column({ name: "last_error", type: "text", nullable: true })
  lastError: string;

  @Column({ name: "created_at", type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt: Date;
}
