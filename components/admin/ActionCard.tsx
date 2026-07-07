"use client";

import { CheckCircle2 } from "lucide-react";
import WhatsAppIcon from "./WhatsAppIcon";

type ActionCardProps = {
  title: string;
  text: string;
  onDone: () => void;
  onSend?: () => void;
};

export default function ActionCard({
  title,
  text,
  onDone,
  onSend,
}: ActionCardProps) {
  return (
    <div className="rounded-3xl border border-[#d6a85f]/15 bg-[#202020] p-5">
      <h3 className="text-lg font-black text-white">{title}</h3>

      <p className="mt-3 text-sm leading-6 text-zinc-400">{text}</p>

      <div className="mt-5 flex flex-wrap gap-2">
        {onSend && (
          <button
            type="button"
            onClick={onSend}
            className="cursor-pointer rounded-full bg-[#25D366] px-4 py-2 text-xs font-black text-white transition hover:scale-105"
          >
            <WhatsAppIcon className="mr-1 inline h-4 w-4" />
            WhatsApp
          </button>
        )}

        <button
          type="button"
          onClick={onDone}
          className="cursor-pointer rounded-full bg-[#d6a85f] px-4 py-2 text-xs font-black text-black transition hover:scale-105"
        >
          <CheckCircle2 className="mr-1 inline" size={15} />
          Concluir
        </button>
      </div>
    </div>
  );
}