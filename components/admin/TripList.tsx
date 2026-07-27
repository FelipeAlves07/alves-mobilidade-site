"use client";

import { CheckCircle2, Trash2 } from "lucide-react";
import type { Trip } from "@/domain/trip/types";
import { splitRoute, openGoogleMapsRoute, openWazeRoute } from "@/lib/maps";
import { openWhatsApp } from "@/lib/whatsapp";
import { messages } from "@/app/admin/constants";
import WhatsAppIcon from "./WhatsAppIcon";

export default function TripList({ trips, onFinish, onDelete }: { trips: Trip[]; onFinish: (trip: Trip) => void; onDelete?: (id: string) => void }) {
  if (!trips.length) return <p className="text-zinc-400">Nenhuma viagem cadastrada.</p>;
  return <div className="grid gap-4">{trips.map((trip) => {
    const route = splitRoute(trip.route);
    return <div key={trip.id} className="grid gap-3 rounded-xl border border-[var(--accent-10)] bg-[var(--bg-surface)] p-5 md:grid-cols-[1fr_.8fr_.8fr_.6fr_auto] md:items-center">
      <div><strong>{trip.client}</strong><p className="text-sm text-zinc-400">{trip.phone || "Sem telefone"}</p></div>
      <span>{trip.date} às {trip.time}</span>
      <button onClick={() => openGoogleMapsRoute(route.origin, route.destination)} title="Abrir rota no Google Maps" className="text-left font-bold text-[var(--accent)] underline-offset-4 hover:underline">{trip.route}</button>
      <span className="text-[var(--accent)]">R$ {trip.value}</span>
      <div className="flex flex-wrap gap-2">
        <button onClick={() => openWhatsApp(trip.phone, messages.confirmacao)} title="Confirmar no WhatsApp" className="rounded-full bg-[#25D366] p-3 text-white"><WhatsAppIcon className="h-[18px] w-[18px]" /></button>
        <button onClick={() => openGoogleMapsRoute(route.origin, route.destination)} title="Google Maps" className="rounded-full border border-[var(--accent-25)] px-3 py-2 text-xs font-bold text-[var(--accent)]">Maps</button>
        <button onClick={() => openWazeRoute(route.destination)} title="Waze" className="rounded-full border border-[var(--accent-25)] px-3 py-2 text-xs font-bold text-[var(--accent)]">Waze</button>
        {trip.status !== "Concluída" && <button onClick={() => onFinish(trip)} className="rounded-full bg-[var(--secondary)] p-3 text-white transition hover:scale-105"><CheckCircle2 size={18} /></button>}
        {onDelete && <button onClick={() => onDelete(trip.id)} className="rounded-full border border-red-500/30 p-3 text-red-300"><Trash2 size={18} /></button>}
      </div>
    </div>;
  })}</div>;
}
