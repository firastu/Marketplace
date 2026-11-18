import { Fragment } from 'react';
import { Check } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useFormat } from '@/i18n/use-format';

export function Stepper({ steps, current }: { steps: string[]; current: number }) {
  const t = useTranslations('bits');
  const fmt = useFormat();
  return (
    <ol className="stepper" aria-label={t('stepper')}>
      {steps.map((label, i) => {
        const state = i < current ? 'done' : i === current ? 'current' : 'todo';
        return (
          <Fragment key={label}>
            {i > 0 && <li className="stepper__bar" data-done={i <= current} aria-hidden="true" />}
            <li
              className="stepper__step"
              data-state={state}
              aria-current={state === 'current' ? 'step' : undefined}
            >
              <span className="stepper__dot" aria-hidden="true">
                {state === 'done' ? <Check /> : fmt.number(i + 1)}
              </span>
              <span>{label}</span>
            </li>
          </Fragment>
        );
      })}
    </ol>
  );
}
