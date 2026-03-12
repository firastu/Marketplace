'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { getListingById, Listing } from '@/services';
import { startConversation } from '@/services/messages.service';

export default function ListingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [contacting, setContacting] = useState(false);

  useEffect(() => {
    const id = params.id as string;
    if (!id) return;
    getListingById(id)
      .then(setListing)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [params.id]);

  const handleContact = async () => {
    if (!user) { router.push('/login'); return; }
    if (!listing) return;
    setContacting(true);
    try {
      const { conversation } = await startConversation(
        listing.id,
        `Hi, I'm interested in your listing: ${listing.title}`,
      );
      router.push(`/messages/${conversation.id}`);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to start conversation');
    } finally {
      setContacting(false);
    }
  };

  if (loading) return <div className="loading">Loading...</div>;
  if (error) return <div className="page"><div className="form-error">{error}</div></div>;
  if (!listing) return <div className="page"><div className="empty">Listing not found</div></div>;

  const primaryImage = listing.images?.find((img) => img.isPrimary) || listing.images?.[0];
  const imageUrl = primaryImage
    ? `${process.env.NEXT_PUBLIC_API_URL?.replace('/api', '')}${primaryImage.url}`
    : null;

  const isOwnListing = user?.id === listing.user?.id;

  return (
    <div className="page">
      <button
        onClick={() => router.back()}
        className="btn btn-secondary"
        style={{ marginBottom: '1rem' }}
      >
        ← Back
      </button>

      <div className="listing-detail">
        <div>
          {imageUrl ? (
            <img src={imageUrl} alt={listing.title} className="listing-detail-img" />
          ) : (
            <div className="no-image">No image available</div>
          )}

          {listing.images && listing.images.length > 1 && (
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem', overflowX: 'auto' }}>
              {listing.images.map((img) => (
                <img
                  key={img.id}
                  src={`${process.env.NEXT_PUBLIC_API_URL?.replace('/api', '')}${img.url}`}
                  alt=""
                  style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 'var(--radius)', border: '1px solid var(--color-border)' }}
                />
              ))}
            </div>
          )}

          <div className="listing-description">
            <h3>Description</h3>
            <p>{listing.description}</p>
          </div>
        </div>

        <div className="listing-sidebar">
          <h2>{listing.title}</h2>
          <div className="price">
            {listing.currency} {Number(listing.price).toFixed(2)}
          </div>
          <div className="meta">Condition: {listing.condition}</div>
          <div className="meta">
            Location: {listing.locationCity}
            {listing.locationZip ? ` (${listing.locationZip})` : ''}
          </div>
          {listing.isNegotiable && (
            <div className="meta" style={{ color: 'var(--color-success)' }}>Price is negotiable</div>
          )}
          <div className="meta">
            Status: <span className={`badge badge-${listing.status}`}>{listing.status}</span>
          </div>
          {listing.category && (
            <div className="meta">Category: {listing.category.name}</div>
          )}
          <hr style={{ margin: '1rem 0', border: 'none', borderTop: '1px solid var(--color-border)' }} />
          <div className="meta">
            Seller: {listing.user?.displayName || listing.user?.username}
          </div>
          <div className="meta" style={{ fontSize: '0.75rem' }}>
            Posted {new Date(listing.createdAt).toLocaleDateString()}
          </div>

          {!isOwnListing && listing.status === 'active' && (
            <button
              onClick={handleContact}
              className="btn btn-primary"
              disabled={contacting}
              style={{ marginTop: '1.25rem' }}
            >
              {contacting ? 'Opening chat...' : '✉ Contact Seller'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
