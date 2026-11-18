'use client';

import { ChangeEvent, useCallback, useEffect, useRef, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  ImagePlus,
  RefreshCw,
  Star,
  Trash2,
  X,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useErrorText } from '@/i18n/errors';
import { useFormat } from '@/i18n/use-format';
import { ApiError } from '@/services/api-client';
import {
  deleteImage,
  getImageUrl,
  getListingImages,
  ListingImage,
  reorderImages,
  setCoverImage,
  uploadImage,
} from '@/services/listings.service';
import { prepareImage } from '@/utils/prepare-image';
import { useToast } from './ui/Feedback';
import styles from './PhotoManager.module.css';

const MAX_PHOTOS = 15;
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

interface QueueItem {
  key: string;
  file: File;
  preview: string;
  state: 'queued' | 'uploading' | 'error';
  progress: number;
  error?: string;
}

interface Props {
  listingId: string;
  initialImages: ListingImage[];
  onCountChange?: (count: number) => void;
}

const byOrder = (a: ListingImage, b: ListingImage) => a.sortOrder - b.sortOrder;

/**
 * Photo grid for a listing: pick files, watch each one upload with its own
 * progress and error state, then reorder, choose the cover or delete.
 * Files upload one at a time; a failed file can be retried on its own and
 * finished files are never sent twice.
 */
