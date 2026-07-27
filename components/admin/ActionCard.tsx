export default function ActionCard({ title, text, onDone, onSend }: { title: string; text: string; onDone: () => void; onSend?: () => void }) {
  return (
    <div className="rounded-xl border border-[var(--accent-8)] bg-[var(--bg-surface)] p-4 transition hover:border-[var(--accent-18)] hover:bg-[var(--bg-card-hover)]">
      <h3 className="text-sm font-bold">{title}</h3>
      <p className="mt-1.5 text-xs text-zinc-500">{text}</p>
      <div className="mt-3 flex gap-2">
        {onSend && (
          <button onClick={onSend} className="inline-flex cursor-pointer items-center gap-1 rounded-lg bg-[#25D366] px-3 py-1.5 text-[10px] font-bold uppercase text-white transition hover:brightness-110 active:scale-[0.97]">WhatsApp</button>
        )}
        <button onClick={onDone} className="inline-flex cursor-pointer items-center gap-1 rounded-lg bg-[var(--secondary)] px-3 py-1.5 text-[10px] font-bold uppercase text-white transition hover:bg-[var(--accent)] active:scale-[0.97]">Concluir</button>
      </div>
    </div>
  );
}
