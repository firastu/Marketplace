import { ForgotPasswordForm } from '@/components/PasswordReset';
import { titleMetadata } from '@/i18n/metadata';
import { NO_INDEX } from '@/i18n/seo';

export const generateMetadata = titleMetadata('forgotPassword', { robots: NO_INDEX });

export default function Page() {
  return <ForgotPasswordForm />;
}
