import type { Referral, ReferralForm } from "./types";

export function validateReferralForm(form: ReferralForm): string | null {
  if (!form.referrer.trim()) return "Quem indicou é obrigatório";
  if (!form.referred.trim()) return "Indicado é obrigatório";
  return null;
}

export function validateReferral(referral: Referral): string | null {
  return validateReferralForm(referral);
}
