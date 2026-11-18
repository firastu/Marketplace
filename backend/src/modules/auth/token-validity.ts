import type { User } from "../users/user.entity";

/**
 * A token is only valid while the account exists and is active, and if it
 * carries the account's current token version. Changing or resetting the
 * password increments the version, which signs out every other session.
 * Tokens from before versions existed have none and count as version 0.
 */
export function isTokenCurrent(
  user: User | null,
  tokenVersion?: number,
): user is User {
  if (!user || !user.isActive || user.deletedAt) return false;
  return (tokenVersion ?? 0) === (user.tokenVersion ?? 0);
}
