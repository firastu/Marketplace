import type { User } from "./user.entity";

/**
 * What any visitor may see about a user (listing seller, chat partner,
 * reviewer). Never add contact details or account internals here.
 */
export interface PublicUser {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  bio: string | null;
  isVerified: boolean;
  createdAt: Date;
}

/** What the logged-in user may see about their own account. */
export interface SelfUser extends PublicUser {
  email: string;
  phone: string | null;
  role: string;
  lastLoginAt: Date | null;
  termsAcceptedAt: Date | null;
  termsVersion: string | null;
  updatedAt: Date;
}

export function toPublicUser(user: User): PublicUser {
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName ?? null,
    avatarUrl: user.avatarUrl ?? null,
    bio: user.bio ?? null,
    isVerified: user.isVerified,
    createdAt: user.createdAt,
  };
}

export function toSelfUser(user: User): SelfUser {
  return {
    ...toPublicUser(user),
    email: user.email,
    phone: user.phone ?? null,
    role: user.role,
    lastLoginAt: user.lastLoginAt ?? null,
    termsAcceptedAt: user.termsAcceptedAt ?? null,
    termsVersion: user.termsVersion ?? null,
    updatedAt: user.updatedAt,
  };
}
