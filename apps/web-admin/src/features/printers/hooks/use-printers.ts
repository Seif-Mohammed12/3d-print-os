import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { printersApi } from '../api/printers-api';
import type { PrinterInput, PrinterProfileInput, PrinterStatus } from '../model/printer-types';

export function usePrinters(params: { status?: PrinterStatus; search?: string } = {}) {
  return useQuery({ queryKey: ['printers', params], queryFn: () => printersApi.list(params) });
}

export function usePrinter(id: string | undefined) {
  return useQuery({
    queryKey: ['printers', 'detail', id],
    queryFn: () => printersApi.get(id as string),
    enabled: !!id,
  });
}

export function usePrinterProfiles(printerId: string | undefined) {
  return useQuery({
    queryKey: ['printers', 'profiles', printerId],
    queryFn: () => printersApi.profiles(printerId as string),
    enabled: !!printerId,
  });
}

export function usePrinterCalibration(printerId?: string) {
  return useQuery({
    queryKey: ['calibration', printerId ?? 'all'],
    queryFn: () => printersApi.calibration(printerId),
  });
}

function useInvalidate() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ['printers'] });
}

export function useSavePrinter(id?: string) {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (input: PrinterInput) =>
      id ? printersApi.update(id, input) : printersApi.create(input),
    onSuccess: invalidate,
  });
}

export function useDeletePrinter() {
  const invalidate = useInvalidate();
  return useMutation({ mutationFn: (id: string) => printersApi.remove(id), onSuccess: invalidate });
}

export function useSaveProfile(printerId: string, profileId?: string) {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (input: PrinterProfileInput) =>
      profileId
        ? printersApi.updateProfile(profileId, input)
        : printersApi.createProfile(printerId, input),
    onSuccess: invalidate,
  });
}

export function useDeleteProfile() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (id: string) => printersApi.removeProfile(id),
    onSuccess: invalidate,
  });
}
