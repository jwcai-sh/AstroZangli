
"use client";

import LocalizedText from "@/i18n/LocalizedText";
import { Suspense } from 'react';
import EarthPageClient from '@/components/EarthPageClient';

export default function EarthPage() {
  return (
    <Suspense fallback={<div><LocalizedText text={"加载中…"} /></div>}>
      <EarthPageClient />
    </Suspense>
  );
}
