export type PaymentMethod =
  | "Pix"
  | "Dinheiro"
  | "Cartão de crédito"
  | "Cartão de débito"
  | "Transferência"
  | "Outro";

export interface Receipt {
  id: string;
  number: string;             // "0487/2026" (NNNN/AAAA)
  tripId?: string;            // optional link to Trip

  clientName: string;
  clientPhone?: string;

  serviceDate: string;        // YYYY-MM-DD
  serviceDescription: string; // "Translado aeroportuário"
  paymentMethod: PaymentMethod;

  value: number;              // in reais (e.g., 140 = R$ 140,00) — consistent with Trip.value
  observations?: string;

  createdAt: string;          // ISO timestamp
  updatedAt?: string;         // ISO timestamp
}

export interface ReceiptForm extends Omit<Receipt, "id" | "createdAt" | "updatedAt"> {}

export type ReceiptPatch = Partial<ReceiptForm>;

// For PDF rendering — data shape that matches the template config
export interface ReceiptPdfData {
  number: string;
  clientName: string;
  date: string;           // DD/MM/YYYY
  service: string;
  paymentMethod: string;
  value: number;
  observations: string;
}

// Template configuration types (used by recibo-template.config.ts and recibo-pdf.service.ts)
export interface ReceiptFieldConfig {
  x: number;
  y: number;
  fontSize: number;
  font: "regular" | "bold";
  color: { r: number; g: number; b: number };
  maxWidth?: number;
  maxLines?: number;
  lineHeight?: number;
  align?: "left" | "center" | "right";
}

export interface ReceiptTemplateConfig {
  pageWidth: number;
  pageHeight: number;
  fields: {
    number: ReceiptFieldConfig;
    clientName: ReceiptFieldConfig;
    date: ReceiptFieldConfig;
    service: ReceiptFieldConfig;
    paymentMethod: ReceiptFieldConfig;
    value: ReceiptFieldConfig;
    observations: ReceiptFieldConfig;
  };
}