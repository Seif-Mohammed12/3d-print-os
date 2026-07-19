export interface Order {
  id: string;
  tenant_id: string;
  customer_id: string;
  status: 'pending' | 'confirmed' | 'in_production' | 'completed' | 'cancelled';
  total_amount: number;
  currency: string;
  items: OrderItem[];
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  material_id?: string;
  printer_id?: string;
  quantity: number;
  price: number;
}

export type OrderStatus = Order['status'];

export interface CreateOrderInput {
  customer_id: string;
  items: {
    material_id?: string;
    printer_id?: string;
    quantity: number;
    price: number;
  }[];
}

export interface UpdateOrderInput {
  status?: OrderStatus;
  items?: CreateOrderInput['items'];
}

export interface OrderListParams {
  page?: number;
  per_page?: number;
  status?: OrderStatus;
  customer_id?: string;
}
