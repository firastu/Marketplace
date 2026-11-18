'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  Search,
  SearchX,
  SlidersHorizontal,
  WifiOff,
  X,
} from 'lucide-react';
import { getListings, ListingSearchParams, PaginatedListings } from '@/services';
import { Category, getCategories } from '@/services/categories.service';
import { canonicalCity, CONDITIONS, CURRENCIES, Currency, SORT_OPTIONS } from '@/utils/format';
import { useErrorText } from '@/i18n/errors';
import { Link, useRouter } from '@/i18n/navigation';
import { useFormat } from '@/i18n/use-format';
import { CategoryIcon } from '@/components/CategoryIcon';
import { ListingCard, ListingGrid, ListingGridSkeleton } from '@/components/ListingCard';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { Field, Input, Select } from '@/components/ui/Field';
import styles from './page.module.css';

const FILTER_KEYS = [
  'q',
  'categoryId',
  'minPrice',
  'maxPrice',
  'condition',
  'currency',
  'locationCity',
  'sortBy',
] as const;
type FilterKey = (typeof FILTER_KEYS)[number];
type Filters = Record<FilterKey, string>;
type DraftKey = 'minPrice' | 'maxPrice' | 'locationCity';

type Result =
  | { key: string; data: PaginatedListings; error?: undefined }
  | { key: string; data?: undefined; error: unknown };

interface FilterFieldsProps {
  idPrefix: string;
  filters: Filters;
  categories: Category[];
  drafts: Record<DraftKey, string>;
  setDraft: (key: DraftKey, value: string) => void;
  commitDraft: (key: DraftKey) => void;
  onChange: (changed: Partial<Filters>) => void;
}

/** The filter controls, shown in the desktop sidebar and the phone sheet. */
function FilterFields({
  idPrefix,
  filters,
  categories,
  drafts,
  setDraft,
  commitDraft,
  onChange,
}: FilterFieldsProps) {
  const t = useTranslations('home.field');
  const fmt = useFormat();
  const id = (name: string) => `${idPrefix}-${name}`;
  const draftProps = (key: DraftKey) => ({
    value: drafts[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => setDraft(key, e.target.value),
    onBlur: () => commitDraft(key),
    onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') commitDraft(key);
    },
  });

  return (
    <div className={styles.filterFields}>
      <Field label={t('category')} htmlFor={id('category')}>
        <Select
          id={id('category')}
          value={filters.categoryId}
          onChange={(e) => onChange({ categoryId: e.target.value })}
        >
          <option value="">{t('allCategories')}</option>
          {categories.map((root) => (
            <optgroup key={root.id} label={fmt.category(root)}>
              <option value={root.id}>{t('allIn', { name: fmt.category(root) })}</option>
              {(root.children ?? []).map((child) => (
                <option key={child.id} value={child.id}>
                  {fmt.category(child)}
                </option>
              ))}
            </optgroup>
          ))}
        </Select>
      </Field>

      <Field label={t('city')} htmlFor={id('city')}>
        <Input
          id={id('city')}
          list={id('cities')}
          placeholder={t('cityPlaceholder')}
          maxLength={100}
          autoComplete="off"
          dir="auto"
          {...draftProps('locationCity')}
        />
        <datalist id={id('cities')}>
          {fmt.cities.map((city) => (
            <option key={city} value={city} />
          ))}
        </datalist>
      </Field>

      <div className={styles.priceRow}>
        <Field label={t('minPrice')} htmlFor={id('min')}>
          <Input
            id={id('min')}
            type="number"
            inputMode="decimal"
            min="0"
            placeholder="0"
            {...draftProps('minPrice')}
          />
        </Field>
        <Field label={t('maxPrice')} htmlFor={id('max')}>
          <Input
            id={id('max')}
            type="number"
            inputMode="decimal"
            min="0"
            placeholder={t('any')}
            {...draftProps('maxPrice')}
          />
        </Field>
      </div>

      <Field label={t('currency')} htmlFor={id('currency')}>
        <Select
          id={id('currency')}
          value={filters.currency}
          onChange={(e) => onChange({ currency: e.target.value })}
        >
          <option value="">{t('anyCurrency')}</option>
          {CURRENCIES.map((c) => (
            <option key={c} value={c}>
              {fmt.currencyName(c)}
            </option>
          ))}
        </Select>
      </Field>

      <Field label={t('condition')} htmlFor={id('condition')}>
        <Select
          id={id('condition')}
          value={filters.condition}
          onChange={(e) => onChange({ condition: e.target.value })}
        >
          <option value="">{t('anyCondition')}</option>
          {CONDITIONS.map((c) => (
            <option key={c} value={c}>
              {fmt.condition(c)}
            </option>
          ))}
        </Select>
      </Field>
    </div>
  );
}

function HomePageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const t = useTranslations('home');
  const tc = useTranslations('common');
  const tm = useTranslations('meta');
  const fmt = useFormat();
  const errorText = useErrorText();

  // The URL is the single source of truth for what is shown: Back/Forward,
  // shared links and the category pages all just change the query string.
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

  const [result, setResult] = useState<Result | null>(null);
  const [retry, setRetry] = useState(0);
  const [categories, setCategories] = useState<Category[]>([]);
  const [sheetOpen, setSheetOpen] = useState(false);

  // Text inputs are drafts: applied on submit / blur / Enter, not on every
  // keystroke, and reset whenever the URL changes.
  const [search, setSearch] = useState(filters.q);
  // A known city is shown in the reader's language; the URL keeps one spelling.
  const [drafts, setDrafts] = useState<Record<DraftKey, string>>({
    minPrice: filters.minPrice,
    maxPrice: filters.maxPrice,
    locationCity: fmt.city(filters.locationCity),
  });
  const [syncedKey, setSyncedKey] = useState(urlKey);
  if (syncedKey !== urlKey) {
    setSyncedKey(urlKey);
    setSearch(filters.q);
    setDrafts({
      minPrice: filters.minPrice,
      maxPrice: filters.maxPrice,
      locationCity: fmt.city(filters.locationCity),
    });
  }

  useEffect(() => {
    getCategories()
      .then(setCategories)
      .catch(() => {});
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
      locationCity: filters.locationCity || undefined,
      currency: (filters.currency || undefined) as Currency | undefined,
      sortBy: filters.sortBy as ListingSearchParams['sortBy'],
    };
    getListings(params)
      .then((data) => {
        if (!cancelled) setResult({ key: requestKey, data });
      })
      .catch((err) => {
        if (cancelled) return;
        setResult({ key: requestKey, error: err });
      });
    return () => {
      cancelled = true;
    };
  }, [filters, page, requestKey]);

  const loading = result?.key !== requestKey;
  const data = !loading && result?.data ? result.data : null;
  const loadError = !loading && result?.error ? errorText(result.error) : '';

  const buildUrl = useCallback(
    (overrides: Record<string, string | number | undefined>) => {
      const params = new URLSearchParams();
      const values: Record<string, string | number | undefined> = {
        ...filters,
        // drafts the user typed but has not applied yet
        q: search.trim(),
        minPrice: drafts.minPrice,
        maxPrice: drafts.maxPrice,
        locationCity: canonicalCity(drafts.locationCity),
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
    [filters, search, drafts, page],
  );

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    router.push(buildUrl({ page: 1 }));
  };
  const changeFilters = (changed: Partial<Filters>) => {
    router.push(buildUrl({ ...changed, page: 1 }), { scroll: false });
  };
  const setDraft = (key: DraftKey, value: string) =>
    setDrafts((prev) => ({ ...prev, [key]: value }));
  const commitDraft = (key: DraftKey) => {
    const value = key === 'locationCity' ? canonicalCity(drafts[key]) : drafts[key].trim();
    if (value !== filters[key]) changeFilters({ [key]: value });
  };
  const clearFilters = () => router.push('/');

  // ── Derived display data ──────────────────────────────
  const categoryById = useMemo(() => {
    const map = new Map<string, { category: Category; rootId: string }>();
    for (const root of categories) {
      map.set(root.id, { category: root, rootId: root.id });
      for (const child of root.children ?? []) {
        map.set(child.id, { category: child, rootId: root.id });
      }
    }
    return map;
  }, [categories]);
  const activeRootId = categoryById.get(filters.categoryId)?.rootId ?? '';

  const activeCategory = categoryById.get(filters.categoryId)?.category;
  const chips: { key: string; label: string; clear: Partial<Filters> }[] = [];
  if (filters.q) {
    chips.push({ key: 'q', label: t('chip.quoted', { q: filters.q }), clear: { q: '' } });
  }
  if (filters.categoryId) {
    chips.push({
      key: 'category',
      label: activeCategory ? fmt.category(activeCategory) : t('field.category'),
      clear: { categoryId: '' },
    });
  }
  if (filters.locationCity) {
    chips.push({
      key: 'city',
      label: fmt.city(filters.locationCity),
      clear: { locationCity: '' },
    });
  }
  if (filters.minPrice || filters.maxPrice) {
    const unit = filters.currency ? ` ${fmt.currencyUnit(filters.currency)}` : '';
    const amount = (value: string) =>
      Number.isFinite(Number(value)) ? fmt.number(Number(value)) : value;
    const min = amount(filters.minPrice);
    const max = amount(filters.maxPrice);
    const label =
      filters.minPrice && filters.maxPrice
        ? t('chip.priceRange', { min, max, unit })
        : filters.minPrice
          ? t('chip.priceFrom', { min, unit })
          : t('chip.priceUpTo', { max, unit });
    chips.push({ key: 'price', label, clear: { minPrice: '', maxPrice: '' } });
  }
  if (filters.currency) {
    chips.push({
      key: 'currency',
      label: fmt.currencyUnit(filters.currency),
      clear: { currency: '' },
    });
  }
  if (filters.condition) {
    chips.push({
      key: 'condition',
      label: fmt.condition(filters.condition),
      clear: { condition: '' },
    });
  }
  // The search box has its own clear control; count the sheet's filters only.
  const sheetFilterCount = chips.filter((c) => c.key !== 'q').length;
  const isLanding = chips.length === 0 && page === 1;

  const fieldProps = {
    filters,
    categories,
    drafts,
    setDraft,
    commitDraft,
    onChange: changeFilters,
  };
  const total = data?.meta.total ?? 0;
  const totalPages = data?.meta.totalPages ?? 1;

  return (
    <div className="container page">
      <section className={isLanding ? styles.hero : styles.heroCompact}>
        {isLanding ? (
          <>
            <h1 className={styles.headline}>{tm('tagline')}</h1>
            <p className={styles.sub}>{t('sub')}</p>
          </>
        ) : (
          <h1 className="visually-hidden">{t('resultsHeading')}</h1>
        )}

        <form onSubmit={handleSearch} className={styles.search} role="search">
          <Search aria-hidden="true" className={styles.searchIcon} />
          <input
            className={styles.searchInput}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('searchPlaceholder')}
            aria-label={t('searchLabel')}
            maxLength={200}
            enterKeyHint="search"
            dir="auto"
          />
          {search && (
            <button
              type="button"
              className={styles.searchClear}
              aria-label={t('clearSearch')}
              onClick={() => {
                setSearch('');
                if (filters.q) changeFilters({ q: '' });
              }}
            >
              <X aria-hidden="true" />
            </button>
          )}
          <Button type="submit" variant="primary" className={styles.searchButton}>
            {t('search')}
          </Button>
        </form>
      </section>

      <nav className={styles.rail} aria-label={t('railLabel')}>
        <Link
          href={buildUrl({ categoryId: '', page: 1 })}
          scroll={false}
          className={`chip ${!filters.categoryId ? 'chip--active' : ''}`}
          aria-current={!filters.categoryId ? 'true' : undefined}
        >
          <LayoutGrid aria-hidden="true" />
          {t('all')}
        </Link>
        {categories.map((cat) => (
          <Link
            key={cat.id}
            href={buildUrl({ categoryId: cat.id, page: 1 })}
            scroll={false}
            className={`chip ${activeRootId === cat.id ? 'chip--active' : ''}`}
            aria-current={activeRootId === cat.id ? 'true' : undefined}
          >
            <CategoryIcon icon={cat.icon} />
            {fmt.category(cat)}
          </Link>
        ))}
        {categories.length === 0 &&
          Array.from({ length: 6 }, (_, i) => (
            <span key={i} className={`skeleton ${styles.railSkeleton}`} />
          ))}
      </nav>

      <div className={styles.layout}>
        <aside className={styles.sidebar} aria-label={t('filters')}>
          <h2 className={styles.sidebarTitle}>{t('filters')}</h2>
          <FilterFields idPrefix="side" {...fieldProps} />
          {chips.length > 0 && (
            <Button size="sm" variant="ghost" block onClick={clearFilters}>
              {t('clearAllFilters')}
            </Button>
          )}
        </aside>

        <section className={styles.results} aria-label={t('listingsLabel')}>
          <div className={styles.toolbar}>
            <p className={styles.count} aria-live="polite">
              {loading ? (
                <span className={`skeleton ${styles.countSkeleton}`} />
              ) : loadError ? null : (
                t.rich('count', {
                  count: total,
                  n: fmt.number(total),
                  b: (chunks) => <strong>{chunks}</strong>,
                })
              )}
            </p>
            <div className={styles.toolbarActions}>
              <Button
                size="sm"
                className={styles.filterButton}
                onClick={() => setSheetOpen(true)}
              >
                <SlidersHorizontal aria-hidden="true" />
                {t('filters')}
                {sheetFilterCount > 0 && (
                  <span className="count-dot">{fmt.number(sheetFilterCount)}</span>
                )}
              </Button>
              <Field label={t('sortBy')} htmlFor="sort" hideLabel className={styles.sort}>
                <Select
                  id="sort"
                  value={filters.sortBy}
                  onChange={(e) => changeFilters({ sortBy: e.target.value })}
                >
                  {SORT_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {fmt.sort(s)}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
          </div>

          {chips.length > 0 && (
            <ul className={styles.chips} aria-label={t('activeFilters')}>
              {chips.map((chip) => (
                <li key={chip.key}>
                  <button
                    type="button"
                    className="chip chip--soft"
                    onClick={() => changeFilters(chip.clear)}
                  >
                    <span dir="auto">{chip.label}</span>
                    <X aria-hidden="true" />
                    <span className="visually-hidden">{t('removeFilter')}</span>
                  </button>
                </li>
              ))}
              <li>
                <button type="button" className={`link ${styles.clearAll}`} onClick={clearFilters}>
                  {t('clearAll')}
                </button>
              </li>
            </ul>
          )}

          {loading && <ListingGridSkeleton />}

          {loadError && (
            <EmptyState
              icon={WifiOff}
              title={t('loadErrorTitle')}
              actions={
                <Button variant="primary" onClick={() => setRetry((n) => n + 1)}>
                  {tc('tryAgain')}
                </Button>
              }
            >
              {loadError}
            </EmptyState>
          )}

          {!loading && !loadError && total === 0 && (
            <EmptyState
              icon={SearchX}
              title={t('emptyTitle')}
              actions={
                chips.length > 0 ? (
                  <Button variant="primary" onClick={clearFilters}>
                    {t('clearFilters')}
                  </Button>
                ) : (
                  <Link href="/listings/create" className="btn btn--accent">
                    {t('postFirst')}
                  </Link>
                )
              }
            >
              {chips.length > 0 ? t('emptyFiltered') : t('emptyNone')}
            </EmptyState>
          )}

          {data && data.data.length > 0 && (
            <>
              <ListingGrid>
                {data.data.map((listing, i) => (
                  <ListingCard key={listing.id} listing={listing} priority={i < 4} />
                ))}
              </ListingGrid>

              {totalPages > 1 && (
                <nav className={styles.pagination} aria-label={t('pages')}>
                  {page > 1 ? (
                    <Link href={buildUrl({ page: page - 1 })} className="btn" rel="prev">
                      <ChevronLeft aria-hidden="true" className="icon-flip" />
                      {t('previous')}
                    </Link>
                  ) : (
                    <span className="btn" aria-disabled="true">
                      <ChevronLeft aria-hidden="true" className="icon-flip" />
                      {t('previous')}
                    </span>
                  )}
                  <span className={styles.pageInfo}>
                    {t.rich('pageOf', {
                      page: fmt.number(data.meta.page),
                      total: fmt.number(totalPages),
                      b: (chunks) => <strong>{chunks}</strong>,
                    })}
                  </span>
                  {page < totalPages ? (
                    <Link href={buildUrl({ page: page + 1 })} className="btn" rel="next">
                      {t('next')}
                      <ChevronRight aria-hidden="true" className="icon-flip" />
                    </Link>
                  ) : (
                    <span className="btn" aria-disabled="true">
                      {t('next')}
                      <ChevronRight aria-hidden="true" className="icon-flip" />
                    </span>
                  )}
                </nav>
              )}
            </>
          )}
        </section>
      </div>

      <Dialog
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title={t('filters')}
        variant="sheet"
        footer={
          <>
            <Button onClick={clearFilters} disabled={chips.length === 0}>
              {t('clearAll')}
            </Button>
            <Button variant="primary" onClick={() => setSheetOpen(false)}>
              {loading
                ? t('showResults')
                : t('showCount', { count: total, n: fmt.number(total) })}
            </Button>
          </>
        }
      >
        <FilterFields idPrefix="sheet" {...fieldProps} />
      </Dialog>
    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense
      fallback={
        <div className="container page">
          <ListingGridSkeleton />
        </div>
      }
    >
      <HomePageInner />
    </Suspense>
  );
}
