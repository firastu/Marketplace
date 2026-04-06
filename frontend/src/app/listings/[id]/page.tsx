'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import {
  getListingById,
  Listing,
  ListingImage,
  getImageUrl,
  getPrimaryImage,
} from '@/services';
import { startConversation } from '@/services/messages.service';

export default function ListingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [contacting, setContacting] = useState(false);
  const [activeImage, setActiveImage] = useState<ListingImage | null>(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxZoom, setLightboxZoom] = useState(1);
  const lightboxImgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const id = params.id as string;
    if (!id) return;
    getListingById(id)
      .then((listing) => {
        setListing(listing);
        setActiveImage(null);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [params.id]);

  const closeLightbox = useCallback(() => {
    setLightboxOpen(false);
    setLightboxZoom(1);
  }, []);

  const openLightbox = useCallback((img: ListingImage) => {
    setActiveImage(img);
    setLightboxZoom(1);
    setLightboxOpen(true);
  }, []);

  useEffect(() => {
    if (!lightboxOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeLightbox();
      if (e.key === '+' || e.key === '=') setLightboxZoom((z) => Math.min(z + 0.5, 4));
      if (e.key === '-') setLightboxZoom((z) => Math.max(z - 0.5, 0.5));
      if (e.key === '0') setLightboxZoom(1);
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [lightboxOpen, closeLightbox]);

  const handleLightboxWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    setLightboxZoom((z) => Math.max(0.5, Math.min(4, z - e.deltaY * 0.002)));
  }, []);

  const handleLightboxDrag = useCallback((e: React.MouseEvent) => {
    if (lightboxZoom <= 1) return;
    const img = lightboxImgRef.current;
    if (!img) return;
    const startX = e.clientX - img.offsetLeft;
    const startY = e.clientY - img.offsetTop;

    const onMove = (me: MouseEvent) => {
      img.style.left = `${me.clientX - startX}px`;
      img.style.top = `${me.clientY - startY}px`;
    };
    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, [lightboxZoom]);

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

  const visibleImages = listing.images?.filter((img) => !img.deletedAt) ?? [];
  const primaryImage = activeImage ?? getPrimaryImage(visibleImages);
  const mainImageUrl = primaryImage ? getImageUrl(primaryImage, 'large') : null;

  const isOwnListing = user?.id === listing.user?.id;

  return (
    <>
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
            {mainImageUrl ? (
              <div
                style={{ position: 'relative', cursor: 'zoom-in' }}
                onClick={() => primaryImage && openLightbox(primaryImage)}
              >
                <img
                  src={mainImageUrl}
                  alt={listing.title}
                  className="listing-detail-img"
                />
                <div style={{
                  position: 'absolute',
                  bottom: 8,
                  right: 8,
                  background: 'rgba(0,0,0,0.5)',
                  color: '#fff',
                  padding: '4px 8px',
                  borderRadius: 4,
                  fontSize: '0.75rem',
                }}>
                  🔍 Click to zoom
                </div>
              </div>
            ) : (
              <div className="no-image">No image available</div>
            )}

            {visibleImages.length > 1 && (
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem', overflowX: 'auto', paddingBottom: '0.25rem' }}>
                {visibleImages.map((img) => {
                  const thumb = getImageUrl(img, 'thumb');
                  const isActive = primaryImage?.id === img.id;
                  return (
                    <img
                      key={img.id}
                      src={thumb}
                      alt=""
                      onClick={() => setActiveImage(img)}
                      loading="lazy"
                      style={{
                        width: 72,
                        height: 72,
                        objectFit: 'cover',
                        borderRadius: 'var(--radius)',
                        border: isActive
                          ? '2px solid var(--color-primary)'
                          : '1px solid var(--color-border)',
                        cursor: 'pointer',
                        flexShrink: 0,
                        opacity: isActive ? 1 : 0.7,
                        transition: 'opacity 0.15s',
                      }}
                    />
                  );
                })}
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

      {lightboxOpen && primaryImage && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.92)',
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            userSelect: 'none',
          }}
          onClick={closeLightbox}
        >
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '0.75rem 1rem',
            color: '#fff',
          }}>
            <span style={{ fontSize: '0.875rem', opacity: 0.7 }}>
              {visibleImages.indexOf(primaryImage) + 1} / {visibleImages.length} — Scroll to zoom · Drag to pan
            </span>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {visibleImages.length > 1 && (
                <>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const idx = visibleImages.indexOf(primaryImage);
                      const prev = visibleImages[(idx - 1 + visibleImages.length) % visibleImages.length];
                      setActiveImage(prev);
                    }}
                    style={zoomBtnStyle}
                  >
                    ←
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const idx = visibleImages.indexOf(primaryImage);
                      const next = visibleImages[(idx + 1) % visibleImages.length];
                      setActiveImage(next);
                    }}
                    style={zoomBtnStyle}
                  >
                    →
                  </button>
                </>
              )}
              <button onClick={(e) => { e.stopPropagation(); setLightboxZoom((z) => Math.max(z - 0.5, 0.5)); }} style={zoomBtnStyle}>−</button>
              <button onClick={(e) => { e.stopPropagation(); setLightboxZoom(1); }} style={zoomBtnStyle}>1:1</button>
              <button onClick={(e) => { e.stopPropagation(); setLightboxZoom((z) => Math.min(z + 0.5, 4)); }} style={zoomBtnStyle}>+</button>
              <button onClick={(e) => { e.stopPropagation(); closeLightbox(); }} style={{ ...zoomBtnStyle, background: '#e53e3e' }}>✕</button>
            </div>
          </div>

          <div
            style={{
              flex: 1,
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: lightboxZoom > 1 ? 'grab' : 'default',
            }}
            onClick={(e) => e.stopPropagation()}
            onWheel={handleLightboxWheel}
          >
            <img
              ref={lightboxImgRef}
              src={getImageUrl(primaryImage, 'original')}
              alt={listing.title}
              onMouseDown={lightboxZoom > 1 ? handleLightboxDrag : undefined}
              style={{
                maxWidth: '90vw',
                maxHeight: 'calc(100vh - 120px)',
                transform: `scale(${lightboxZoom})`,
                transition: 'transform 0.1s ease',
                transformOrigin: 'center center',
                position: 'relative',
                pointerEvents: 'auto',
              }}
              draggable={false}
            />
          </div>
        </div>
      )}
    </>
  );
}

const zoomBtnStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.15)',
  border: '1px solid rgba(255,255,255,0.3)',
  color: '#fff',
  borderRadius: 6,
  padding: '4px 12px',
  cursor: 'pointer',
  fontSize: '1rem',
  lineHeight: 1,
};
