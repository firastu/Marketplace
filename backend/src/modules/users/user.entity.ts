import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";
import { toPublicUser, PublicUser } from "./user-views";

@Entity("users")
export class User {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ unique: true, length: 255 })
  email: string;

  // Never loaded unless a query asks for it explicitly (see
  // UsersService.findByEmailWithPassword).
  @Column({ name: "password_hash", length: 255, select: false })
  passwordHash: string;

  @Column({ unique: true, length: 100 })
  username: string;

  @Column({ name: "display_name", length: 150, nullable: true })
  displayName: string;

  @Column({ name: "avatar_url", type: "text", nullable: true })
  avatarUrl: string;

  @Column({ length: 30, nullable: true })
  phone: string;

  @Column({ type: "text", nullable: true })
  bio: string;

  @Column({ name: "is_verified", default: false })
  isVerified: boolean;

  @Column({ name: "is_active", default: true })
  isActive: boolean;

  @Column({ length: 20, default: "user" })
  role: string;

  @Column({ name: "last_login_at", type: "timestamptz", nullable: true })
  lastLoginAt: Date;

  /** When the user accepted the Terms / Privacy Policy, and which version. */
  @Column({ name: "terms_accepted_at", type: "timestamptz", nullable: true })
  termsAcceptedAt: Date | null;

  @Column({
    name: "terms_version",
    type: "varchar",
    length: 20,
    nullable: true,
  })
  termsVersion: string | null;

  /**
   * Copied into every token; incremented on password change/reset and
   * account deletion, which invalidates all earlier tokens.
   */
  @Column({ name: "token_version", type: "int", default: 0 })
  tokenVersion: number;

  /** When the password was last changed (informational). */
  @Column({ name: "password_changed_at", type: "timestamptz", nullable: true })
  passwordChangedAt: Date | null;

  /**
   * Set when the user deleted their account (personal data erased). A plain
   * column on purpose: a @DeleteDateColumn would drop these users from
   * relation joins, leaving their old chat messages without a sender.
   */
  @Column({ name: "deleted_at", type: "timestamptz", nullable: true })
  deletedAt: Date | null;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt: Date;

  /**
   * Any User that ends up in an HTTP response or a Socket.IO payload
   * (e.g. as a listing's seller or a message's sender) is serialised
   * through JSON.stringify, which calls this. Only public fields leave the
   * server this way; endpoints that return the caller's own account use
   * toSelfUser() explicitly.
   */
  toJSON(): PublicUser {
    return toPublicUser(this);
  }
}
