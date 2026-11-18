import { useCallback } from 'react';
import { useTranslations } from 'next-intl';
import type { Messages } from 'next-intl';
import { ApiError } from '@/services/api-client';

type ErrorKey = keyof Messages['errors'];

/**
 * The API answers in English and has no error codes yet, so the texts users
 * commonly run into are recognised here and shown in their language.
 * Anything else falls back to the HTTP status, then to a generic message.
 */
const KNOWN_MESSAGES: Record<string, ErrorKey> = {
  'Invalid credentials': 'invalidCredentials',
  'Email already registered': 'emailTaken',
  'Username already taken': 'usernameTaken',
  'This account has been deactivated': 'accountDeactivated',
  'Account not found or deactivated': 'accountDeactivated',
  'Already in favorites': 'alreadyFavorite',
  'Cannot message yourself': 'cannotMessageSelf',
  'Listing not found': 'listingNotFound',
  'This listing is no longer available for new enquiries': 'listingClosed',
  'This listing was removed by moderation and can no longer be changed': 'listingRemoved',
  'Conversation not found': 'conversationNotFound',
  'Not a participant of this conversation': 'conversationNotFound',
  'You do not own this listing': 'notOwner',
  'User not found': 'userNotFound',
  'Unknown category': 'categoryNotFound',
  'Category not found': 'categoryNotFound',
  'File is not a valid image. Upload a JPEG, PNG or WebP image.': 'invalidImage',
  'The image could not be processed. Try a different photo.': 'invalidImage',
  'Image dimensions are too large': 'imageTooLarge',
  'Upload cancelled': 'uploadCancelled',
  'This reset link is invalid or has expired': 'resetInvalid',
  'Current password is incorrect': 'currentPasswordWrong',
  'Password is incorrect': 'passwordWrong',
  'You have already reported this': 'alreadyReported',
  'You must accept the Terms and the Privacy Policy': 'termsRequired',
  'Session expired or account unavailable': 'sessionExpired',
  'Insufficient permissions': 'staffOnly',
  "You can't report your own listing": 'cannotReportOwn',
  "You can't report yourself": 'cannotReportOwn',
  "Moderators can't take actions on admins": 'cannotModerate',
  "You can't take moderation actions on yourself": 'cannotModerate',
};

const KNOWN_PREFIXES: [string, ErrorKey][] = [
  ['Unsupported image format', 'invalidImage'],
  ['Maximum 15 images', 'maxImages'],
  ['phone must be in international format', 'phoneInvalid'],
  ['This listing is under review', 'pendingStatusLocked'],
];

const BY_STATUS: Record<number, ErrorKey> = {
  0: 'network',
  400: 'validation',
  401: 'unauthorized',
  403: 'forbidden',
  404: 'notFound',
  409: 'conflict',
  413: 'tooLarge',
  422: 'validation',
  429: 'tooMany',
};

/** Message key for a thrown value, or null when nothing specific is known. */
export function errorKey(err: unknown): ErrorKey | null {
  if (!(err instanceof ApiError)) {
    // fetch() rejects with a TypeError when the request never got through.
    return err instanceof TypeError ? 'network' : null;
  }
  const known =
    KNOWN_MESSAGES[err.message] ??
    KNOWN_PREFIXES.find(([prefix]) => err.message.startsWith(prefix))?.[1];
  if (known) return known;
  if (err.status >= 500) return 'server';
  return BY_STATUS[err.status] ?? null;
}

/**
 * Returns `(err, fallback?) => string`: the translated text for an error,
 * for toasts and inline notices. `fallback` is an already translated
 * sentence about what failed ("Could not delete the listing"), used when
 * the error itself says nothing useful.
 */
export function useErrorText() {
  const t = useTranslations('errors');
  return useCallback(
    (err: unknown, fallback?: string) => {
      const key = errorKey(err);
      return key ? t(key) : (fallback ?? t('generic'));
    },
    [t],
  );
}
