'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getListings, Listing, PaginatedListings } from '@/services';

export default function HomePage() {
  const [data, setData] = useState<PaginatedListings | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  useEffect(() => {
    setLoading(true);
    getListings(page, 20)
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [page]);

  return (
    <div className="page">
      <h1>Browse Listings</h1>

      {loading && <div className="loading">Loading listings...</div>}

      {!loading && (!data || data.data.length === 0) && (
        <div className="empty">
          <p>No listings yet. Be the first to sell something!</p>
        </div>
      )}

      {!loading && data && data.data.length > 0 && (
        <>
          <div className="listing-grid" style={{ marginTop: '1.5rem' }}>
            {data.data.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>

          {data.meta.totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '2rem' }}>
              <button
                className="btn btn-secondary"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </button>
              <span style={{ display: 'flex', alignItems: 'center', fontSize: '0.875rem', color: 'var(--color-text-light)' }}>
                Page {data.meta.page} of {data.meta.totalPages}
              </span>
              <button
                className="btn btn-secondary"
                disabled={page >= data.meta.totalPages}
                onClick={() => setPage((p) => p + 1)}
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
  const primaryImage = listing.images?.find((img) => img.isPrimary) || listing.images?.[0];
  const imageUrl = primaryImage
    ? `${process.env.NEXT_PUBLIC_API_URL?.replace('/api', '')}${primaryImage.url}`
    : null;

  return (
    <Link href={`/listings/${listing.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
      <div className="card">
        {imageUrl ? (
          <img src={imageUrl} alt={listing.title} className="card-img" />
        ) : (
          <div className="card-img" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-light)', fontSize: '0.875rem' }}>
            No image
          </div>
        )}
        <div className="card-body">
          <div className="card-title">{listing.title}</div>
          <div className="card-price">
            {listing.currency} {Number(listing.price).toFixed(2)}
          </div>
          <div className="card-meta">
            {listing.locationCity} · {listing.condition}
          </div>
        </div>
      </div>
    </Link>
  );
}
