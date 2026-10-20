import { http } from '../../../shared/api/http';
import type {
  Printer,
  PrinterCalibration,
  PrinterInput,
  PrinterProfile,
  PrinterProfileInput,
  PrinterStatus,
} from '../model/printer-types';

export const printersApi = {
  list: (params: { status?: PrinterStatus; search?: string } = {}) =>
    http.list<Printer>('/printers', { ...params, per_page: 100 }),
  get: (id: string) => http.get<Printer>(`/printers/${id}`),
  create: (input: PrinterInput) => http.post<Printer>('/printers', input),
  update: (id: string, input: PrinterInput) => http.patch<Printer>(`/printers/${id}`, input),
  remove: (id: string) => http.delete(`/printers/${id}`),

  profiles: (printerId: string) => http.get<PrinterProfile[]>(`/printers/${printerId}/profiles`),
  createProfile: (printerId: string, input: PrinterProfileInput) =>
    http.post<PrinterProfile>(`/printers/${printerId}/profiles`, input),
  updateProfile: (profileId: string, input: PrinterProfileInput) =>
    http.patch<PrinterProfile>(`/printers/profiles/${profileId}`, input),
  removeProfile: (profileId: string) => http.delete(`/printers/profiles/${profileId}`),

  calibration: (printerId?: string) =>
    http.list<PrinterCalibration>('/calibration/printers', { printerId }),
};
