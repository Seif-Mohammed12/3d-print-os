import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { ordersApi } from '../api/orders-api';
import type {
  OrderListParams,
  RecordPrintOutcomeInput,
  UpdateOrderInput,
} from '../model/order-types';

export function useOrders(params: OrderListParams) {
  return useQuery({ queryKey: ['orders', params], queryFn: () => ordersApi.list(params) });
}

export function useOrder(id: string | undefined) {
  return useQuery({
    queryKey: ['orders', 'detail', id],
    queryFn: () => ordersApi.get(id as string),
    enabled: !!id,
  });
}

export function useOrderHistory(id: string | undefined) {
  return useQuery({
    queryKey: ['orders', 'history', id],
    queryFn: () => ordersApi.history(id as string),
    enabled: !!id,
  });
}

export function usePrintOutcome(id: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: ['orders', 'outcome', id],
    queryFn: () => ordersApi.getOutcome(id as string),
    enabled: !!id && enabled,
  });
}

export function useUpdateOrder(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateOrderInput) => ordersApi.update(id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['orders'] }),
  });
}

export function useRecordPrintOutcome(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: RecordPrintOutcomeInput) => ordersApi.recordOutcome(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders', 'outcome', id] });
      queryClient.invalidateQueries({ queryKey: ['calibration'] });
    },
  });
}
