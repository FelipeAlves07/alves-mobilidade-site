export type ReferralStatus = "Indicado" | "Transfer realizado" | "Transfer creditado";

export interface Referral {
  id: string;
  referrer: string;
  referred: string;
  status: ReferralStatus;
  credits: number;
}

export interface ReferralForm extends Omit<Referral, "id"> {}
