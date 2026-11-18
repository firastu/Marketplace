import { createNavigation } from 'next-intl/navigation';
import { routing } from './routing';

/**
 * Locale-aware Link / router: paths are written without a language prefix
 * ("/listings/my") everywhere in the app, and these add "/en" when needed.
 * usePathname() likewise returns the path without the prefix.
 */
export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation(routing);
