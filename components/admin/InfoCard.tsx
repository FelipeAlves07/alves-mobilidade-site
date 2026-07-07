"use client";

import { useState } from "react";

type InfoCardProps = {
  title: string;
  text: string;
  onCopy?: () => void;
};

export default function InfoCard({ title, text, onCopy }: InfoCardProps) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    if (onCopy) onCopy();
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div className="rounded-3xl border border-[#d6a85f]/15 bg-[#202020] p-5">
      <h3 className="text-lg font-black capitalize text-white">{title}</h3>

      <p className="mt-4 text-sm leading-7 text-zinc-400">{text}</p>

      {onCopy && (
        <button
          type="button"
          onClick={handleCopy}
          className="mt-5 cursor-pointer rounded-full border border-[#d6a85f]/25 px-5 py-3 text-xs font-black text-[#f1d28b] transition hover:bg-[#d6a85f] hover:text-black"
        >
          {copied ? "Copiado ✓" : "Copiar mensagem"}
        </button>
      )}
    </div>
  );
}