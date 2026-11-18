'use client';

import { FormEvent, useEffect, useState } from 'react';
import { CircleAlert } from 'lucide-react';
import { Category, getCategories } from '@/services/categories.service';
import { CreateListingData, Listing } from '@/services/listings.service';
import { CITIES, CONDITIONS, CURRENCIES, Currency } from '@/utils/format';
import { Button } from './ui/Button';
import { errorText } from './ui/Feedback';
import { Field, Input, Select, Textarea } from './ui/Field';

interface Props {
  /** Existing listing when editing; omitted for a new one. */
  initial?: Listing;
  submitLabel: string;
  /** Throw to show the error above the form. */
  onSubmit: (data: CreateListingData) => Promise<void>;
}

export function ListingForm({ initial, submitLabel, onSubmit }: Props) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState({
    title: initial?.title ?? '',
    description: initial?.description ?? '',
    categoryId: initial?.categoryId ?? '',
    price: initial ? String(Number(initial.price)) : '',
    currency: (initial?.currency ?? 'SYP') as Currency,
    condition: initial?.condition ?? 'used',
    locationCity: initial?.locationCity ?? '',
    isNegotiable: initial?.isNegotiable ?? true,
  });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    getCategories()
      .then(setCategories)
      .catch(() => setError('Could not load the categories. Check your connection.'));
  }, []);

  const set =
    (field: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await onSubmit({
        title: form.title.trim(),
        description: form.description.trim(),
        categoryId: form.categoryId,
        price: Number(form.price),
        currency: form.currency,
        condition: form.condition,
        // An empty string clears the city when editing.
        locationCity: form.locationCity.trim() || (initial ? '' : undefined),
        isNegotiable: form.isNegotiable,
      });
    } catch (err) {
      setError(errorText(err, 'Could not save the listing'));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="form">
      {error && (
        <div className="notice notice--danger" role="alert">
          <CircleAlert aria-hidden="true" />
          <span className="notice__body">{error}</span>
        </div>
      )}

      <Field
        label="Title"
        htmlFor="title"
        hint="What is it? Brand, model, size. Arabic or English."
      >
        <Input
          id="title"
          value={form.title}
          onChange={set('title')}
          minLength={5}
          maxLength={200}
          dir="auto"
          required
        />
      </Field>

      <Field label="Category" htmlFor="categoryId">
        <Select id="categoryId" value={form.categoryId} onChange={set('categoryId')} required>
          <option value="">Choose a category</option>
          {categories.map((root) => (
            <optgroup key={root.id} label={root.name}>
              {(root.children ?? []).map((child) => (
                <option key={child.id} value={child.id}>
                  {child.name}
                </option>
              ))}
              <option value={root.id}>
                {root.children?.length ? `Other ${root.name}` : root.name}
              </option>
            </optgroup>
          ))}
        </Select>
      </Field>

      <div className="form-grid">
        <Field label="Price" htmlFor="price" hint="Enter 0 to give it away for free">
          <Input
            id="price"
            type="number"
            inputMode="decimal"
            step={form.currency === 'SYP' ? '1' : '0.01'}
            min="0"
            max="9999999999"
            value={form.price}
            onChange={set('price')}
            required
          />
        </Field>
        <Field label="Currency" htmlFor="currency">
          <Select id="currency" value={form.currency} onChange={set('currency')}>
            {CURRENCIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <label className="check" htmlFor="isNegotiable">
        <input
          id="isNegotiable"
          type="checkbox"
          checked={form.isNegotiable}
          onChange={(e) => setForm((prev) => ({ ...prev, isNegotiable: e.target.checked }))}
        />
        <span>Price is negotiable</span>
      </label>

      <div className="form-grid">
        <Field label="Condition" htmlFor="condition">
          <Select id="condition" value={form.condition} onChange={set('condition')}>
            {CONDITIONS.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="City" htmlFor="locationCity">
          <Input
            id="locationCity"
            list="listing-cities"
            value={form.locationCity}
            onChange={set('locationCity')}
            maxLength={100}
            autoComplete="address-level2"
            dir="auto"
          />
          <datalist id="listing-cities">
            {CITIES.map((city) => (
              <option key={city} value={city} />
            ))}
          </datalist>
        </Field>
      </div>

      <Field
        label="Description"
        htmlFor="description"
        hint="Age, defects, what is included, where to pick it up."
      >
        <Textarea
          id="description"
          value={form.description}
          onChange={set('description')}
          minLength={10}
          maxLength={10000}
          rows={6}
          dir="auto"
          required
        />
      </Field>

      <Button type="submit" variant="accent" size="lg" block loading={submitting}>
        {submitLabel}
      </Button>
    </form>
  );
}
