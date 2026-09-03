"use client";

import { useMemo, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import type { Lead } from "@/domain/lead/types";

interface ClientSelectProps {
  leads: Lead[];
  value: string;
  onSelect: (lead: Lead) => void;
  onClear?: () => void;
  placeholder?: string;
  className?: string;
}

// Busca/autocomplete reutilizável de clientes existentes: digita parte
// do nome (ex.: "Ric") e seleciona, recuperando os dados cadastrados.
export default function ClientSelect({
  leads, value, onSelect, onClear, placeholder = "Buscar cliente", className = "",
}: ClientSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (!q) return leads.slice(0, 8);
    return leads
      .filter((lead) =>
        `${lead.name} ${lead.phone}`
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .includes(q),
      )
      .slice(0, 8);
  }, [leads, query]);

  function handleFocus() { setOpen(true); }
  function handleBlur() { window.setTimeout(() => setOpen(false), 150); }
  function pick(lead: Lead) {
    onSelect(lead);
    setQuery("");
    setOpen(false);
  }

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <div className="relative">
        <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
        <input
          value={query || value}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={value || placeholder}
          className="input-admin pl-9 pr-8"
        />
        {onClear && value && !query && (
          <button
            type="button"
            onClick={onClear}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 transition hover:text-white"
            title="Limpar"
          >
            <X size={13} />
          </button>
        )}
      </div>
      {open && (
        <div className="absolute z-50 mt-1 max-h-64 w-full overflow-auto rounded-xl border border-[var(--accent-15)] bg-[var(--bg-card)] shadow-2xl">
          {filtered.length === 0 && <p className="px-4 py-3 text-sm text-zinc-500">Nenhum cliente encontrado.</p>}
          {filtered.map((lead) => (
            <button
              key={lead.id}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => pick(lead)}
              className="block w-full cursor-pointer px-4 py-3 text-left transition hover:bg-[var(--accent-10)]"
            >
              <span className="block text-sm font-bold">{lead.name || "Sem nome"}</span>
              <span className="block text-xs text-zinc-500">{lead.phone || "Sem telefone"}{lead.type ? ` • ${lead.type}` : ""}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
