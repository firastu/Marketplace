'use client';

import { useEffect, useMemo, useState, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  getListings,
  getImageUrl,
  Listing,
  PaginatedListings,
  ListingSearchParams,
} from '@/services';
import { getCategories, Category } from '@/services/categories.service';
import { CURRENCIES, Currency, formatPrice } from '@/utils/format';

const CONDITIONS = [
  { value: '', label: 'Any condition' },
  { value: 'new', label: 'New' },
  { value: 'like_new', label: 'Like New' },
  { value: 'used', label: 'Used' },
  { value: 'fair', label: 'Fair' },
  { value: 'poor', label: 'Poor' },
];

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest first' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
];

function flatCategories(cats: Category[]): Category[] {
  return cats.flatMap((c) => [c, ...flatCategories(c.children || [])]);
}

const FILTER_KEYS = [
  'q',
  'categoryId',
  'minPrice',
  'maxPrice',
  'condition',
  'currency',
  'sortBy',
] as const;
type FilterKey = (typeof FILTER_KEYS)[number];
type Filters = Record<FilterKey, string>;

type Result =
  | { key: string; data: PaginatedListings; error?: undefined }
  | { key: string; data?: undefined; error: string };

function HomePageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // The URL is the single source of truth for what is shown. The filters
  // used to be copied into component state once, on mount, so the Back
  // button, the "Browse" link and links from the Categories page changed
  // the address bar but not the results.
  const urlKey = searchParams.toString();
  const filters = useMemo(() => {
    const params = new URLSearchParams(urlKey);
    const values = {} as Filters;
    for (const key of FILTER_KEYS) values[key] = params.get(key) || '';
    values.sortBy = values.sortBy || 'newest';
    return values;
  }, [urlKey]);
  const page = useMemo(() => {
    const parsed = parseInt(new URLSearchParams(urlKey).get('page') || '1', 10);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
  }, [urlKey]);
  const { categoryId, condition, currency, sortBy } = filters;

  const [result, setResult] = useState<Result | null>(null);
  const [retry, setRetry] = useState(0);
  const [categories, setCategories] = useState<Category[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  // Text inputs are drafts: they are applied on submit / blur, not on
  // every keystroke (which sent one request and one history entry per
  // character), and follow the URL when it changes.
  const [search, setSearch] = useState(filters.q);
  const [minPrice, setMinPrice] = useState(filters.minPrice);
  const [maxPrice, setMaxPrice] = useState(filters.maxPrice);
  const [syncedKey, setSyncedKey] = useState(urlKey);
  if (syncedKey !== urlKey) {
    setSyncedKey(urlKey);
    setSearch(filters.q);
    setMinPrice(filters.minPrice);
    setMaxPrice(filters.maxPrice);
  }

  useEffect(() => {
    getCategories().then(setCategories).catch(() => {});
  }, []);

  const requestKey = `${urlKey}#${retry}`;
  useEffect(() => {
    // A slow response for an older search must not overwrite a newer one.
    let cancelled = false;
    const params: ListingSearchParams = {
      page,
      limit: 20,
      q: filters.q || undefined,
      categoryId: filters.categoryId || undefined,
      minPrice: filters.minPrice ? Number(filters.minPrice) : undefined,
      maxPrice: filters.maxPrice ? Number(filters.maxPrice) : undefined,
      condition: filters.condition || undefined,
      currency: (filters.currency || undefined) as Currency | undefined,
      sortBy: filters.sortBy as ListingSearchParams['sortBy'],
    };
    getListings(params)
      .then((data) => {
        if (!cancelled) setResult({ key: requestKey, data });
      })
      .catch((err) => {
        if (cancelled) return;
        setResult({
          key: requestKey,
          error: err instanceof Error ? err.message : 'Could not load listings',
        });
      });
    return () => {
      cancelled = true;
    };
  }, [filters, page, requestKey]);

  const loading = result?.key !== requestKey;
  const data = !loading && result?.data ? result.data : null;
  const loadError = !loading && result?.error ? result.error : '';

  const buildUrl = useCallback(
    (overrides: Record<string, string | number | undefined>) => {
      const params = new URLSearchParams();
      const values: Record<string, string | number | undefined> = {
        ...filters,
        // drafts the user typed but has not applied yet
        q: search.trim(),
        minPrice,
        maxPrice,
        page,
        ...overrides,
      };
      for (const [key, value] of Object.entries(values)) {
        const isDefault =
          (key === 'sortBy' && value === 'newest') || (key === 'page' && Number(value) === 1);
        if (value !== '' && value !== undefined && !isDefault) {
          params.set(key, String(value));
        }
      }
      const query = params.toString();
      return query ? `/?${query}` : '/';
    },
    [filters, search, minPrice, maxPrice, page],
  );

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    router.push(buildUrl({ page: 1 }));
  };

  const handleFilterChange = (changed: Record<string, string>) => {
    router.push(buildUrl({ ...changed, page: 1 }));
  };

  /** Apply a typed price when leaving the field or pressing Enter. */
  const commitPrice = (key: 'minPrice' | 'maxPrice', value: string) => {
    if (value !== filters[key]) handleFilterChange({ [key]: value });
  };
  const commitOnEnter =
    (key: 'minPrice' | 'maxPrice') => (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') commitPrice(key, e.currentTarget.value);
    };

  const handlePage = (newPage: number) => {
    router.push(buildUrl({ page: newPage }));
  };

  const clearFilters = () => {
    router.push('/');
  };

  const hasActiveFilters =
    filters.q ||
    categoryId ||
    filters.minPrice ||
    filters.maxPrice ||
    condition ||
    currency ||
    page > 1;

  return (
    <div className="page">
      <div style={{ marginBottom: '1.5rem' }}>
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search listings..."
            aria-label="Search listings"
            maxLength={200}
            style={{
              flex: 1,
              padding: '0.5rem 0.75rem',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius)',
              fontSize: '0.9375rem',
            }}
          />
          <button type="submit" className="btn btn-primary" style={{ width: 'auto' }}>
            Search
          </button>
          <button
            type="button"
            onClick={() => setShowFilters((v) => !v)}
            className="btn btn-secondary"
            style={{ width: 'auto' }}
          >
            {showFilters ? 'Hide filters' : 'Filters'}
          </button>
        </form>

        {showFilters && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
              gap: '0.75rem',
              padding: '1rem',
              background: 'var(--color-white)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius)',
              marginBottom: '0.75rem',
            }}
          >
            <div className="form-group" style={{ margin: 0 }}>
              <label htmlFor="filter-category" style={{ fontSize: '0.75rem', fontWeight: 600 }}>
                Category
              </label>
              <select
                id="filter-category"
                value={categoryId}
                onChange={(e) => {
                  handleFilterChange({ categoryId: e.target.value });
                }}
                style={{ width: '100%' }}
              >
                <option value="">All categories</option>
                {flatCategories(categories).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label htmlFor="filter-condition" style={{ fontSize: '0.75rem', fontWeight: 600 }}>
                Condition
              </label>
              <select
                id="filter-condition"
                value={condition}
                onChange={(e) => {
                  handleFilterChange({ condition: e.target.value });
                }}
                style={{ width: '100%' }}
              >
                {CONDITIONS.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label htmlFor="filter-currency" style={{ fontSize: '0.75rem', fontWeight: 600 }}>
                Currency
              </label>
              <select
                id="filter-currency"
                value={currency}
                onChange={(e) => {
                  handleFilterChange({ currency: e.target.value });
                }}
                style={{ width: '100%' }}
              >
                <option value="">Any currency</option>
                {CURRENCIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label htmlFor="filter-min-price" style={{ fontSize: '0.75rem', fontWeight: 600 }}>
                Min price
              </label>
              <input
                id="filter-min-price"
                type="number"
                min="0"
                step="0.01"
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
                onBlur={(e) => commitPrice('minPrice', e.target.value)}
                onKeyDown={commitOnEnter('minPrice')}
                placeholder="0"
                style={{ width: '100%' }}
              />
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label htmlFor="filter-max-price" style={{ fontSize: '0.75rem', fontWeight: 600 }}>
                Max price
              </label>
              <input
                id="filter-max-price"
                type="number"
                min="0"
                step="0.01"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                onBlur={(e) => commitPrice('maxPrice', e.target.value)}
                onKeyDown={commitOnEnter('maxPrice')}
                placeholder="Any"
                style={{ width: '100%' }}
              />
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label htmlFor="filter-sort" style={{ fontSize: '0.75rem', fontWeight: 600 }}>
                Sort by
              </label>
              <select
                id="filter-sort"
                value={sortBy}
                onChange={(e) => {
                  handleFilterChange({ sortBy: e.target.value });
                }}
                style={{ width: '100%' }}
              >
                {SORT_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>

            {hasActiveFilters && (
              <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                <button
                  type="button"
                  onClick={clearFilters}
                  className="btn btn-secondary"
                  style={{ width: 'auto', fontSize: '0.8125rem' }}
                >
                  Clear all
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {loading && <div className="loading">Loading listings...</div>}

      {loadError && (
        <div className="form-error" role="alert">
          Could not load listings: {loadError}{' '}
          <button
            type="button"
            onClick={() => setRetry((n) => n + 1)}
            className="btn btn-secondary"
            style={{ width: 'auto', marginLeft: '0.5rem' }}
          >
            Try again
          </button>
        </div>
      )}

      {!loading && !loadError && (!data || data.data.length === 0) && (
        <div className="empty">
          <p>No listings found. Try adjusting your search or filters.</p>
          {hasActiveFilters && (
            <button onClick={clearFilters} className="btn btn-secondary" style={{ marginTop: '0.75rem' }}>
              Clear filters
            </button>
          )}
        </div>
      )}

      {!loading && data && data.data.length > 0 && (
        <>
          <div style={{ marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--color-text-light)' }}>
            {data.meta.total} listing{data.meta.total !== 1 ? 's' : ''} found
          </div>
          <div className="listing-grid">
            {data.data.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>

          {data.meta.totalPages > 1 && (
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                gap: '0.5rem',
                marginTop: '2rem',
              }}
            >
              <button
                className="btn btn-secondary"
                disabled={page <= 1}
                onClick={() => handlePage(page - 1)}
              >
                Previous
              </button>
              <span
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  fontSize: '0.875rem',
                  color: 'var(--color-text-light)',
                }}
              >
                Page {data.meta.page} of {data.meta.totalPages}
              </span>
              <button
                className="btn btn-secondary"
                disabled={page >= data.meta.totalPages}
                onClick={() => handlePage(page + 1)}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function ListingCard({ listing }: { listing: Listing }) {
  const primaryImage =
    listing.images?.find((img) => img.isPrimary) || listing.images?.[0];
  const imageUrl = primaryImage ? getImageUrl(primaryImage, 'thumb') : null;

  return (
    <Link
      href={`/listings/${listing.id}`}
      style={{ textDecoration: 'none', color: 'inherit' }}
    >
      <div className="card">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={listing.title}
            className="card-img"
            loading="lazy"
          />
        ) : (
          <div
            className="card-img"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-text-light)',
              fontSize: '0.875rem',
            }}
          >
            No image
          </div>
        )}
        <div className="card-body">
          <div className="card-title">{listing.title}</div>
          <div className="card-price">
            {formatPrice(listing.price, listing.currency)}
          </div>
          <div className="card-meta">
            {[listing.locationCity, listing.condition].filter(Boolean).join(' · ')}
          </div>
        </div>
      </div>
    </Link>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={<div className="loading">Loading...</div>}>
      <HomePageInner />
    </Suspense>
  );
}
