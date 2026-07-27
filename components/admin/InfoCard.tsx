"use client";

import { useState } from "react";

export default function InfoCard({ title, text, onCopy }: { title: string; text: string; onCopy?: () => void }) {
  const [copied, setCopied] = useState(false);
  function handleCopy() {
    onCopy?.();
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }
  return <div className="rounded-xl border border-[var(--accent-15)] bg-[var(--bg-card)] p-6"><h3 className="text-xl font-black capitalize">{title}</h3><p className="mt-4 leading-7 text-zinc-400">{text}</p>{onCopy && <button onClick={handleCopy} className={`mt-5 rounded-xl px-5 py-3 text-sm font-bold ${copied ? "bg-emerald-400 text-black" : "border border-[var(--accent-25)] text-[var(--accent)]"}`}>{copied ? "Copiado ✓" : "Copiar mensagem"}</button>}</div>;
}
