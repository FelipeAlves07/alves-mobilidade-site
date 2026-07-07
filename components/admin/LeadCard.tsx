"use client";

import { MessageCircle, Phone, CheckCircle2 } from "lucide-react";

type LeadCardProps = {
  name: string;
  phone: string;
  status: string;
  nextAction: string;
  onWhatsApp: () => void;
  onComplete: () => void;
};

export default function LeadCard({
  name,
  phone,
  status,
  nextAction,
  onWhatsApp,
  onComplete,
}: LeadCardProps) {
  return (
    <div className="rounded-3xl border border-[#d6a85f]/15 bg-[#171717] p-5">
      <h3 className="text-lg font-bold text-white">
        {name}
      </h3>

      <p className="mt-1 text-sm text-zinc-400">
        {phone}
      </p>

      <div className="mt-4 space-y-2">
        <p className="text-[#f1d28b] text-sm">
          {status}
        </p>

        <p className="text-zinc-400 text-sm">
          {nextAction}
        </p>
      </div>

      <div className="mt-5 flex gap-3">

        <button
          onClick={onWhatsApp}
          className="cursor-pointer rounded-full bg-green-500 p-3 text-white transition hover:scale-105"
        >
          <MessageCircle size={18} />
        </button>

        <button
          onClick={onComplete}
          className="cursor-pointer rounded-full bg-[#d6a85f] p-3 text-black transition hover:scale-105"
        >
          <CheckCircle2 size={18} />
        </button>

      </div>
    </div>
  );
}