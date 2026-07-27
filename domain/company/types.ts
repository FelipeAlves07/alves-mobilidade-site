export interface CompanySettings {
  id: string;
  company_name: string;
  logo_url: string | null;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  whatsapp_number: string;
  email: string | null;
  website: string | null;
  address: string | null;
  default_language: string;
  is_active: boolean;
  created_at: string;
  updated_at: string | null;
}
