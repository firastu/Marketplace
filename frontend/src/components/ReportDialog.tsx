'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { CircleAlert, CircleCheck, Info } from 'lucide-react';
import { useErrorText } from '@/i18n/errors';
import { Link } from '@/i18n/navigation';
import { ApiError } from '@/services/api-client';
import {
  createReport,
  REPORT_REASONS,
  ReportReason,
  ReportTargetType,
} from '@/services/reports.service';
import { Button } from './ui/Button';
import { Dialog } from './ui/Dialog';
import { Field, Textarea } from './ui/Field';
import styles from './ReportDialog.module.css';

interface Props {
  open: boolean;
  onClose: () => void;
  targetType: ReportTargetType;
  targetId: string;
  /** Listing title or seller name, shown so the reporter knows what is reported. */
  targetName: string;
}

type Outcome = 'sent' | 'duplicate' | null;

/** "Report this listing / seller": a reason, optional details, then a receipt. */
export function ReportDialog({ open, onClose, targetType, targetId, targetName }: Props) {
  const t = useTranslations('report');
  const tc = useTranslations('common');
  const errorText = useErrorText();
  const [reason, setReason] = useState<ReportReason | ''>('');
  const [details, setDetails] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [outcome, setOutcome] = useState<Outcome>(null);

  // Opened again after reporting: say so instead of offering the form again.
  useEffect(() => {
    if (!open) return;
    setError('');
    setOutcome((prev) => (prev === 'sent' ? 'duplicate' : prev));
  }, [open]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!reason) return;
    setBusy(true);
    setError('');
    try {
      await createReport({ targetType, targetId, reason, details: details.trim() || undefined });
      setOutcome('sent');
      setReason('');
      setDetails('');
    } catch (err) {
      // An open report from this account already exists: not a failure.
      if (err instanceof ApiError && err.status === 409) setOutcome('duplicate');
      else setError(errorText(err, t('failed')));
    } finally {
      setBusy(false);
    }
  };

  const title = targetType === 'listing' ? t('titleListing') : t('titleUser');

  return (
    <Dialog open={open} onClose={onClose} title={title} variant="sheet">
      {outcome ? (
        <div className={styles.outcome} role="status">
          <span className={styles.outcomeIcon} data-tone={outcome} aria-hidden="true">
            {outcome === 'sent' ? <CircleCheck /> : <Info />}
          </span>
          <h3>{outcome === 'sent' ? t('sentTitle') : t('duplicateTitle')}</h3>
          <p className="muted">{outcome === 'sent' ? t('sentBody') : t('duplicateBody')}</p>
          <Button variant="primary" block onClick={onClose}>
            {tc('close')}
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="form">
          <p className="muted">
            {t.rich('lead', {
              name: targetName,
              b: (chunks) => (
                <strong>
                  <bdi>{chunks}</bdi>
                </strong>
              ),
            })}
          </p>

          {error && (
            <div className="notice notice--danger" role="alert">
              <CircleAlert aria-hidden="true" />
              <span className="notice__body">{error}</span>
            </div>
          )}

          <fieldset className={styles.reasons}>
            <legend className="field__label">{t('reasonLabel')}</legend>
            {REPORT_REASONS.map((value) => (
              <label key={value} className={styles.reason}>
                <input
                  type="radio"
                  name="report-reason"
                  value={value}
                  checked={reason === value}
                  onChange={() => setReason(value)}
                  required
                />
                <span>{t(`reason.${value}`)}</span>
              </label>
            ))}
          </fieldset>

          <Field label={t('details')} htmlFor="report-details" hint={t('detailsHint')}>
            <Textarea
              id="report-details"
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              maxLength={1000}
              rows={3}
              dir="auto"
              aria-describedby="report-details-hint"
            />
          </Field>

          <p className={styles.small}>
            {t.rich('rulesNote', {
              rules: (chunks) => (
                <Link href="/rules" className="link" target="_blank">
                  {chunks}
                </Link>
              ),
            })}
          </p>

          <div className={styles.buttons}>
            <Button onClick={onClose}>{tc('cancel')}</Button>
            <Button type="submit" variant="danger" loading={busy} disabled={!reason}>
              {t('submit')}
            </Button>
          </div>
        </form>
      )}
    </Dialog>
  );
}
