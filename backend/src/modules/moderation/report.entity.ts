import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { User } from "../users/user.entity";

export const REPORT_TARGETS = ["listing", "user"] as const;
export const REPORT_REASONS = [
  "prohibited_item",
  "scam",
  "counterfeit",
  "offensive",
  "harassment",
  "spam",
  "wrong_category",
  "other",
] as const;
export const REPORT_STATUSES = [
  "open",
  "under_review",
  "resolved",
  "dismissed",
] as const;
/** Statuses that still need a moderator. */
export const OPEN_REPORT_STATUSES = ["open", "under_review"];

export type ReportTarget = (typeof REPORT_TARGETS)[number];
export type ReportReason = (typeof REPORT_REASONS)[number];
export type ReportStatus = (typeof REPORT_STATUSES)[number];

@Entity("reports")
export class Report {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ name: "reporter_id", type: "uuid", nullable: true })
  reporterId: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: "reporter_id" })
  reporter: User | null;

  @Column({ name: "target_type", type: "varchar", length: 20 })
  targetType: ReportTarget;

  @Column({ name: "target_id", type: "uuid" })
  targetId: string;

  @Column({ type: "varchar", length: 30 })
  reason: ReportReason;

  @Column({ type: "text", nullable: true })
  details: string | null;

  @Column({ type: "varchar", length: 20, default: "open" })
  status: ReportStatus;

  @Column({ name: "resolution_note", type: "text", nullable: true })
  resolutionNote: string | null;

  @Column({ name: "resolved_by", type: "uuid", nullable: true })
  resolvedBy: string | null;

  @Column({ name: "resolved_at", type: "timestamptz", nullable: true })
  resolvedAt: Date | null;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt: Date;
}
