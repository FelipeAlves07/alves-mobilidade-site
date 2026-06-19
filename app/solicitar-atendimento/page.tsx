"use client";

import Image from "next/image";
import { useState } from "react";

const whatsappNumber = "5531998458084";

export default function SolicitarAtendimentoPage() {
  const [form, setForm] = useState({ nome: "", empresa: "", whatsapp: "", email: "", servico: "", data: "", horario: "", origem: "", destino: "", observacoes: "" });
  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) { setForm({ ...form, [e.target.name]: e.target.value }); }
  function enviarWhatsApp() {
    const mensagem = `SOLICITAÇÃO DE ORÇAMENTO - ALVES MOBILIDADE EXECUTIVA\n\nNome: ${form.nome}\nEmpresa: ${form.empresa}\nWhatsApp: ${form.whatsapp}\nEmail: ${form.email}\nServiço: ${form.servico}\nData: ${form.data}\nHorário: ${form.horario}\nOrigem: ${form.origem}\nDestino: ${form.destino}\nObservações: ${form.observacoes}`;
    window.open(`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(mensagem)}`, "_blank");
  }
  const input = "rounded-2xl border border-[#d6a85f]/20 bg-black/45 px-5 py-4 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-[#d6a85f]";
  return (
    <main className="bg-[#050505] text-white">
      <section className="relative h-[560px] overflow-hidden pt-28 md:h-[720px]">
        <Image src="/images/cliente-vip.jpg" alt="Solicitar Atendimento" fill priority className="object-cover object-center opacity-65" />
        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/82 to-black/25" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_35%,rgba(214,168,95,.28),transparent_35%)]" />
        <div className="relative z-10 mx-auto flex h-full max-w-7xl items-center px-5 lg:px-8"><div className="max-w-4xl"><span className="text-xs font-black uppercase tracking-[0.28em] text-[#d6a85f]">Solicitação de atendimento</span><h1 className="mt-6 text-5xl font-black leading-tight md:text-7xl">Solicite seu transporte executivo.</h1><p className="mt-6 max-w-2xl text-lg leading-8 text-zinc-300 md:text-xl">Preencha os dados e fale diretamente com a Alves pelo WhatsApp.</p></div></div>
      </section>
      <section className="relative z-20 -mt-24 px-5 pb-20 lg:px-8">
        <div className="mx-auto max-w-5xl rounded-[2rem] border border-[#d6a85f]/18 bg-white/[0.04] p-6 shadow-[0_30px_120px_rgba(0,0,0,.45)] backdrop-blur-2xl md:p-10">
          <div className="grid gap-4 md:grid-cols-2">
            <input name="nome" placeholder="Nome" value={form.nome} onChange={handleChange} className={input} />
            <input name="empresa" placeholder="Empresa (opcional)" value={form.empresa} onChange={handleChange} className={input} />
            <input name="whatsapp" placeholder="WhatsApp" value={form.whatsapp} onChange={handleChange} className={input} />
            <input name="email" placeholder="E-mail" value={form.email} onChange={handleChange} className={input} />
            <select name="servico" value={form.servico} onChange={handleChange} className={input}><option>Selecione o serviço</option><option>Mobilidade Corporativa</option><option>Transfer Aeroportuário</option><option>Eventos</option><option>Casamentos</option><option>Viagens</option></select>
            <input type="date" name="data" value={form.data} onChange={handleChange} className={input} />
            <input type="time" name="horario" value={form.horario} onChange={handleChange} className={input} />
            <input name="origem" placeholder="Origem" value={form.origem} onChange={handleChange} className={input} />
            <input name="destino" placeholder="Destino" value={form.destino} onChange={handleChange} className={`${input} md:col-span-2`} />
            <textarea name="observacoes" placeholder="Observações" value={form.observacoes} onChange={handleChange} rows={4} className={`${input} md:col-span-2`} />
          </div>
          <button onClick={enviarWhatsApp} className="mt-7 w-full rounded-full bg-gradient-to-r from-[#f1d28b] to-[#b8863b] px-8 py-4 text-sm font-black uppercase tracking-wide text-black transition hover:-translate-y-1 md:w-auto">Solicitar pelo WhatsApp</button>
        </div>
      </section>
    </main>
  );
}
