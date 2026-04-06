'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  getListings,
  Listing,
  PaginatedListings,
  ListingSearchParams,
} from '@/services';
import { getCategories, Category } from '@/services/categories.service';

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

function HomePageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [data, setData] = useState<PaginatedListings | null>(null);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  const [search, setSearch] = useState(searchParams.get('q') || '');
  const [categoryId, setCategoryId] = useState(searchParams.get('categoryId') || '');
  const [minPrice, setMinPrice] = useState(searchParams.get('minPrice') || '');
  const [maxPrice, setMaxPrice] = useState(searchParams.get('maxPrice') || '');
  const [condition, setCondition] = useState(searchParams.get('condition') || '');
  const [sortBy, setSortBy] = useState(searchParams.get('sortBy') || 'newest');

  const page = parseInt(searchParams.get('page') || '1', 10);

  useEffect(() => {
    getCategories().then(setCategories).catch(() => {});
  }, []);

  const fetchListings = useCallback(
    (overrides: Partial<ListingSearchParams> = {}) => {
      setLoading(true);
      const params: ListingSearchParams = {
        page,
        limit: 20,
        q: search || undefined,
        categoryId: categoryId || undefined,
        minPrice: minPrice ? Number(minPrice) : undefined,
        maxPrice: maxPrice ? Number(maxPrice) : undefined,
        condition: condition || undefined,
        sortBy: sortBy as ListingSearchParams['sortBy'],
        ...overrides,
      };
      getListings(params)
        .then(setData)
        .catch(() => setData(null))
        .finally(() => setLoading(false));
    },
    [page, search, categoryId, minPrice, maxPrice, condition, sortBy],
  );

  useEffect(() => {
    fetchListings();
  }, [fetchListings]);

  const buildUrl = useCallback(
    (overrides: Record<string, string | number | undefined>) => {
      const params = new URLSearchParams();
      const values = {
        q: search,
        categoryId,
        minPrice,
        maxPrice,
        condition,
        sortBy,
        page: String(page),
        ...overrides,
      };
      for (const [key, value] of Object.entries(values)) {
        if (value !== '' && value !== undefined) {
          params.set(key, String(value));
        }
      }
      return `/?${params.toString()}`;
    },
    [search, categoryId, minPrice, maxPrice, condition, sortBy, page],
  );

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    router.push(buildUrl({ page: 1 }));
  };

  const handleFilterChange = () => {
    router.push(buildUrl({ page: 1 }));
  };

  const handlePage = (newPage: number) => {
    router.push(buildUrl({ page: newPage }));
  };

  const clearFilters = () => {
    setSearch('');
    setCategoryId('');
    setMinPrice('');
    setMaxPrice('');
    setCondition('');
    setSortBy('newest');
    router.push('/');
  };

  const hasActiveFilters =
    search || categoryId || minPrice || maxPrice || condition || page > 1;

  return (
    <div className="page">
      <div style={{ marginBottom: '1.5rem' }}>
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search listings..."
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
                  setCategoryId(e.target.value);
                  handleFilterChange();
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
                  setCondition(e.target.value);
                  handleFilterChange();
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
              <label htmlFor="filter-min-price" style={{ fontSize: '0.75rem', fontWeight: 600 }}>
                Min price
              </label>
              <input
                id="filter-min-price"
                type="number"
                min="0"
                step="0.01"
                value={minPrice}
                onChange={(e) => {
                  setMinPrice(e.target.value);
                  handleFilterChange();
                }}
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
                onChange={(e) => {
                  setMaxPrice(e.target.value);
                  handleFilterChange();
                }}
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
                  setSortBy(e.target.value);
                  handleFilterChange();
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

      {!loading && (!data || data.data.length === 0) && (
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
  const imageUrl = primaryImage
    ? `${process.env.NEXT_PUBLIC_API_URL?.replace('/api', '')}${primaryImage.url}`
    : null;

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
            {listing.currency} {Number(listing.price).toFixed(2)}
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
