'use client';

import { FormEvent, useEffect, useState } from 'react';
import { CircleAlert } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useErrorText } from '@/i18n/errors';
import { useFormat } from '@/i18n/use-format';
import { Category, getCategories } from '@/services/categories.service';
import { CreateListingData, Listing } from '@/services/listings.service';
import { canonicalCity, CONDITIONS, CURRENCIES, Currency } from '@/utils/format';
import { Button } from './ui/Button';
import { Field, Input, Select, Textarea } from './ui/Field';

interface Props {
  /** Existing listing when editing; omitted for a new one. */
  initial?: Listing;
  submitLabel: string;
  /** Throw to show the error above the form. */
  onSubmit: (data: CreateListingData) => Promise<void>;
}

export function ListingForm({ initial, submitLabel, onSubmit }: Props) {
  const t = useTranslations('form');
  const fmt = useFormat();
  const errorText = useErrorText();
  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState({
    title: initial?.title ?? '',
    description: initial?.description ?? '',
    categoryId: initial?.categoryId ?? '',
    price: initial ? String(Number(initial.price)) : '',
    currency: (initial?.currency ?? 'SYP') as Currency,
    condition: initial?.condition ?? 'used',
    // A known city is shown in the seller's language ("Damascus" ↔ "دمشق").
    locationCity: initial?.locationCity ? fmt.city(initial.locationCity) : '',
    isNegotiable: initial?.isNegotiable ?? true,
  });
  const [error, setError] = useState('');
  const [categoriesFailed, setCategoriesFailed] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    getCategories()
      .then(setCategories)
      .catch(() => setCategoriesFailed(true));
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
        locationCity: canonicalCity(form.locationCity) || (initial ? '' : undefined),
        isNegotiable: form.isNegotiable,
      });
    } catch (err) {
      setError(errorText(err, t('saveFailed')));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="form">
      {(error || categoriesFailed) && (
        <div className="notice notice--danger" role="alert">
          <CircleAlert aria-hidden="true" />
          <span className="notice__body">{error || t('categoriesFailed')}</span>
        </div>
      )}

      <Field
        label={t('title')}
        htmlFor="title"
        hint={t('titleHint')}
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

      <Field label={t('category')} htmlFor="categoryId">
        <Select id="categoryId" value={form.categoryId} onChange={set('categoryId')} required>
          <option value="">{t('chooseCategory')}</option>
          {categories.map((root) => (
            <optgroup key={root.id} label={fmt.category(root)}>
              {(root.children ?? []).map((child) => (
                <option key={child.id} value={child.id}>
                  {fmt.category(child)}
                </option>
              ))}
              <option value={root.id}>
                {root.children?.length
                  ? t('otherIn', { name: fmt.category(root) })
                  : fmt.category(root)}
              </option>
            </optgroup>
          ))}
        </Select>
      </Field>

      <div className="form-grid">
        <Field label={t('price')} htmlFor="price" hint={t('priceHint')}>
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
        <Field label={t('currency')} htmlFor="currency">
          <Select id="currency" value={form.currency} onChange={set('currency')}>
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {fmt.currencyName(c)}
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
        <span>{t('negotiable')}</span>
      </label>

      <div className="form-grid">
        <Field label={t('condition')} htmlFor="condition">
          <Select id="condition" value={form.condition} onChange={set('condition')}>
            {CONDITIONS.map((c) => (
              <option key={c} value={c}>
                {fmt.condition(c)}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t('city')} htmlFor="locationCity">
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
            {fmt.cities.map((city) => (
              <option key={city} value={city} />
            ))}
          </datalist>
        </Field>
      </div>

      <Field
        label={t('description')}
        htmlFor="description"
        hint={t('descriptionHint')}
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
