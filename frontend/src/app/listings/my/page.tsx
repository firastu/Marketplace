'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';
import { getMyListings, deleteListing, Listing } from '@/services/listings.service';

export default function MyListingsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }
    if (user) {
      getMyListings()
        .then(setListings)
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [authLoading, user, router]);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this listing?')) return;
    try {
      await deleteListing(id);
      setListings((prev) => prev.filter((l) => l.id !== id));
    } catch {
      alert('Failed to delete listing');
    }
  };

  if (authLoading || loading) return <div className="loading">Loading...</div>;
  if (!user) return null;

  return (
    <div className="page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1>My Listings</h1>
        <Link href="/listings/create" className="btn btn-primary" style={{ width: 'auto' }}>
          + New Listing
        </Link>
      </div>

      {listings.length === 0 ? (
        <div className="empty">
          <p>You haven&apos;t posted any listings yet.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {listings.map((listing) => (
            <div
              key={listing.id}
              className="card"
              style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', padding: '1rem', gap: '1rem' }}
            >
              <div style={{ flex: 1 }}>
                <Link href={`/listings/${listing.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                  <div style={{ fontWeight: 600 }}>{listing.title}</div>
                </Link>
                <div style={{ fontSize: '0.875rem', color: 'var(--color-text-light)', marginTop: '0.25rem' }}>
                  {listing.currency} {Number(listing.price).toFixed(2)} ·{' '}
                  <span className={`badge badge-${listing.status}`}>{listing.status}</span>
                </div>
              </div>
              <button onClick={() => handleDelete(listing.id)} className="btn btn-danger" style={{ padding: '0.375rem 0.75rem', fontSize: '0.75rem' }}>
                Delete
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
