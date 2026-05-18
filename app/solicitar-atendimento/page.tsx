"use client";

import Image from "next/image";
import { useState } from "react";

const whatsappNumber = "5531998458084";

export default function SolicitarAtendimentoPage() {
  const [form, setForm] = useState({
    nome: "",
    empresa: "",
    whatsapp: "",
    email: "",
    servico: "",
    data: "",
    horario: "",
    origem: "",
    destino: "",
    observacoes: "",
  });

  function handleChange(
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  }

  function enviarWhatsApp() {
    const mensagem = `
SOLICITAÇÃO DE ORÇAMENTO

Nome: ${form.nome}
Empresa: ${form.empresa}
WhatsApp: ${form.whatsapp}
Email: ${form.email}
Serviço: ${form.servico}
Data: ${form.data}
Horário: ${form.horario}
Origem: ${form.origem}
Destino: ${form.destino}
Observações: ${form.observacoes}
    `;

    window.open(
      `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(mensagem)}`,
      "_blank"
    );
  }

  return (
    <main className="bg-slate-50">
      <section className="relative h-[520px] md:h-[700px] overflow-hidden">
        <Image
          src="/images/cliente-vip.jpg"
          alt="Solicitar Atendimento"
          fill
          priority
          className="object-cover object-center"
        />

        <div className="absolute inset-0 bg-slate-950/60" />

        <div className="relative z-10 mx-auto flex h-full max-w-7xl items-center px-5 lg:px-8">
          <div className="max-w-4xl">
            <div className="mb-5 inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-medium text-white backdrop-blur md:text-sm">
              Solicitação de Atendimento
            </div>

            <h1 className="text-4xl font-bold leading-tight text-white md:text-7xl">
              Solicite seu atendimento
            </h1>

            <p className="mt-5 max-w-2xl text-base leading-7 text-slate-200 md:mt-8 md:text-xl md:leading-9">
              Empresas e clientes particulares.
            </p>
          </div>
        </div>
      </section>

      <section className="-mt-20 md:-mt-28 relative z-20 pb-16">
        <div className="mx-auto max-w-5xl px-5 lg:px-8">
          <div className="rounded-3xl bg-white p-6 shadow-2xl md:p-10">
            <div className="grid gap-4 md:grid-cols-2">
              <input
                name="nome"
                placeholder="Nome"
                value={form.nome}
                onChange={handleChange}
                className="rounded-xl border px-4 py-3 text-sm"
              />

              <input
                name="empresa"
                placeholder="Empresa (opcional)"
                value={form.empresa}
                onChange={handleChange}
                className="rounded-xl border px-4 py-3 text-sm"
              />

              <input
                name="whatsapp"
                placeholder="WhatsApp"
                value={form.whatsapp}
                onChange={handleChange}
                className="rounded-xl border px-4 py-3 text-sm"
              />

              <input
                name="email"
                placeholder="Email"
                value={form.email}
                onChange={handleChange}
                className="rounded-xl border px-4 py-3 text-sm"
              />

              <select
                name="servico"
                value={form.servico}
                onChange={handleChange}
                className="rounded-xl border px-4 py-3 text-sm"
              >
                <option>Selecione o serviço</option>
                <option>Mobilidade Corporativa</option>
                <option>Transfer Aeroportuário</option>
                <option>Eventos</option>
                <option>Atendimento Particular</option>
              </select>

              <input
                type="date"
                name="data"
                value={form.data}
                onChange={handleChange}
                className="rounded-xl border px-4 py-3 text-sm"
              />

              <input
                type="time"
                name="horario"
                value={form.horario}
                onChange={handleChange}
                className="rounded-xl border px-4 py-3 text-sm"
              />

              <input
                name="origem"
                placeholder="Origem"
                value={form.origem}
                onChange={handleChange}
                className="rounded-xl border px-4 py-3 text-sm"
              />

              <input
                name="destino"
                placeholder="Destino"
                value={form.destino}
                onChange={handleChange}
                className="rounded-xl border px-4 py-3 text-sm md:col-span-2"
              />

              <textarea
                name="observacoes"
                placeholder="Observações"
                value={form.observacoes}
                onChange={handleChange}
                rows={4}
                className="rounded-xl border px-4 py-3 text-sm md:col-span-2"
              />
            </div>

            <button
              onClick={enviarWhatsApp}
              className="mt-6 w-full rounded-xl bg-slate-950 px-6 py-3 text-sm font-semibold text-white transition hover:scale-105 md:w-auto md:text-base"
            >
              Solicitar Atendimento
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}