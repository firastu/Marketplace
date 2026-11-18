import type { MetadataRoute } from 'next';
import { LEGAL_PAGES } from '@/config/legal';
import { LOCALES } from '@/i18n/config';
import { absoluteUrl, languageUrls } from '@/i18n/seo';
import { serverApi } from '@/server/api';
import type { PaginatedListings } from '@/services/listings.service';

// Built per request (the listings change all day and the backend is not
// reachable while the Docker image is built); the backend answers are
// reused for ten minutes.
export const dynamic = 'force-dynamic';

const PAGE_SIZE = 100; // API maximum
const MAX_PAGES = 20; // newest 2,000 active listings
const REVALIDATE_SECONDS = 600;

type Entry = MetadataRoute.Sitemap[number];

/** One entry per language, each pointing at the other (hreflang). */
function localized(path: string, rest: Omit<Entry, 'url' | 'alternates'> = {}): Entry[] {
  const languages = languageUrls(path);
  return LOCALES.map((locale) => ({
    url: absoluteUrl(locale, path),
    alternates: { languages },
    ...rest,
  }));
}

async function recentListings(): Promise<Entry[]> {
  const entries: Entry[] = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    // The public list contains active listings only, newest first.
    const res = await serverApi<PaginatedListings>(
      `/listings?sortBy=newest&limit=${PAGE_SIZE}&page=${page}`,
      { revalidate: REVALIDATE_SECONDS },
    );
    if (!res) break;
    for (const listing of res.data) {
      entries.push(
        ...localized(`/listings/${listing.id}`, {
          lastModified: listing.createdAt,
          changeFrequency: 'daily',
          priority: 0.8,
        }),
      );
    }
    if (page >= res.meta.totalPages) break;
  }
  return entries;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  return [
    ...localized('/', { changeFrequency: 'hourly', priority: 1 }),
    ...localized('/categories', { changeFrequency: 'weekly', priority: 0.6 }),
    ...LEGAL_PAGES.flatMap((page) =>
      localized(`/${page}`, { changeFrequency: 'yearly', priority: 0.2 }),
    ),
    ...(await recentListings()),
  ];
}
