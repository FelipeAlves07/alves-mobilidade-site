export default function ActionCard({ title, text, onDone, onSend }: { title: string; text: string; onDone: () => void; onSend?: () => void }) {
  return (
    <div className="group rounded-xl border border-[var(--accent-8)] bg-gradient-to-b from-[var(--bg-surface)] to-transparent p-4 transition-all duration-300 hover:border-[var(--accent-25)] hover:bg-[var(--bg-card-hover)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-bold truncate">{title}</h3>
          <p className="mt-1 text-xs text-zinc-500 line-clamp-2">{text}</p>
        </div>
      </div>
      <div className="mt-3 flex gap-2">
        {onSend && (
          <button onClick={onSend} className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-[#25D366]/90 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-white transition-all hover:bg-[#25D366] hover:shadow-md active:scale-[0.97]">
            <svg viewBox="0 0 32 32" className="h-3 w-3" fill="currentColor"><path d="M16.04 3C8.88 3 3.06 8.8 3.06 15.92c0 2.28.6 4.5 1.74 6.45L3 29l6.82-1.78a13 13 0 0 0 6.22 1.58h.01C23.2 28.8 29 23 29 15.88 29 8.8 23.18 3 16.04 3Zm0 23.6h-.01a10.8 10.8 0 0 1-5.5-1.5l-.4-.24-4.04 1.06 1.08-3.94-.26-.4a10.7 10.7 0 0 1-1.65-5.66c0-5.9 4.84-10.72 10.78-10.72 2.88 0 5.58 1.12 7.62 3.15a10.62 10.62 0 0 1 3.16 7.53c0 5.9-4.84 10.72-10.78 10.72Z"/></svg>
            WhatsApp
          </button>
        )}
        <button onClick={onDone} className="inline-flex cursor-pointer items-center gap-1 rounded-lg bg-[var(--secondary)]/90 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-white transition-all hover:bg-[var(--accent)] hover:shadow-md active:scale-[0.97]">Concluir</button>
      </div>
    </div>
  );
}
