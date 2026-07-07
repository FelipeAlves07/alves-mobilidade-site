"use client";

import { Mic } from "lucide-react";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";

type VoiceAssistantProps = {
  onCommand: (text: string) => void;
};

export default function VoiceAssistant({ onCommand }: VoiceAssistantProps) {
  const { listen, listening, lastText, error } = useSpeechRecognition();

  return (
    <>
      <button
        type="button"
        onClick={() => listen(onCommand)}
        className="
        fixed
        bottom-5
        right-5
        z-[80]
        flex
        cursor-pointer
        items-center
        gap-2
        rounded-full
        bg-gradient-to-r
        from-[#f1d28b]
        to-[#b8863b]
        px-5
        py-4
        text-sm
        font-black
        text-black
        shadow-[0_20px_70px_rgba(214,168,95,.24)]
        transition
        hover:scale-105
        "
        title="Comando de voz AME"
      >
        <Mic size={18} />
        {listening ? "Ouvindo..." : "Comando AME"}
      </button>

      {(listening || lastText || error) && (
        <div className="fixed bottom-24 right-5 z-[80] max-w-sm rounded-2xl border border-[#d6a85f]/20 bg-[#171717] p-4 text-sm text-[#f1d28b] shadow-2xl">
          {listening && <p>🎤 Ouvindo comando...</p>}
          {!listening && lastText && <p>Último comando: {lastText}</p>}
          {error && <p className="text-red-300">{error}</p>}
        </div>
      )}
    </>
  );
}