import { SpotilarkLayout } from '@/components/spotilark-layout';
import { Suspense } from 'react';
import FolderContentClient from './FolderContentClient';

export const dynamic = 'force-dynamic';

// Server component that receives the params
export default async function FolderContentPage({ params }: { params: Promise<{ sourceName: string }> }) {
  const resolvedParams = await params;
  const { sourceName } = resolvedParams;

  return (
    <SpotilarkLayout>
      <Suspense fallback={<div className='flex-1 p-8 overflow-y-auto pb-24'><p>Loading music...</p></div>}>
        <FolderContentClient sourceName={sourceName} />
      </Suspense>
    </SpotilarkLayout>
  );
}
