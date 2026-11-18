'use client';

import { AuthProvider } from '@/hooks/use-auth';
import { FavoritesProvider } from '@/hooks/use-favorites';
import { FeedbackProvider } from '@/components/ui/Feedback';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <FeedbackProvider>
        <FavoritesProvider>{children}</FavoritesProvider>
      </FeedbackProvider>
    </AuthProvider>
  );
}
