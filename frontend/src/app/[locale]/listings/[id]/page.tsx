import { cache } from 'react';
import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { SITE_NAME } from '@/config/site';
import { isLocale, type Locale } from '@/i18n/config';
import { absoluteUrl, alternates, excerpt, jsonLd, NO_INDEX, OG_LOCALE } from '@/i18n/seo';
import { isUuid, serverApi } from '@/server/api';
import { getImageUrl, getPrimaryImage, type Listing } from '@/services/listings.service';
import type { Rating } from '@/services/users.service';
import { cityLabel, priceAmount } from '@/utils/format';
import ListingDetail from './ListingDetail';

type Props = { params: Promise<{ locale: string; id: string }> };

/**
 * One backend call per request, shared by generateMetadata and the page:
 * every call counts as a view of the listing, so it must not run twice.
 * A guest call: drafts, held and removed listings come back as null and
 * the browser retries with the visitor's own token (see ListingDetail).
 */
const getListing = cache(
  (id: string): Promise<Listing | null> =>
    isUuid(id) ? serverApi<Listing>(`/listings/${id}`) : Promise.resolve(null),
);

/** "150,000 SYP" / "$120" / "Free": plain text for descriptions. */
async function priceText(listing: Listing, locale: Locale): Promise<string> {
  const t = await getTranslations({ locale, namespace: 'format' });
  const amount = priceAmount(listing.price, listing.currency, locale);
  if (!amount) return '';
  if (amount.free) return t('free');
  return listing.currency === 'USD'
    ? `${t('unit.USD')}${amount.amount}`
    : `${amount.amount} ${t('unit.SYP')}`;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, id } = await params;
  if (!isLocale(locale)) return {};
  const listing = await getListing(id);
  if (!listing) {
    // Not public (or not there): the owner may still see it after the
    // browser retries, but search engines must not keep the address.
    const t = await getTranslations({ locale, namespace: 'meta' });
    return { title: t('listing'), robots: NO_INDEX };
  }

  const path = `/listings/${listing.id}`;
  const price = await priceText(listing, locale);
  const city = listing.locationCity ? cityLabel(listing.locationCity, locale) : '';
  const description = excerpt(
    [[price, city].filter(Boolean).join(' · '), listing.description].filter(Boolean).join(' — '),
  );
  const cover = getPrimaryImage(listing.images ?? []);
  const images = cover ? [{ url: getImageUrl(cover, 'medium'), alt: listing.title }] : undefined;
  const other = locale === 'ar' ? 'en' : 'ar';

  return {
    title: listing.title,
    description,
    alternates: alternates(locale, path),
    // Sold or reserved items stay reachable but are not worth indexing anew.
    robots: listing.status === 'sold' ? { index: false, follow: true } : undefined,
    openGraph: {
      type: 'website',
      title: listing.title,
      description,
      url: absoluteUrl(locale, path),
      siteName: SITE_NAME,
      locale: OG_LOCALE[locale],
      alternateLocale: [OG_LOCALE[other]],
      images,
    },
    twitter: {
      card: images ? 'summary_large_image' : 'summary',
      title: listing.title,
      description,
      images: images?.map((i) => i.url),
    },
  };
}

const AVAILABILITY: Record<string, string> = {
  active: 'https://schema.org/InStock',
  reserved: 'https://schema.org/LimitedAvailability',
  sold: 'https://schema.org/SoldOut',
};

function productJsonLd(listing: Listing, locale: Locale) {
  const url = absoluteUrl(locale, `/listings/${listing.id}`);
  const seller = listing.user?.displayName || listing.user?.username;
  const condition =
    listing.condition === 'new'
      ? 'https://schema.org/NewCondition'
      : 'https://schema.org/UsedCondition';
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: listing.title,
    description: listing.description,
    sku: listing.id,
    url,
    inLanguage: locale,
    image: (listing.images ?? []).map((image) => getImageUrl(image, 'large')),
    category: (locale === 'ar' && listing.category?.nameAr) || listing.category?.name,
    itemCondition: condition,
    offers: {
      '@type': 'Offer',
      url,
      price: Number(listing.price),
      priceCurrency: listing.currency,
      availability: AVAILABILITY[listing.status] ?? 'https://schema.org/Discontinued',
      itemCondition: condition,
      ...(seller && { seller: { '@type': 'Person', name: seller } }),
      ...(listing.locationCity && {
        availableAtOrFrom: {
          '@type': 'Place',
          address: {
            '@type': 'PostalAddress',
            addressLocality: cityLabel(listing.locationCity, locale),
            addressCountry: 'SY',
          },
        },
      }),
    },
  };
}

export default async function ListingPage({ params }: Props) {
  const { locale, id } = await params;
  if (isLocale(locale)) setRequestLocale(locale);
  const listing = await getListing(id);
  const rating = listing?.user
    ? await serverApi<Rating>(`/reviews/user/${listing.user.id}/rating`)
    : null;

  return (
    <>
      {listing && isLocale(locale) && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLd(productJsonLd(listing, locale)) }}
        />
      )}
      {/* The key resets the client state when moving between listings. */}
      <ListingDetail key={id} id={id} initial={listing} initialRating={rating} />
    </>
  );
}
