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
      className="cursor-pointer rounded-xl border border-[var(--accent-25)] px-5 py-3 text-xs font-bold text-[var(--accent)] transition hover:bg-[var(--accent)] hover:text-white"
    >
      {copied ? "Copiado ✓" : label}
    </button>
  );
}