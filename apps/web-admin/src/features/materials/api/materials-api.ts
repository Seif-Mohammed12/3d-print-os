import { http } from '../../../shared/api/http';
import type { Material, MaterialInput } from '../model/material-types';

export const materialsApi = {
  list: (params: { search?: string; isActive?: boolean } = {}) =>
    http.list<Material>('/materials', { ...params, perPage: 100 }),
  create: (input: MaterialInput) => http.post<Material>('/materials', input),
  update: (id: string, input: MaterialInput) => http.patch<Material>(`/materials/${id}`, input),
  remove: (id: string) => http.delete(`/materials/${id}`),
};
