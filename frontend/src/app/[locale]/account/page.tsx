import { titleMetadata } from '@/i18n/metadata';
import { NO_INDEX } from '@/i18n/seo';
import AccountSettings from './AccountSettings';

export const generateMetadata = titleMetadata('account', { robots: NO_INDEX });

export default function Page() {
  return <AccountSettings />;
}
