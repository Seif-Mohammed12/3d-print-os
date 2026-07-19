import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { printersApi } from '../api/printers-api';
import type { CreatePrinterInput, UpdatePrinterInput, PrinterListParams } from '../model/printer-types';

export function usePrinters(params?: PrinterListParams) {
  return useQuery({
    queryKey: ['printers', params],
    queryFn: () => printersApi.list(params),
  });
}

export function usePrinter(id: string) {
  return useQuery({
    queryKey: ['printers', id],
    queryFn: () => printersApi.get(id),
    enabled: !!id,
  });
}

export function useCreatePrinter() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreatePrinterInput) => printersApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['printers'] });
    },
  });
}

export function useUpdatePrinter() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdatePrinterInput }) =>
      printersApi.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['printers'] });
      queryClient.invalidateQueries({ queryKey: ['printers', id] });
    },
  });
}

export function useDeletePrinter() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => printersApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['printers'] });
    },
  });
}
