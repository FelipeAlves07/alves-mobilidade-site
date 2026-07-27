import type { Referral, ReferralForm } from "./types";

export interface ReferralDatabase {
  id: string;
  referrer: string;
  referred: string;
  status: string;
  credits: number;
}

export function referralToDatabase(ref: Referral): ReferralDatabase {
  return { ...ref };
}

export function referralFromDatabase(db: ReferralDatabase): Referral {
  return {
    ...db,
    status: db.status as Referral["status"],
  };
}

export function referralFormToDatabase(form: ReferralForm): Omit<ReferralDatabase, "id"> {
  return { ...form, status: form.status };
}
