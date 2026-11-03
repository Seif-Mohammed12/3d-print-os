import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { embedSettingsApi } from '../api/embed-settings-api';

const KEY = ['embed-settings'];

export function useEmbedSettings() {
  return useQuery({ queryKey: KEY, queryFn: embedSettingsApi.get });
}

export function useUpdateEmbedSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: embedSettingsApi.update,
    onSuccess: (data) => queryClient.setQueryData(KEY, data),
  });
}

export function useRotateEmbedKey() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: embedSettingsApi.rotateKey,
    onSuccess: (data) => queryClient.setQueryData(KEY, data),
  });
}
