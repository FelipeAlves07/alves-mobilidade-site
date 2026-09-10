import type { ReceiptForm, PaymentMethod, ReceiptPatch } from "./types";

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

const PAYMENT_METHODS: PaymentMethod[] = [
  "Pix",
  "Dinheiro",
  "Cartão de crédito",
  "Cartão de débito",
  "Transferência",
  "Outro",
];

function isValidDate(dateStr: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
  const date = new Date(dateStr);
  return !isNaN(date.getTime()) && dateStr === date.toISOString().split("T")[0];
}

function isValidNumberFormat(number: string): boolean {
  return /^\d{4,}\/\d{4}$/.test(number);
}

export function validateReceiptForm(form: ReceiptForm): ValidationResult {
  const errors: ValidationError[] = [];

  // clientName
  const clientName = form.clientName?.trim();
  if (!clientName) {
    errors.push({ field: "clientName", message: "Nome do cliente é obrigatório" });
  }

  // serviceDescription
  const serviceDescription = form.serviceDescription?.trim();
  if (!serviceDescription) {
    errors.push({ field: "serviceDescription", message: "Descrição do serviço é obrigatória" });
  }

  // serviceDate
  if (!form.serviceDate || !isValidDate(form.serviceDate)) {
    errors.push({ field: "serviceDate", message: "Data do serviço inválida (formato YYYY-MM-DD)" });
  }

  // paymentMethod
  if (!form.paymentMethod || !PAYMENT_METHODS.includes(form.paymentMethod)) {
    errors.push({ field: "paymentMethod", message: `Forma de pagamento inválida. Permitidos: ${PAYMENT_METHODS.join(", ")}` });
  }

  // value
  if (form.value === undefined || form.value === null || isNaN(form.value) || form.value < 0) {
    errors.push({ field: "value", message: "Valor deve ser um número >= 0" });
  }

  // number (if provided, should be valid format)
  if (form.number && !isValidNumberFormat(form.number)) {
    errors.push({ field: "number", message: "Número do recibo deve seguir formato NNNN/AAAA" });
  }

  // tripId (optional, but if present should be non-empty)
  if (form.tripId !== undefined && form.tripId !== null && form.tripId.trim() === "") {
    errors.push({ field: "tripId", message: "tripId não pode ser string vazia" });
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function validateReceiptPatch(patch: ReceiptPatch): ValidationResult {
  const errors: ValidationError[] = [];

  if (patch.clientName !== undefined) {
    const clientName = patch.clientName.trim();
    if (!clientName) {
      errors.push({ field: "clientName", message: "Nome do cliente não pode ser vazio" });
    }
  }

  if (patch.serviceDescription !== undefined) {
    const serviceDescription = patch.serviceDescription.trim();
    if (!serviceDescription) {
      errors.push({ field: "serviceDescription", message: "Descrição do serviço não pode ser vazia" });
    }
  }

  if (patch.serviceDate !== undefined && !isValidDate(patch.serviceDate)) {
    errors.push({ field: "serviceDate", message: "Data do serviço inválida (formato YYYY-MM-DD)" });
  }

  if (patch.paymentMethod !== undefined && !PAYMENT_METHODS.includes(patch.paymentMethod)) {
    errors.push({ field: "paymentMethod", message: `Forma de pagamento inválida. Permitidos: ${PAYMENT_METHODS.join(", ")}` });
  }

  if (patch.value !== undefined && (isNaN(patch.value) || patch.value < 0)) {
    errors.push({ field: "value", message: "Valor deve ser um número >= 0" });
  }

  if (patch.number !== undefined && !isValidNumberFormat(patch.number)) {
    errors.push({ field: "number", message: "Número do recibo deve seguir formato NNNN/AAAA" });
  }

  if (patch.tripId !== undefined && patch.tripId !== null && patch.tripId.trim() === "") {
    errors.push({ field: "tripId", message: "tripId não pode ser string vazia" });
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function assertValidReceiptForm(form: ReceiptForm): void {
  const result = validateReceiptForm(form);
  if (!result.valid) {
    throw new Error(`Validação falhou: ${result.errors.map((e) => `${e.field}: ${e.message}`).join("; ")}`);
  }
}

export function assertValidReceiptPatch(patch: ReceiptPatch): void {
  const result = validateReceiptPatch(patch);
  if (!result.valid) {
    throw new Error(`Validação falhou: ${result.errors.map((e) => `${e.field}: ${e.message}`).join("; ")}`);
  }
}