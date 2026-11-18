import { titleMetadata } from '@/i18n/metadata';
import { NO_INDEX } from '@/i18n/seo';
import { AdminShell } from './AdminShell';

export const generateMetadata = titleMetadata('admin', { robots: NO_INDEX });

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminShell>{children}</AdminShell>;
}
