import { cache } from 'react';
import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { SITE_NAME } from '@/config/site';
import { isLocale } from '@/i18n/config';
import { absoluteUrl, alternates, excerpt, NO_INDEX, OG_LOCALE } from '@/i18n/seo';
import { isUuid, serverApi } from '@/server/api';
import type { PaginatedListings, PublicUser } from '@/services/listings.service';
import type { Rating, Review } from '@/services/users.service';
import SellerProfile, { type Profile } from './SellerProfile';

type Props = { params: Promise<{ locale: string; id: string }> };

const getSeller = cache(
  (id: string): Promise<PublicUser | null> =>
    isUuid(id) ? serverApi<PublicUser>(`/users/${id}`) : Promise.resolve(null),
);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, id } = await params;
  if (!isLocale(locale)) return {};
  const t = await getTranslations({ locale, namespace: 'meta' });
  const user = await getSeller(id);
  if (!user) return { title: t('seller'), robots: NO_INDEX };

  const name = user.displayName || user.username;
  const path = `/users/${user.id}`;
  const description = excerpt(user.bio || t('sellerDescription', { name, site: SITE_NAME }));
  return {
    title: name,
    description,
    alternates: alternates(locale, path),
    openGraph: {
      type: 'profile',
      title: name,
      description,
      url: absoluteUrl(locale, path),
      siteName: SITE_NAME,
      locale: OG_LOCALE[locale],
      username: user.username,
    },
    twitter: { card: 'summary', title: name, description },
  };
}

export default async function SellerPage({ params }: Props) {
  const { locale, id } = await params;
  if (isLocale(locale)) setRequestLocale(locale);
  const user = await getSeller(id);

  let profile: Profile | null = null;
  if (user) {
    const [rating, reviews, listings] = await Promise.all([
      serverApi<Rating>(`/reviews/user/${id}/rating`),
      serverApi<Review[]>(`/reviews/user/${id}`),
      serverApi<PaginatedListings>(`/listings?userId=${id}&limit=40&page=1`),
    ]);
    profile = {
      user,
      rating: rating ?? { average: 0, count: 0 },
      reviews: reviews ?? [],
      listings: listings?.data ?? [],
      totalListings: listings?.meta.total ?? 0,
    };
  }

  return <SellerProfile key={id} id={id} initial={profile} />;
}
