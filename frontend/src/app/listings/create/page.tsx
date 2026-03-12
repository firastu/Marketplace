'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { createListing } from '@/services/listings.service';
import { getCategories, Category } from '@/services/categories.service';

export default function CreateListingPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
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

  useEffect(() => {
    getCategories().then(setCategories).catch(() => {});
  }, []);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [authLoading, user, router]);

  const update = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const flatCategories = (cats: Category[]): Category[] =>
    cats.flatMap((c) => [c, ...flatCategories(c.children || [])]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const listing = await createListing({
        ...form,
        price: parseFloat(form.price),
      });
      router.push(`/listings/${listing.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create listing');
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading) return <div className="loading">Loading...</div>;
  if (!user) return null;

  return (
    <div className="form-page" style={{ maxWidth: 560 }}>
      <h1>Create a Listing</h1>

      {error && <div className="form-error">{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="title">Title</label>
          <input id="title" value={form.title} onChange={update('title')} required minLength={5} maxLength={200} />
        </div>

        <div className="form-group">
          <label htmlFor="description">Description</label>
          <textarea id="description" value={form.description} onChange={update('description')} required minLength={10} rows={5} />
        </div>

        <div className="form-group">
          <label htmlFor="categoryId">Category</label>
          <select id="categoryId" value={form.categoryId} onChange={update('categoryId')} required>
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
            <input id="price" type="number" step="0.01" min="0" value={form.price} onChange={update('price')} required />
          </div>
          <div className="form-group">
            <label htmlFor="condition">Condition</label>
            <select id="condition" value={form.condition} onChange={update('condition')}>
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
            <input id="locationCity" value={form.locationCity} onChange={update('locationCity')} />
          </div>
          <div className="form-group">
            <label htmlFor="locationZip">ZIP Code</label>
            <input id="locationZip" value={form.locationZip} onChange={update('locationZip')} />
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
          <label htmlFor="isNegotiable" style={{ margin: 0 }}>Price is negotiable</label>
        </div>

        <button type="submit" className="btn btn-primary" disabled={submitting}>
          {submitting ? 'Creating...' : 'Create Listing'}
        </button>
      </form>
    </div>
  );
}
