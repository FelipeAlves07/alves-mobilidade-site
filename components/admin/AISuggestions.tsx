import { CheckCircle2, Lightbulb, MessageCircle } from "lucide-react";
import type { Lead } from "@/domain/lead/types";
import type { MessageKey } from "@/domain/marketing/types";
import { buildAiRecommendations } from "@/modules/ai/services/ai.service";
import { messages } from "@/app/admin/constants";
import { openWhatsApp } from "@/lib/whatsapp";

interface AISuggestionsProps {
  leads?: Lead[];
  pending: number;
  trips: number;
  credits: number;
  today?: string;
  onSendLeadMessage?: (lead: Lead, key: MessageKey) => void;
  onCompleteAction?: (lead: Lead) => void;
}

// "IA da Alves": cada recomendação que exige ação mostra um botão real
// (abrir WhatsApp do cliente ou concluir a etapa), não apenas texto.
export default function AISuggestions({
  leads = [], pending, trips, credits, today = "",
  onSendLeadMessage, onCompleteAction,
}: AISuggestionsProps) {
  const items = buildAiRecommendations(leads, today, { pending, trips, credits });

  return (
    <div className="grid gap-4">
      {items.map((item) => (
        <div key={item.id} className="flex gap-3 rounded-xl border border-[var(--accent-10)] bg-[var(--bg-surface)] p-5">
          {item.lead
            ? <Lightbulb className="shrink-0 text-amber-300" />
            : <CheckCircle2 className="shrink-0 text-[var(--accent)]" />}
          <div className="min-w-0 flex-1">
            <span className="block text-sm leading-6 text-zinc-300">{item.text}</span>
            {item.lead && (
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  onClick={() => {
                    const key = item.messageKey || "apresentacao";
                    if (onSendLeadMessage) {
                      onSendLeadMessage(item.lead as Lead, key);
                    } else {
                      openWhatsApp((item.lead as Lead).phone, messages[key]);
                    }
                  }}
                  className="cursor-pointer rounded-lg bg-[#25D366] px-3 py-2 text-[11px] font-bold text-white transition hover:brightness-110"
                >
                  <MessageCircle size={13} className="inline" /> WhatsApp
                </button>
                {onCompleteAction && (
                  <button
                    onClick={() => onCompleteAction(item.lead as Lead)}
                    className="cursor-pointer rounded-lg bg-[var(--secondary)] px-3 py-2 text-[11px] font-bold text-white transition hover:bg-[var(--accent)]"
                  >
                    <CheckCircle2 size={13} className="inline" /> Concluir etapa
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
