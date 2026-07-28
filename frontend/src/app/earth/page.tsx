
"use client";

import { Suspense } from 'react';
import EarthPageClient from '@/components/EarthPageClient';

export default function EarthPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <EarthPageClient />
    </Suspense>
  );
}
