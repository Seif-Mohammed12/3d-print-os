import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { materialsApi } from '../api/materials-api';
import type { MaterialInput } from '../model/material-types';

export function useMaterials(params: { search?: string; isActive?: boolean } = {}) {
  return useQuery({ queryKey: ['materials', params], queryFn: () => materialsApi.list(params) });
}

export function useSaveMaterial(id?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: MaterialInput) =>
      id ? materialsApi.update(id, input) : materialsApi.create(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['materials'] }),
  });
}

export function useDeleteMaterial() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => materialsApi.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['materials'] }),
  });
}
