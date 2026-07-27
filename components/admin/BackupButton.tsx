"use client";

import { Download } from "lucide-react";

type Props = {
  onBackup: () => void;
};

export default function BackupButton({ onBackup }: Props) {
  return (
    <button
      type="button"
      onClick={onBackup}
      className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-[var(--accent-20)] px-5 py-3 text-sm font-bold text-[var(--accent)] transition hover:bg-[var(--accent-10)] hover:-translate-y-0.5 active:translate-y-0"
    >
      <Download size={16} />
      Backup
    </button>
  );
}