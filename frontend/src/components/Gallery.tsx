'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, ImageOff, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useFormat } from '@/i18n/use-format';
import { getImageUrl, ListingImage } from '@/services/listings.service';
import styles from './Gallery.module.css';

function isRtl(el: Element): boolean {
  return getComputedStyle(el).direction === 'rtl';
}

/** Index of the slide currently snapped into view (works in LTR and RTL). */
function currentIndex(scroller: HTMLElement): number {
  return Math.round(Math.abs(scroller.scrollLeft) / Math.max(scroller.clientWidth, 1));
}

function goTo(scroller: HTMLElement | null, index: number, smooth = true) {
  if (!scroller) return;
  const offset = index * scroller.clientWidth * (isRtl(scroller) ? -1 : 1);
  scroller.scrollTo({ left: offset, behavior: smooth ? 'smooth' : 'instant' });
}

interface Props {
  images: ListingImage[];
  title: string;
}

/**
 * Photo gallery: a native scroll-snap carousel (swipe on touch, arrows and
 * thumbnails otherwise) that opens a full-screen viewer. No JS animation,
 * so it stays smooth on slow phones.
 */
export function Gallery({ images, title }: Props) {
  const scroller = useRef<HTMLDivElement>(null);
  const viewer = useRef<HTMLDialogElement>(null);
  const viewerScroller = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);
  const count = images.length;
  const t = useTranslations('gallery');
  const fmt = useFormat();
  const counter = (at: number) =>
    t('counter', { index: fmt.number(at + 1), count: fmt.number(count) });

  const openViewer = (at: number) => {
    setViewerIndex(at);
    setViewerOpen(true);
  };

  useEffect(() => {
    const el = viewer.current;
    if (!el) return;
    if (viewerOpen && !el.open) {
      el.showModal();
      goTo(viewerScroller.current, viewerIndex, false);
    }
    if (!viewerOpen && el.open) el.close();
    // viewerIndex is only the starting slide; later changes come from scrolling
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewerOpen]);

  const closeViewer = useCallback(() => {
    // Leave the page gallery on the photo the viewer ended on.
    goTo(scroller.current, viewerIndex, false);
    setViewerOpen(false);
  }, [viewerIndex]);

  const onViewerKey = (e: React.KeyboardEvent) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    const el = viewerScroller.current;
    if (!el) return;
    const forward = (e.key === 'ArrowRight') !== isRtl(el);
    goTo(el, Math.min(count - 1, Math.max(0, viewerIndex + (forward ? 1 : -1))));
  };

  if (count === 0) {
    return (
      <div className={styles.empty}>
        <ImageOff aria-hidden="true" />
        <span>{t('empty')}</span>
      </div>
    );
  }

  const arrows = (
    target: React.RefObject<HTMLDivElement | null>,
    at: number,
    className: string,
  ) =>
    count > 1 && (
      <>
        <button
          type="button"
          className={`${className} ${styles.prev}`}
          aria-label={t('previous')}
          disabled={at === 0}
          onClick={() => goTo(target.current, at - 1)}
        >
          <ChevronLeft aria-hidden="true" className="icon-flip" />
        </button>
        <button
          type="button"
          className={`${className} ${styles.next}`}
          aria-label={t('next')}
          disabled={at === count - 1}
          onClick={() => goTo(target.current, at + 1)}
        >
          <ChevronRight aria-hidden="true" className="icon-flip" />
        </button>
      </>
    );

  return (
    <div className={styles.gallery}>
      <div className={styles.stage}>
        <div
          ref={scroller}
          className={styles.scroller}
          onScroll={(e) => setIndex(currentIndex(e.currentTarget))}
          role="group"
          aria-roledescription="carousel"
          aria-label={t('label', { title })}
        >
          {images.map((img, i) => (
            <button
              key={img.id}
              type="button"
              className={styles.slide}
              onClick={() => openViewer(i)}
              aria-label={t('open', { index: fmt.number(i + 1), count: fmt.number(count) })}
            >
              <img
                src={getImageUrl(img, 'medium')}
                srcSet={`${getImageUrl(img, 'medium')} 900w, ${getImageUrl(img, 'large')} 1600w`}
                sizes="(min-width: 1024px) 680px, 100vw"
                alt={t('alt', { title, index: fmt.number(i + 1) })}
                width={img.width ?? 4}
                height={img.height ?? 3}
                loading={i === 0 ? 'eager' : 'lazy'}
                fetchPriority={i === 0 ? 'high' : 'auto'}
                decoding="async"
              />
            </button>
          ))}
        </div>
        {arrows(scroller, index, styles.arrow)}
        {count > 1 && (
          <span className={styles.counter} aria-hidden="true">
            <bdi dir="ltr">{counter(index)}</bdi>
          </span>
        )}
      </div>

      {count > 1 && (
        <div className={styles.thumbs}>
          {images.map((img, i) => (
            <button
              key={img.id}
              type="button"
              className={styles.thumb}
              aria-label={t('show', { index: fmt.number(i + 1) })}
              aria-current={i === index ? 'true' : undefined}
              onClick={() => goTo(scroller.current, i)}
            >
              <img src={getImageUrl(img, 'thumb')} alt="" loading="lazy" decoding="async" />
            </button>
          ))}
        </div>
      )}

      {/* The dialog only reacts to arrow keys; every control inside is a button. */}
      <dialog
        ref={viewer}
        className={styles.viewer}
        aria-label={t('label', { title })}
        onClose={closeViewer}
        onCancel={(e) => {
          e.preventDefault();
          closeViewer();
        }}
        onKeyDown={onViewerKey}
      >
        {viewerOpen && (
          <>
            <div className={styles.viewerBar}>
              <span aria-live="polite">
                <bdi dir="ltr">{counter(viewerIndex)}</bdi>
              </span>
              <button
                type="button"
                className={styles.viewerClose}
                onClick={closeViewer}
                aria-label={t('close')}
              >
                <X aria-hidden="true" />
              </button>
            </div>
            <div
              ref={viewerScroller}
              className={styles.viewerScroller}
              onScroll={(e) => setViewerIndex(currentIndex(e.currentTarget))}
            >
              {images.map((img, i) => (
                <div key={img.id} className={styles.viewerSlide}>
                  <img
                    src={getImageUrl(img, 'large')}
                    alt={t('alt', { title, index: fmt.number(i + 1) })}
                    loading={Math.abs(i - viewerIndex) <= 1 ? 'eager' : 'lazy'}
                    decoding="async"
                  />
                </div>
              ))}
            </div>
            {arrows(viewerScroller, viewerIndex, styles.viewerArrow)}
          </>
        )}
      </dialog>
    </div>
  );
}
