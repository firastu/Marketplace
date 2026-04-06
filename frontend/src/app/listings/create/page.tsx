'use client';

import { useState, useEffect, useRef, FormEvent, ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import {
  createListing,
  uploadImage,
  deleteImage,
  getImageUrl,
  ListingImage,
} from '@/services/listings.service';
import { getCategories, Category } from '@/services/categories.service';

const MAX_FILES = 15;
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

export default function CreateListingPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [step, setStep] = useState<'form' | 'images'>('form');
  const [listingId, setListingId] = useState<string | null>(null);
  const [images, setImages] = useState<ListingImage[]>([]);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState({
    categoryId: '',
    title: '',
    description: '',
    price: '',
    condition: 'used',
    locationCity: '',
    locationZip: '',
    isNegotiable: false,
  });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getCategories().then(setCategories).catch(() => {});
  }, []);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [authLoading, user, router]);

  const update = (field: string) => (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const flatCategories = (cats: Category[]): Category[] =>
    cats.flatMap((c) => [c, ...flatCategories(c.children || [])]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const listing = await createListing({ ...form, price: parseFloat(form.price) });
      setListingId(listing.id);
      setImages(listing.images || []);
      setStep('images');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create listing');
    } finally {
      setSubmitting(false);
    }
  };

  const handleFilesSelected = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const valid = files.filter(
      (f) => ACCEPTED_TYPES.includes(f.type) && f.size <= MAX_FILE_SIZE,
    );
    if (valid.length === 0) {
      setUploadError('Please select valid images (JPEG, PNG, WebP up to 10 MB each).');
      return;
    }
    const total = pendingFiles.length + images.length + valid.length;
    if (total > MAX_FILES) {
      setUploadError(`Maximum ${MAX_FILES} images allowed.`);
      return;
    }
    setUploadError('');
    setPendingFiles((prev) => [...prev, ...valid]);
  };

  const removePending = (index: number) => {
    setPendingFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUploadAll = async () => {
    if (!listingId || pendingFiles.length === 0) return;
    setUploadProgress(true);
    setUploadError('');
    try {
      const isFirst = images.length === 0;
      for (let i = 0; i < pendingFiles.length; i++) {
        const file = pendingFiles[i];
        const img = await uploadImage(listingId, file, isFirst && i === 0);
        setImages((prev) => [...prev, img]);
      }
      setPendingFiles([]);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploadProgress(false);
    }
  };

  const handleDeleteImage = async (imageId: string) => {
    if (!listingId) return;
    try {
      await deleteImage(listingId, imageId);
      setImages((prev) => prev.filter((i) => i.id !== imageId));
    } catch {
      // silent
    }
  };

  if (authLoading) return <div className="loading">Loading...</div>;
  if (!user) return null;

  if (step === 'images' && listingId) {
    return (
      <div className="form-page" style={{ maxWidth: 640 }}>
        <h1 style={{ marginBottom: '0.5rem' }}>Add Photos</h1>
        <p style={{ color: 'var(--color-text-light)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
          Add up to {MAX_FILES} photos. The first photo will be the cover.
        </p>

        {uploadError && <div className="form-error" style={{ marginBottom: '1rem' }}>{uploadError}</div>}

        <div
          onClick={() => fileInputRef.current?.click()}
          style={{
            border: '2px dashed var(--color-border)',
            borderRadius: 'var(--radius)',
            padding: '2rem',
            textAlign: 'center',
            cursor: 'pointer',
            marginBottom: '1rem',
            transition: 'border-color 0.15s',
          }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.borderColor = 'var(--color-primary)')}
          onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.borderColor = 'var(--color-border)')}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED_TYPES.join(',')}
            multiple
            onChange={handleFilesSelected}
            style={{ display: 'none' }}
          />
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📷</div>
          <div style={{ fontWeight: 600 }}>Click to select photos</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--color-text-light)', marginTop: '0.25rem' }}>
            JPEG, PNG, WebP · max 10 MB each
          </div>
        </div>

        {pendingFiles.length > 0 && (
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
            {pendingFiles.map((file, i) => (
              <div key={i} style={{ position: 'relative' }}>
                <img
                  src={URL.createObjectURL(file)}
                  alt=""
                  style={{
                    width: 80,
                    height: 80,
                    objectFit: 'cover',
                    borderRadius: 'var(--radius)',
                    border: '1px solid var(--color-border)',
                    opacity: 0.7,
                  }}
                />
                <button
                  onClick={() => removePending(i)}
                  style={{
                    position: 'absolute',
                    top: -6,
                    right: -6,
                    background: '#e53e3e',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '50%',
                    width: 18,
                    height: 18,
                    fontSize: '0.6rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        {images.length > 0 && (
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
            {images.map((img) => (
              <div key={img.id} style={{ position: 'relative' }}>
                <img
                  src={getImageUrl(img, 'thumb')}
                  alt=""
                  style={{
                    width: 80,
                    height: 80,
                    objectFit: 'cover',
                    borderRadius: 'var(--radius)',
                    border: img.isPrimary
                      ? '2px solid var(--color-primary)'
                      : '1px solid var(--color-border)',
                  }}
                />
                <span
                  style={{
                    position: 'absolute',
                    bottom: 2,
                    left: 2,
                    background: img.isPrimary ? 'var(--color-primary)' : 'rgba(0,0,0,0.5)',
                    color: '#fff',
                    fontSize: '0.55rem',
                    padding: '1px 4px',
                    borderRadius: 3,
                  }}
                >
                  {img.isPrimary ? 'Cover' : img.sortOrder + 1}
                </span>
                <button
                  onClick={() => handleDeleteImage(img.id)}
                  style={{
                    position: 'absolute',
                    top: -6,
                    right: -6,
                    background: '#e53e3e',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '50%',
                    width: 18,
                    height: 18,
                    fontSize: '0.6rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            onClick={handleUploadAll}
            className="btn btn-primary"
            disabled={uploadProgress || pendingFiles.length === 0}
            style={{ width: 'auto' }}
          >
            {uploadProgress
              ? `Uploading...`
              : pendingFiles.length > 0
                ? `Upload ${pendingFiles.length} photo${pendingFiles.length > 1 ? 's' : ''}`
                : 'Upload photos'}
          </button>
          <button
            onClick={() => router.push(`/listings/${listingId}`)}
            className="btn btn-secondary"
            style={{ width: 'auto' }}
          >
            {images.length === 0 ? 'Skip — publish listing' : 'Done — view listing'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="form-page" style={{ maxWidth: 560 }}>
      <h1>Create a Listing</h1>

      {error && <div className="form-error">{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="title">Title</label>
          <input
            id="title"
            value={form.title}
            onChange={update('title')}
            required
            minLength={5}
            maxLength={200}
          />
        </div>

        <div className="form-group">
          <label htmlFor="description">Description</label>
          <textarea
            id="description"
            value={form.description}
            onChange={update('description')}
            required
            minLength={10}
            rows={5}
          />
        </div>

        <div className="form-group">
          <label htmlFor="categoryId">Category</label>
          <select
            id="categoryId"
            value={form.categoryId}
            onChange={update('categoryId')}
            required
          >
            <option value="">Select a category</option>
            {flatCategories(categories).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div className="form-group">
            <label htmlFor="price">Price (EUR)</label>
            <input
              id="price"
              type="number"
              step="0.01"
              min="0"
              value={form.price}
              onChange={update('price')}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="condition">Condition</label>
            <select
              id="condition"
              value={form.condition}
              onChange={update('condition')}
            >
              <option value="new">New</option>
              <option value="like_new">Like New</option>
              <option value="used">Used</option>
              <option value="fair">Fair</option>
              <option value="poor">Poor</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div className="form-group">
            <label htmlFor="locationCity">City</label>
            <input
              id="locationCity"
              value={form.locationCity}
              onChange={update('locationCity')}
            />
          </div>
          <div className="form-group">
            <label htmlFor="locationZip">ZIP Code</label>
            <input
              id="locationZip"
              value={form.locationZip}
              onChange={update('locationZip')}
            />
          </div>
        </div>

        <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <input
            id="isNegotiable"
            type="checkbox"
            checked={form.isNegotiable}
            onChange={(e) => setForm((prev) => ({ ...prev, isNegotiable: e.target.checked }))}
            style={{ width: 'auto' }}
          />
          <label htmlFor="isNegotiable" style={{ margin: 0 }}>
            Price is negotiable
          </label>
        </div>

        <button type="submit" className="btn btn-primary" disabled={submitting}>
          {submitting ? 'Creating...' : 'Next — add photos'}
        </button>
      </form>
    </div>
  );
}
