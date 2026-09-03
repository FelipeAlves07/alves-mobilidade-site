import type { Referral, ReferralForm } from "./types";

export interface ReferralDatabase {
  id: string;
  referrer: string;
  referred: string;
  status: string;
  credits: number;
  referrer_phone?: string;
  referred_phone?: string;
}

export function referralToDatabase(ref: Referral): ReferralDatabase {
  return {
    ...ref,
    referrer_phone: ref.referrerPhone,
    referred_phone: ref.referredPhone,
  };
}

export function referralFromDatabase(db: ReferralDatabase): Referral {
  return {
    id: db.id,
    referrer: db.referrer,
    referred: db.referred,
    status: db.status as Referral["status"],
    credits: db.credits,
    referrerPhone: db.referrer_phone || "",
    referredPhone: db.referred_phone || "",
  };
}

export function referralFormToDatabase(form: ReferralForm): Omit<ReferralDatabase, "id"> {
  return { ...form, status: form.status };
}
