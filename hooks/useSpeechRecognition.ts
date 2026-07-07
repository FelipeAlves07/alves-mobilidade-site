"use client";

import { useState } from "react";
import { startVoiceCapture } from "@/lib/voice";

export function useSpeechRecognition() {
  const [listening, setListening] = useState(false);
  const [lastText, setLastText] = useState("");
  const [error, setError] = useState("");

  function listen(onText?: (text: string) => void) {
    setListening(true);
    setError("");

    startVoiceCapture(
      (text) => {
        setLastText(text);
        setListening(false);
        if (onText) onText(text);
      },
      (message) => {
        setError(message);
        setListening(false);
      }
    );
  }

  return {
    listen,
    listening,
    lastText,
    error,
  };
}