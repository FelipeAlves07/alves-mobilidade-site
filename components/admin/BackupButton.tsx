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
      className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-[#d6a85f]/20 px-5 py-3 text-sm font-black text-[#f1d28b]"
    >
      <Download size={16} />
      Backup
    </button>
  );
}