export function PhotoManager({ listingId, initialImages, onCountChange }: Props) {
  const toast = useToast();
  const t = useTranslations('photos');
  const fmt = useFormat();
  const errorText = useErrorText();
  const [images, setImages] = useState(() => [...initialImages].sort(byOrder));
  const [queue, setQueueState] = useState<QueueItem[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const queueRef = useRef<QueueItem[]>([]);
  const running = useRef(false);
  const alive = useRef(true);
  const inputRef = useRef<HTMLInputElement>(null);

  const setQueue = useCallback((fn: (prev: QueueItem[]) => QueueItem[]) => {
    queueRef.current = fn(queueRef.current);
    if (alive.current) setQueueState(queueRef.current);
  }, []);
  const patch = useCallback(
    (key: string, changes: Partial<QueueItem>) =>
      setQueue((prev) => prev.map((i) => (i.key === key ? { ...i, ...changes } : i))),
    [setQueue],
  );

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      queueRef.current.forEach((i) => URL.revokeObjectURL(i.preview));
    };
  }, []);

  useEffect(() => {
    onCountChange?.(images.length);
  }, [images.length, onCountChange]);

  const pump = useCallback(async () => {
    if (running.current) return;
    running.current = true;
    try {
      for (;;) {
        const next = queueRef.current.find((i) => i.state === 'queued');
        if (!next || !alive.current) break;
        patch(next.key, { state: 'uploading', progress: 0, error: undefined });
        try {
          const blob = await prepareImage(next.file);
          if (blob.size > MAX_UPLOAD_BYTES) throw new ApiError('Larger than 10 MB', 413);
          const image = await uploadImage(listingId, blob, {
            onProgress: (progress) => patch(next.key, { progress }),
          });
          URL.revokeObjectURL(next.preview);
          setQueue((prev) => prev.filter((i) => i.key !== next.key));
          if (alive.current) setImages((prev) => [...prev, image].sort(byOrder));
        } catch (err) {
          patch(next.key, { state: 'error', error: errorText(err, t('uploadFailed')) });
        }
      }
    } finally {
      running.current = false;
    }
  }, [listingId, patch, setQueue, errorText, t]);

  const handleFiles = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = ''; // the same file can be picked again later
    const valid = files.filter((f) => ACCEPTED_TYPES.includes(f.type));
    const room = MAX_PHOTOS - images.length - queueRef.current.length;
    const accepted = valid.slice(0, Math.max(room, 0));
    if (valid.length < files.length) {
      toast(t('wrongType'), 'error');
    } else if (accepted.length < valid.length) {
      toast(t('tooMany', { max: fmt.number(MAX_PHOTOS) }), 'error');
    }
    if (accepted.length === 0) return;
    setQueue((prev) => [
      ...prev,
      ...accepted.map((file, i) => ({
        key: `${Date.now()}-${i}-${file.name}`,
        file,
        preview: URL.createObjectURL(file),
        state: 'queued' as const,
        progress: 0,
      })),
    ]);
    void pump();
  };

  const retry = (key: string) => {
    patch(key, { state: 'queued', progress: 0, error: undefined });
    void pump();
  };
  const discard = (key: string) =>
    setQueue((prev) => {
      prev.filter((i) => i.key === key).forEach((i) => URL.revokeObjectURL(i.preview));
      return prev.filter((i) => i.key !== key);
    });

  /** Run a server change on one photo; show a toast if it fails. */
  const act = async (imageId: string, action: () => Promise<void>, failure: string) => {
    setBusyId(imageId);
    try {
      await action();
    } catch (err) {
      toast(errorText(err, failure), 'error');
    } finally {
      if (alive.current) setBusyId(null);
    }
  };

  const makeCover = (image: ListingImage) =>
    act(
      image.id,
      async () => {
        await setCoverImage(listingId, image.id);
        setImages((prev) => prev.map((i) => ({ ...i, isPrimary: i.id === image.id })));
      },
      t('coverFailed'),
    );

  const move = (index: number, delta: -1 | 1) => {
    const target = index + delta;
    if (target < 0 || target >= images.length) return;
    const order = images.map((i) => i.id);
    [order[index], order[target]] = [order[target], order[index]];
    return act(
      images[index].id,
      async () => setImages((await reorderImages(listingId, order)).sort(byOrder)),
      t('reorderFailed'),
    );
  };

  const remove = (image: ListingImage) =>
    act(
      image.id,
      async () => {
        await deleteImage(listingId, image.id);
        // Reload: deleting the cover makes the server promote another photo.
        setImages((await getListingImages(listingId)).sort(byOrder));
      },
      t('deleteFailed'),
    );

  const total = images.length + queue.length;
  const nth = (index: number) => ({ index: fmt.number(index + 1) });

  return (
    <div className={styles.manager}>
      <ul className={styles.grid}>
        {images.map((image, index) => (
          <li key={image.id} className={styles.tile} aria-busy={busyId === image.id}>
            <img src={getImageUrl(image, 'thumb')} alt={t('alt', nth(index))} loading="lazy" />
            {image.isPrimary && (
              <span className={styles.cover}>
                <Star aria-hidden="true" />
                {t('cover')}
              </span>
            )}
            <div className={styles.tools}>
              <button
                type="button"
                aria-label={t('moveEarlier', nth(index))}
                disabled={index === 0 || !!busyId}
                onClick={() => move(index, -1)}
              >
                <ChevronLeft aria-hidden="true" className="icon-flip" />
              </button>
              <button
                type="button"
                aria-label={t('makeCover', nth(index))}
                aria-pressed={image.isPrimary}
                disabled={image.isPrimary || !!busyId}
                onClick={() => makeCover(image)}
              >
                <Star aria-hidden="true" />
              </button>
              <button
                type="button"
                aria-label={t('delete', nth(index))}
                disabled={!!busyId}
                onClick={() => remove(image)}
              >
                <Trash2 aria-hidden="true" />
              </button>
              <button
                type="button"
                aria-label={t('moveLater', nth(index))}
                disabled={index === images.length - 1 || !!busyId}
                onClick={() => move(index, 1)}
              >
                <ChevronRight aria-hidden="true" className="icon-flip" />
              </button>
            </div>
          </li>
        ))}

        {queue.map((item) => (
          <li key={item.key} className={`${styles.tile} ${styles.pending}`} data-state={item.state}>
            <img src={item.preview} alt="" />
            {item.state === 'error' ? (
              <div className={styles.failed} role="alert">
                <CircleAlert aria-hidden="true" />
                <span className="clamp-2">{item.error}</span>
                <div className={styles.failedActions}>
                  <button type="button" onClick={() => retry(item.key)}>
                    <RefreshCw aria-hidden="true" />
                    {t('retry')}
                  </button>
                  <button
                    type="button"
                    aria-label={t('discard', { name: item.file.name })}
                    onClick={() => discard(item.key)}
                  >
                    <X aria-hidden="true" />
                  </button>
                </div>
              </div>
            ) : (
              <div className={styles.uploading}>
                <progress
                  className={styles.progress}
                  max={1}
                  value={item.state === 'uploading' ? item.progress : 0}
                  aria-label={t('uploading', { name: item.file.name })}
                />
                <span>
                  {item.state === 'queued' ? (
                    t('waiting')
                  ) : (
                    <bdi dir="ltr">
                      {t('percent', { n: fmt.number(Math.round(item.progress * 100)) })}
                    </bdi>
                  )}
                </span>
              </div>
            )}
          </li>
        ))}

        {total < MAX_PHOTOS && (
          <li>
            <button type="button" className={styles.add} onClick={() => inputRef.current?.click()}>
              <ImagePlus aria-hidden="true" />
              <span>{total === 0 ? t('add') : t('addMore')}</span>
            </button>
          </li>
        )}
      </ul>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_TYPES.join(',')}
        multiple
        onChange={handleFiles}
        className="visually-hidden"
        tabIndex={-1}
        aria-hidden="true"
      />

      <p className={styles.help}>
        {t('help', { n: fmt.number(total), max: fmt.number(MAX_PHOTOS) })}
      </p>
    </div>
  );
}
