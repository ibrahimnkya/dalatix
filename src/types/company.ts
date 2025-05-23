export interface Company {
  id: number;
  uuid: string;
  name: string;
  address: string;
  phone_number: string;
  email: string;
  website_url?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateCompanyData {
  name: string;
  address: string;
  phone_number: string;
  email: string;
  website_url?: string;
}

export interface UpdateCompanyData extends Partial<CreateCompanyData> {}

export interface CompanyFilters {
  name?: string;
  is_active?: boolean;
  paginate?: boolean;
  page?: number;
}
