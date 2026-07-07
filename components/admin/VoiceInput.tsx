"use client";

import { Mic } from "lucide-react";
import { startVoiceCapture } from "@/lib/voice";

type VoiceInputProps = {
  value: string;
  onValue: (value: string) => void;
  placeholder?: string;
  className?: string;
  type?: string;
};

export default function VoiceInput({
  value,
  onValue,
  placeholder = "",
  className = "",
  type = "text",
}: VoiceInputProps) {
  return (
    <div className={`relative ${className}`}>
      <input
        value={value}
        onChange={(event) => onValue(event.target.value)}
        type={type}
        placeholder={placeholder}
        className="input-admin pr-12"
      />

      <button
        type="button"
        onClick={() =>
          startVoiceCapture((text) => onValue(value ? `${value} ${text}` : text))
        }
        title="Falar e preencher"
        className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-[#d6a85f]/20 bg-[#202020] text-[#f1d28b] transition hover:bg-[#d6a85f] hover:text-black"
      >
        <Mic size={16} />
      </button>
    </div>
  );
}