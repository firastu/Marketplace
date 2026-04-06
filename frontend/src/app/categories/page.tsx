'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getCategories, Category } from '@/services/categories.service';

export default function CategoriesPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCategories()
      .then(setCategories)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div className="page">
      <h1 style={{ marginBottom: '1.5rem' }}>Browse by Category</h1>

      {categories.length === 0 && (
        <div className="empty">
          <p>No categories available.</p>
        </div>
      )}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
          gap: '1rem',
        }}
      >
        {categories.map((cat) => (
          <CategoryCard key={cat.id} category={cat} router={router} />
        ))}
      </div>
    </div>
  );
}

function CategoryCard({
  category,
  router,
}: {
  category: Category;
  router: ReturnType<typeof useRouter>;
}) {
  return (
    <>
      <button
        onClick={() => router.push(`/?categoryId=${category.id}`)}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          gap: '0.5rem',
          padding: '1rem',
          background: 'var(--color-white)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius)',
          cursor: 'pointer',
          textAlign: 'left',
          transition: 'border-color 0.15s',
        }}
        onMouseEnter={(e) =>
          ((e.currentTarget as HTMLElement).style.borderColor = 'var(--color-primary)')
        }
        onMouseLeave={(e) =>
          ((e.currentTarget as HTMLElement).style.borderColor = 'var(--color-border)')
        }
      >
        <div style={{ fontSize: '1.5rem' }}>{category.icon || '📁'}</div>
        <div style={{ fontWeight: 600, fontSize: '0.9375rem' }}>{category.name}</div>
        {category.description && (
          <div
            style={{
              fontSize: '0.8125rem',
              color: 'var(--color-text-light)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              maxWidth: '100%',
            }}
          >
            {category.description}
          </div>
        )}
        {category.children && category.children.length > 0 && (
          <div
            style={{
              fontSize: '0.75rem',
              color: 'var(--color-primary)',
              marginTop: '0.25rem',
            }}
          >
            {category.children.length} subcategor{category.children.length === 1 ? 'y' : 'ies'}
          </div>
        )}
      </button>

      {category.children && category.children.length > 0 && (
        <div
          style={{
            gridColumn: '1 / -1',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
            gap: '0.5rem',
            paddingLeft: '1rem',
          }}
        >
          {category.children.map((child) => (
            <button
              key={child.id}
              onClick={() => router.push(`/?categoryId=${child.id}`)}
              style={{
                padding: '0.5rem 0.75rem',
                background: 'transparent',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius)',
                cursor: 'pointer',
                textAlign: 'left',
                fontSize: '0.8125rem',
                color: 'var(--color-text)',
                transition: 'border-color 0.15s, background 0.15s',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-primary)';
                (e.currentTarget as HTMLElement).style.background = 'var(--color-bg)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-border)';
                (e.currentTarget as HTMLElement).style.background = 'transparent';
              }}
            >
              {child.icon && <span style={{ marginRight: '0.375rem' }}>{child.icon}</span>}
              {child.name}
            </button>
          ))}
        </div>
      )}
    </>
  );
}
