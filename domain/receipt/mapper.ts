import type { Receipt, ReceiptForm, ReceiptPdfData } from "./types";

export interface ReceiptDatabase {
  id: string;
  number: string;
  trip_id?: string;

  client_name: string;
  client_phone?: string;

  service_date: string;
  service_description: string;
  payment_method: string;

  value: string; // numeric(12,2) comes as string from Postgres
  observations?: string;

  created_at: string;
  updated_at?: string;
}

export function receiptToDatabase(receipt: Receipt): ReceiptDatabase {
  return {
    id: receipt.id,
    number: receipt.number,
    trip_id: receipt.tripId,

    client_name: receipt.clientName,
    client_phone: receipt.clientPhone,

    service_date: receipt.serviceDate,
    service_description: receipt.serviceDescription,
    payment_method: receipt.paymentMethod,

    value: receipt.value.toFixed(2),
    observations: receipt.observations,

    created_at: receipt.createdAt,
    updated_at: receipt.updatedAt,
  };
}

export function receiptFromDatabase(db: ReceiptDatabase): Receipt {
  return {
    id: db.id,
    number: db.number,
    tripId: db.trip_id,

    clientName: db.client_name,
    clientPhone: db.client_phone,

    serviceDate: db.service_date,
    serviceDescription: db.service_description,
    paymentMethod: db.payment_method as Receipt["paymentMethod"],

    value: Number(db.value),
    observations: db.observations,

    createdAt: db.created_at,
    updatedAt: db.updated_at,
  };
}

export function receiptFormToDatabase(form: ReceiptForm): Omit<ReceiptDatabase, "id" | "created_at" | "updated_at"> {
  return {
    number: form.number,
    trip_id: form.tripId,

    client_name: form.clientName,
    client_phone: form.clientPhone,

    service_date: form.serviceDate,
    service_description: form.serviceDescription,
    payment_method: form.paymentMethod,

    value: form.value.toFixed(2),
    observations: form.observations,
  };
}

export function receiptToPdfData(receipt: Receipt): ReceiptPdfData {
  const formatDate = (iso: string) => {
    const [y, m, d] = iso.split("-");
    return `${d}/${m}/${y}`;
  };

  return {
    number: receipt.number,
    clientName: receipt.clientName,
    date: formatDate(receipt.serviceDate),
    service: receipt.serviceDescription,
    paymentMethod: receipt.paymentMethod,
    value: receipt.value,
    observations: receipt.observations || "",
  };
}