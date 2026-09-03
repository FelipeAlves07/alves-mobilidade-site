export type ReferralStatus = "Pendente" | "Convertida" | "Cancelada";

export interface Referral {
  id: string;
  referrer: string;
  referred: string;
  referrerPhone?: string;
  referredPhone?: string;
  status: ReferralStatus;
  credits: number;
}

export interface ReferralForm extends Omit<Referral, "id"> {}
