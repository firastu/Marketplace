import { notFound } from 'next/navigation';

// Any unknown path gets a 404 and the translated not-found page of its language.
export default function CatchAll() {
  notFound();
}
