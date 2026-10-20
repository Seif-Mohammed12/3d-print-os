export type CustomerType = 'individual' | 'business';
export type CustomerStatus = 'active' | 'inactive' | 'blocked';

export type Customer = {
  id: string;
  shop_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  city: string | null;
  country: string | null;
  customer_type: CustomerType;
  business_name: string | null;
  status: CustomerStatus;
  notes: string | null;
  created_at: string;
};

/** The customers API takes snake_case input. */
export type CustomerInput = {
  shop_id?: string;
  name?: string;
  email?: string;
  phone?: string;
  city?: string;
  country?: string;
  customer_type?: CustomerType;
  business_name?: string;
  status?: CustomerStatus;
  notes?: string;
};
