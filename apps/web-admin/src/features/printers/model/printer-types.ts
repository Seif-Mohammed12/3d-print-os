export interface Printer {
  id: string;
  tenant_id: string;
  shop_id?: string;
  name: string;
  model: string;
  manufacturer: string;
  build_volume_x: number;
  build_volume_y: number;
  build_volume_z: number;
  technology: 'FDM' | 'SLA' | 'SLS' | 'DLP' | 'MJ';
  status: 'active' | 'maintenance' | 'offline';
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface CreatePrinterInput {
  shop_id?: string;
  name: string;
  model: string;
  manufacturer: string;
  build_volume_x: number;
  build_volume_y: number;
  build_volume_z: number;
  technology: 'FDM' | 'SLA' | 'SLS' | 'DLP' | 'MJ';
  notes?: string;
}

export type UpdatePrinterInput = Partial<CreatePrinterInput>;

export interface PrinterListParams {
  page?: number;
  per_page?: number;
  shop_id?: string;
  status?: Printer['status'];
}
