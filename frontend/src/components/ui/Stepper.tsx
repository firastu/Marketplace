import { Fragment } from 'react';
import { Check } from 'lucide-react';

export function Stepper({ steps, current }: { steps: string[]; current: number }) {
  return (
    <ol className="stepper" aria-label="Progress">
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
                {state === 'done' ? <Check /> : i + 1}
              </span>
              <span>{label}</span>
            </li>
          </Fragment>
        );
      })}
    </ol>
  );
}
