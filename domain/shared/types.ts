import type { Lead } from "@/domain/lead/types";
import type { Trip } from "@/domain/trip/types";

export interface DashboardStats {
  pending: Lead[];
  openLeads: Lead[];
  closed: number;
  revenueTrips: number;
  revenueFinance: number;
  credits: number;
  todayTrips: Trip[];
  conversion: number;
}

export interface MenuItem {
  id: string;
  group: "Operação" | "Comercial" | "Gestão";
  label: string;
  icon: unknown;
}
