import { lazy, Suspense } from 'react';

import { Skeleton } from '../../../shared/ui';
import type { ModelSize } from './model-preview';

// three.js is large; load the viewer only when a model is actually shown.
const ModelPreview = lazy(() =>
  import('./model-preview').then((m) => ({ default: m.ModelPreview })),
);

export function LazyModelPreview(props: {
  file: File;
  className?: string;
  onSize?: (size: ModelSize) => void;
}) {
  return (
    <Suspense fallback={<Skeleton className={props.className} />}>
      <ModelPreview {...props} />
    </Suspense>
  );
}
