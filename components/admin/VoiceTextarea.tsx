"use client";

import { Mic } from "lucide-react";
import { startVoiceCapture } from "@/lib/voice";

export default function VoiceTextarea({ value, onValue, placeholder = "", className = "" }: { value: string; onValue: (value: string) => void; placeholder?: string; className?: string }) {
  return (
    <div className={`relative ${className}`}>
      <textarea value={value} onChange={(e) => onValue(e.target.value)} placeholder={placeholder} className="input-admin min-h-24 pr-12" />
      <button type="button" onClick={() => startVoiceCapture((text) => onValue(value ? `${value} ${text}` : text))} title="Falar e preencher" className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full border border-[var(--accent-20)] bg-[var(--bg-surface)] text-[var(--accent)] hover:bg-[var(--accent)] hover:text-white">
        <Mic size={16} />
      </button>
    </div>
  );
}
