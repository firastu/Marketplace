import { titleMetadata } from '@/i18n/metadata';

// The page itself is a client component, so its translated <title> is set here.
export const generateMetadata = titleMetadata('myListings');

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
