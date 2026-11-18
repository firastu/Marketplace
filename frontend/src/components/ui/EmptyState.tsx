import { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  children?: ReactNode;
  actions?: ReactNode;
}

export function EmptyState({ icon: Icon, title, children, actions }: EmptyStateProps) {
  return (
    <div className="empty">
      <span className="empty__icon" aria-hidden="true">
        <Icon />
      </span>
      <h2 className="empty__title">{title}</h2>
      {children && <p className="empty__text">{children}</p>}
      {actions && <div className="empty__actions">{actions}</div>}
    </div>
  );
}
