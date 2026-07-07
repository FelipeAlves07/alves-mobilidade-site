"use client";

import { useState } from "react";

type Props = {
  text: string;
  label?: string;
};

export default function CopyButton({ text, label = "Copiar" }: Props) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="cursor-pointer rounded-full border border-[#d6a85f]/25 px-5 py-3 text-xs font-black text-[#f1d28b] transition hover:bg-[#d6a85f] hover:text-black"
    >
      {copied ? "Copiado ✓" : label}
    </button>
  );
}