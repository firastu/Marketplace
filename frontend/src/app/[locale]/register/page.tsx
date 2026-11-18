import { Suspense } from 'react';
import { AuthForm } from '@/components/AuthForm';
import { titleMetadata } from '@/i18n/metadata';

export const generateMetadata = titleMetadata('register');

export default function Page() {
  return (
    <Suspense>
      <AuthForm mode="register" />
    </Suspense>
  );
}
