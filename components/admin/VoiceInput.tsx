"use client";

import { Mic } from "lucide-react";
import { startVoiceCapture } from "@/lib/voice";

export default function VoiceInput({ value, onValue, placeholder = "", className = "", type = "text" }: { value: string; onValue: (value: string) => void; placeholder?: string; className?: string; type?: string }) {
  return (
    <div className={`relative ${className}`}>
      <input value={value} onChange={(e) => onValue(e.target.value)} type={type} placeholder={placeholder} className="input-admin pr-12" />
      <button type="button" onClick={() => startVoiceCapture((text) => onValue(value ? `${value} ${text}` : text))} title="Falar e preencher" className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-[var(--accent-20)] bg-[var(--bg-surface)] text-[var(--accent)] hover:bg-[var(--accent)] hover:text-white">
        <Mic size={16} />
      </button>
    </div>
  );
}
