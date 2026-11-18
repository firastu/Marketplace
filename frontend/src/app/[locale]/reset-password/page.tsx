import { Suspense } from 'react';
import { ResetPasswordForm } from '@/components/PasswordReset';
import { titleMetadata } from '@/i18n/metadata';
import { NO_INDEX } from '@/i18n/seo';

export const generateMetadata = titleMetadata('resetPassword', { robots: NO_INDEX });

export default function Page() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
}
