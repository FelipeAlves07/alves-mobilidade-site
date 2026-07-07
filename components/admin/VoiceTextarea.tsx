"use client";

import { Mic } from "lucide-react";
import { startVoiceCapture } from "@/lib/voice";

type VoiceTextareaProps = {
  value: string;
  onValue: (value: string) => void;
  placeholder?: string;
  className?: string;
};

export default function VoiceTextarea({
  value,
  onValue,
  placeholder = "",
  className = "",
}: VoiceTextareaProps) {
  return (
    <div className={`relative ${className}`}>
      <textarea
        value={value}
        onChange={(event) => onValue(event.target.value)}
        placeholder={placeholder}
        className="input-admin min-h-24 pr-12"
      />

      <button
        type="button"
        onClick={() =>
          startVoiceCapture((text) => onValue(value ? `${value} ${text}` : text))
        }
        title="Falar e preencher"
        className="absolute right-3 top-3 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-[#d6a85f]/20 bg-[#202020] text-[#f1d28b] transition hover:bg-[#d6a85f] hover:text-black"
      >
        <Mic size={16} />
      </button>
    </div>
  );
}