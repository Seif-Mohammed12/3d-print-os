export interface Customer {
  id: string;
  tenant_id: string;
  email: string;
  full_name: string;
  phone?: string;
  company?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    postal_code?: string;
    country?: string;
  };
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateCustomerInput {
  email: string;
  full_name: string;
  phone?: string;
  company?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    postal_code?: string;
    country?: string;
  };
  notes?: string;
}

export interface UpdateCustomerInput extends Partial<CreateCustomerInput> {}

export interface CustomerListParams {
  page?: number;
  per_page?: number;
  search?: string;
}
