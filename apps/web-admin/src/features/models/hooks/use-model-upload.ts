import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';

import { modelsApi } from '../api/models-api';

export function useModelUpload(shopId: string | undefined) {
  const [progress, setProgress] = useState(0);
  const mutation = useMutation({
    mutationFn: (file: File) => {
      setProgress(0);
      return modelsApi.upload(file, shopId, setProgress);
    },
  });
  return { ...mutation, progress };
}
