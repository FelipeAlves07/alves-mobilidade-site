export function startVoiceCapture(onText: (text: string) => void, onError?: (message: string) => void) {
  if (typeof window === "undefined") return;

  const SpeechRecognition =
    (window as any).SpeechRecognition ||
    (window as any).webkitSpeechRecognition;

  if (!SpeechRecognition) {
    const message = "Seu navegador não suporta reconhecimento de voz. Use o Chrome no Android ou no computador.";
    if (onError) onError(message);
    else alert(message);
    return;
  }

  const recognition = new SpeechRecognition();

  recognition.lang = "pt-BR";
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;
  recognition.continuous = false;

  recognition.onresult = (event: any) => {
    const text = event?.results?.[0]?.[0]?.transcript ?? "";
    if (text) onText(text);
  };

  recognition.onerror = () => {
    const message = "Não consegui ouvir. Tente novamente falando perto do microfone.";
    if (onError) onError(message);
    else alert(message);
  };

  recognition.start();
}

export function normalizeSpokenAddress(text: string) {
  return text
    .replace(/^viagem\s+(da|de|do)\s+/i, "")
    .replace(/^corrida\s+(da|de|do)\s+/i, "")
    .replace(/^transfer\s+(da|de|do)\s+/i, "")
    .replace(/^orçamento\s+(da|de|do)\s+/i, "")
    .replace(/^orcamento\s+(da|de|do)\s+/i, "")
    .replace(/\b(bh|belo horizonte)\b/gi, "Belo Horizonte - MG")
    .replace(/\bconfins\b/gi, "Aeroporto Internacional de Confins")
    .replace(/\bcnf\b/gi, "Aeroporto Internacional de Confins")
    .trim();
}

export function parseSpokenRoute(text: string) {
  const cleaned = normalizeSpokenAddress(text);

  const parts = cleaned
    .split(/\s+(?:para|pra|até|ate)\s+/i)
    .map((part) => part.trim())
    .filter(Boolean);

  return {
    origin: parts[0] || "Belo Horizonte - MG",
    destination: parts[1] || "Aeroporto Internacional de Confins",
  };
}

export function extractNumberFromSpeech(text: string, fallback = 0) {
  const normalized = text.toLowerCase();

  const map: Record<string, number> = {
    um: 1,
    uma: 1,
    dois: 2,
    duas: 2,
    três: 3,
    tres: 3,
    quatro: 4,
    cinco: 5,
    seis: 6,
    sete: 7,
    oito: 8,
    nove: 9,
    dez: 10,
  };

  const digit = normalized.match(/\d+/);
  if (digit) return Number(digit[0]);

  for (const [word, value] of Object.entries(map)) {
    if (normalized.includes(word)) return value;
  }

  return fallback;
}