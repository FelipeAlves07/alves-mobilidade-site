"use client";

import Image from "next/image";
import { useState } from "react";
import { ArrowRight, Send } from "lucide-react";

const whatsappNumber = "5531998458084";

export default function SolicitarAtendimentoPage() {
  const [form, setForm] = useState({ nome: "", empresa: "", whatsapp: "", email: "", servico: "", data: "", horario: "", origem: "", destino: "", observacoes: "" });
  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) { setForm({ ...form, [e.target.name]: e.target.value }); }
  function enviarWhatsApp() {
    if (!form.nome.trim()) return;
    const mensagem = `SOLICITAÇÃO DE ORÇAMENTO - ALVES MOBILIDADE EXECUTIVA\n\nNome: ${form.nome}\nEmpresa: ${form.empresa}\nWhatsApp: ${form.whatsapp}\nEmail: ${form.email}\nServiço: ${form.servico}\nData: ${form.data}\nHorário: ${form.horario}\nOrigem: ${form.origem}\nDestino: ${form.destino}\nObservações: ${form.observacoes}`;
    window.open(`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(mensagem)}`, "_blank");
  }
  function handleKeyDown(e: React.KeyboardEvent) { if (e.key === "Enter" && !(e.target instanceof HTMLTextAreaElement)) enviarWhatsApp(); }

  const input = "w-full rounded-xl border border-white/10 bg-white/[0.04] px-5 py-4 text-sm text-[var(--foreground)] outline-none transition-all duration-300 focus:border-[var(--accent-50)] focus:bg-white/[0.06] focus:ring-1 focus:ring-[var(--accent-12)] placeholder:text-zinc-500";
  const label = "mb-2 block text-xs font-bold uppercase tracking-[0.12em] text-zinc-400";

  return (
    <main className="bg-[var(--bg-primary)] text-[var(--foreground)]">
      <section className="relative flex min-h-[420px] items-center overflow-hidden pt-28 md:min-h-[500px]">
        <Image src="/images/servicos-premium.jpg" alt="Solicitar Atendimento" fill priority className="object-cover object-center opacity-55 dark:opacity-40" />
        <div className="absolute inset-0 bg-gradient-to-r from-[var(--bg-primary)]/55 via-[var(--bg-primary)]/15 to-transparent dark:from-[var(--bg-primary)]/85 dark:via-[var(--bg-primary)]/50" />
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg-primary)] via-transparent to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_40%,rgba(var(--accent-rgb),0.10),transparent_50%)]" />
        <div className="relative z-10 mx-auto w-full max-w-7xl px-5 lg:px-8">
          <div className="max-w-2xl">
            <span className="text-xs font-bold uppercase tracking-[0.28em] text-[var(--accent)]">Solicitação de Orçamento</span>
            <h1 className="mt-4 text-4xl font-black leading-tight md:text-5xl lg:text-6xl">Solicite seu transporte executivo.</h1>
            <p className="mt-4 max-w-xl text-base leading-7 text-zinc-400">Preencha os dados abaixo e receba um orçamento personalizado via WhatsApp.</p>
          </div>
        </div>
      </section>

      <section className="bg-[var(--bg-elevated)] px-5 py-16 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <div className="rounded-2xl border border-[var(--border-light)] bg-[var(--bg-card)] p-8 shadow-xl md:p-10 lg:p-12">
            <div className="mb-8">
              <h2 className="text-2xl font-black">Dados da viagem</h2>
              <p className="mt-2 text-sm text-zinc-400">Todos os campos com informações precisas ajudam a oferecer o melhor atendimento.</p>
            </div>
            <div className="space-y-5">
              <div className="grid gap-5 md:grid-cols-2">
                <div>
                  <label htmlFor="nome" className={label}>Nome</label>
                  <input id="nome" name="nome" placeholder="Seu nome completo" value={form.nome} onChange={handleChange} onKeyDown={handleKeyDown} className={input} />
                </div>
                <div>
                  <label htmlFor="empresa" className={label}>Empresa</label>
                  <input id="empresa" name="empresa" placeholder="Nome da empresa (opcional)" value={form.empresa} onChange={handleChange} onKeyDown={handleKeyDown} className={input} />
                </div>
              </div>
              <div className="grid gap-5 md:grid-cols-2">
                <div>
                  <label htmlFor="whatsapp" className={label}>WhatsApp</label>
                  <input id="whatsapp" name="whatsapp" placeholder="(31) 99999-9999" value={form.whatsapp} onChange={handleChange} onKeyDown={handleKeyDown} className={input} />
                </div>
                <div>
                  <label htmlFor="email" className={label}>E-mail</label>
                  <input id="email" name="email" type="email" placeholder="seu@email.com" value={form.email} onChange={handleChange} onKeyDown={handleKeyDown} className={input} />
                </div>
              </div>
              <div className="grid gap-5 md:grid-cols-3">
                <div>
                  <label htmlFor="servico" className={label}>Tipo de Serviço</label>
                  <select id="servico" name="servico" value={form.servico} onChange={handleChange} className={input}>
                    <option value="">Selecione</option>
                    <option>Mobilidade Corporativa</option>
                    <option>Transfer Aeroportuário</option>
                    <option>Eventos</option>
                    <option>Casamentos</option>
                    <option>Viagens</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="data" className={label}>Data</label>
                  <input id="data" type="date" name="data" value={form.data} onChange={handleChange} className={input} />
                </div>
                <div>
                  <label htmlFor="horario" className={label}>Horário</label>
                  <input id="horario" type="time" name="horario" value={form.horario} onChange={handleChange} className={input} />
                </div>
              </div>
              <div className="grid gap-5 md:grid-cols-2">
                <div>
                  <label htmlFor="origem" className={label}>Origem</label>
                  <input id="origem" name="origem" placeholder="Local de embarque" value={form.origem} onChange={handleChange} onKeyDown={handleKeyDown} className={input} />
                </div>
                <div>
                  <label htmlFor="destino" className={label}>Destino</label>
                  <input id="destino" name="destino" placeholder="Local de destino" value={form.destino} onChange={handleChange} onKeyDown={handleKeyDown} className={input} />
                </div>
              </div>
              <div>
                <label htmlFor="observacoes" className={label}>Observações</label>
                <textarea id="observacoes" name="observacoes" placeholder="Informações adicionais (opcional)" value={form.observacoes} onChange={handleChange} rows={4} className={input + " resize-none"} />
              </div>
            </div>
            <div className="mt-8 flex flex-col gap-3 border-t border-white/5 pt-8 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-zinc-500">Ao enviar, você será redirecionado ao WhatsApp.</p>
              <button onClick={enviarWhatsApp} className="group inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[var(--accent)] to-[var(--secondary)] px-8 py-4 text-sm font-bold uppercase tracking-wide text-white transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl active:scale-[0.97]"
                style={{ boxShadow: "0 8px 30px rgba(var(--accent-rgb), 0.25)" }}>
                Solicitar orçamento <Send size={16} className="transition group-hover:translate-x-0.5" />
              </button>
            </div>
          </div>

          <div className="mt-10 grid gap-4 text-center sm:grid-cols-3">
            <div className="rounded-xl border border-[var(--border-subtle)] bg-white/[0.02] p-5">
              <p className="text-lg font-black text-gradient-accent">1</p>
              <p className="mt-1 text-xs font-bold uppercase tracking-[0.1em] text-zinc-500">Preencha os dados</p>
            </div>
            <div className="rounded-xl border border-[var(--border-subtle)] bg-white/[0.02] p-5">
              <p className="text-lg font-black text-gradient-accent">2</p>
              <p className="mt-1 text-xs font-bold uppercase tracking-[0.1em] text-zinc-500">Receba no WhatsApp</p>
            </div>
            <div className="rounded-xl border border-[var(--border-subtle)] bg-white/[0.02] p-5">
              <p className="text-lg font-black text-gradient-accent">3</p>
              <p className="mt-1 text-xs font-bold uppercase tracking-[0.1em] text-zinc-500">Confirme e viaje</p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
