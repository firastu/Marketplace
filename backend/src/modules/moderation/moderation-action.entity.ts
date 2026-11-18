import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { User } from "../users/user.entity";

export type ModerationActionType =
  | "approve_listing"
  | "remove_listing"
  | "restore_listing"
  | "suspend_user"
  | "reactivate_user"
  | "resolve_report"
  | "dismiss_report";

/** Audit log of moderator decisions (migration 013). */
@Entity("moderation_actions")
export class ModerationAction {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ name: "moderator_id", type: "uuid", nullable: true })
  moderatorId: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: "moderator_id" })
  moderator: User | null;

  @Column({ type: "varchar", length: 30 })
  action: ModerationActionType;

  @Column({ name: "target_type", type: "varchar", length: 20 })
  targetType: "listing" | "user" | "report";

  @Column({ name: "target_id", type: "uuid" })
  targetId: string;

  @Column({ type: "text", nullable: true })
  reason: string | null;

  @Column({ name: "report_id", type: "uuid", nullable: true })
  reportId: string | null;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;
}
