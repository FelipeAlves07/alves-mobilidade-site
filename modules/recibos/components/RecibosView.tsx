"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Download,
  Eye,
  FileText,
  Pencil,
  Plus,
  Receipt,
  Search,
  Trash2,
  X,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
} from "lucide-react";
import Panel from "@/components/admin/Panel";
import { money } from "@/lib/quotes";
import type { Receipt as ReceiptType, ReceiptForm, ReceiptPatch, PaymentMethod } from "@/domain/receipt/types";
import { receiptToPdfData } from "@/domain/receipt/mapper";
import { validateReceiptForm } from "@/domain/receipt/validation";
import {
  downloadReceiptPdf,
  previewReceiptPdf,
} from "@/modules/recibos/services/recibo-pdf-browser.service";

const PAYMENT_METHODS: PaymentMethod[] = [
  "Pix",
  "Dinheiro",
  "Cartão de crédito",
  "Cartão de débito",
  "Transferência",
  "Outro",
];

const SERVICES = [
  "Translado aeroportuário",
  "Corrida comum",
  "Viagem rodoviária",
  "Evento corporativo",
  "Consultoria",
  "Outro",
];

function formatDateBR(iso: string): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return d && m && y ? `${d}/${m}/${y}` : iso;
}

function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function buildObservationsFromTrip(trip: { client: string; route: string; date: string }): string {
  const [origin = "", destination = ""] = trip.route.includes(" → ") ? trip.route.split(" → ") : [trip.route, trip.route];
  const dateBR = formatDateBR(trip.date);
  return `Viagem de ${trip.client}, partindo de ${origin}, com destino a ${destination}, realizada na data de ${dateBR}.`;
}

function formatMoneyInput(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (!digits) return "";
  const num = parseInt(digits, 10);
  const reais = (num / 100).toFixed(2);
  return reais.replace(".", ",").replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

function parseMoneyInput(formatted: string): number {
  const clean = formatted.replace(/\./g, "").replace(",", ".");
  const num = parseFloat(clean);
  return isNaN(num) ? 0 : num;
}

function MoneyInput({
  value,
  onChange,
  placeholder,
  error,
}: {
  value: number;
  onChange: (v: number) => void;
  placeholder?: string;
  error?: string;
}) {
  const [display, setDisplay] = useState(value > 0 ? formatMoneyInput(String(Math.round(value * 100))) : "");

  useEffect(() => {
    if (value > 0) {
      setDisplay(formatMoneyInput(String(Math.round(value * 100))));
    }
  }, [value]);

  return (
    <div>
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-zinc-500">
          R$
        </span>
        <input
          value={display}
          onChange={(e) => {
            const formatted = formatMoneyInput(e.target.value);
            setDisplay(formatted);
            onChange(parseMoneyInput(formatted));
          }}
          onBlur={() => {
            if (display) {
              setDisplay(formatMoneyInput(String(Math.round(parseMoneyInput(display) * 100))));
            }
          }}
          placeholder={placeholder || "0,00"}
          className={`input-admin w-full pl-10 ${error ? "border-red-500" : ""}`}
        />
      </div>
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
    </div>
  );
}

interface ReceiptFormState {
  number: string;
  tripId?: string;
  clientName: string;
  clientPhone: string;
  serviceDate: string;
  serviceDescription: string;
  paymentMethod: PaymentMethod | "";
  value: number;
  observations: string;
}

const EMPTY_FORM: ReceiptFormState = {
  number: "",
  clientName: "",
  clientPhone: "",
  serviceDate: toISODate(new Date()),
  serviceDescription: "",
  paymentMethod: "",
  value: 0,
  observations: "",
};

interface RecibosViewProps {
  receipts: ReceiptType[];
  loading: boolean;
  error: string | null;
  createReceipt: (form: ReceiptForm) => Promise<ReceiptType>;
  updateReceipt: (id: string, patch: ReceiptPatch) => Promise<void>;
  deleteReceipt: (id: string) => Promise<void>;
  getNextNumber: () => Promise<string>;
  initialForm?: Partial<ReceiptFormState> | null;
  onClearInitialForm?: () => void;
}

export default function RecibosView({
  receipts,
  loading,
  error,
  createReceipt,
  updateReceipt,
  deleteReceipt,
  getNextNumber,
  initialForm,
  onClearInitialForm,
}: RecibosViewProps) {
  const [query, setQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingReceipt, setEditingReceipt] = useState<ReceiptType | null>(null);
  const [form, setForm] = useState<ReceiptFormState>(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<{ field: string; message: string }[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [successReceipt, setSuccessReceipt] = useState<ReceiptType | null>(null);

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [nextNumber, setNextNumber] = useState<string>("...");
  const formBodyRef = useRef<HTMLDivElement>(null);

  const loadNextNumber = useCallback(async () => {
    try {
      const n = await getNextNumber();
      setNextNumber(n);
    } catch {
      setNextNumber("...");
    }
  }, [getNextNumber]);

  useEffect(() => {
    if (initialForm) {
      setEditingReceipt(null);
      setForm((prev) => ({ ...prev, ...initialForm }));
      setFormErrors([]);
      setSubmitError(null);
      setSuccessReceipt(null);
      setShowForm(true);
      requestAnimationFrame(() => formBodyRef.current?.scrollTo({ top: 0, behavior: "auto" }));
      onClearInitialForm?.();
    }
  }, [initialForm]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (showForm && !editingReceipt && !successReceipt) {
      loadNextNumber();
    }
  }, [showForm, editingReceipt, successReceipt, loadNextNumber]);

  const filtered = useMemo(() => {
    if (!query.trim()) return receipts;
    const q = query.toLowerCase();
    return receipts.filter(
      (r) =>
        r.number.toLowerCase().includes(q) ||
        r.clientName.toLowerCase().includes(q) ||
        (r.clientPhone && r.clientPhone.includes(q)) ||
        r.serviceDescription.toLowerCase().includes(q),
    );
  }, [receipts, query]);

  function openNewForm() {
    setEditingReceipt(null);
    setForm({ ...EMPTY_FORM, serviceDate: toISODate(new Date()) });
    setFormErrors([]);
    setSubmitError(null);
    setSuccessReceipt(null);
    setShowForm(true);
    requestAnimationFrame(() => formBodyRef.current?.scrollTo({ top: 0, behavior: "auto" }));
  }

  function openEditForm(receipt: ReceiptType) {
    setEditingReceipt(receipt);
    setForm({
      number: receipt.number,
      tripId: receipt.tripId,
      clientName: receipt.clientName,
      clientPhone: receipt.clientPhone || "",
      serviceDate: receipt.serviceDate,
      serviceDescription: receipt.serviceDescription,
      paymentMethod: receipt.paymentMethod,
      value: receipt.value,
      observations: receipt.observations || "",
    });
    setFormErrors([]);
    setSubmitError(null);
    setSuccessReceipt(null);
    setShowForm(true);
    requestAnimationFrame(() => formBodyRef.current?.scrollTo({ top: 0, behavior: "auto" }));
  }

  function closeForm() {
    setShowForm(false);
    setEditingReceipt(null);
    setFormErrors([]);
    setSubmitError(null);
    setSuccessReceipt(null);
  }

  function validateForm(): boolean {
    const receiptForm: ReceiptForm = {
      number: editingReceipt ? editingReceipt.number : "",
      tripId: form.tripId,
      clientName: form.clientName,
      clientPhone: form.clientPhone || undefined,
      serviceDate: form.serviceDate,
      serviceDescription: form.serviceDescription,
      paymentMethod: form.paymentMethod as PaymentMethod,
      value: form.value,
      observations: form.observations || undefined,
    };
    const result = validateReceiptForm(receiptForm);
    setFormErrors(result.errors);
    return result.valid;
  }

  async function handleEmitir() {
    if (!validateForm()) return;
    if (submitting) return;
    setSubmitting(true);
    setSubmitError(null);

    try {
      const receiptForm: ReceiptForm = {
        number: editingReceipt ? editingReceipt.number : "",
        tripId: form.tripId,
        clientName: form.clientName,
        clientPhone: form.clientPhone || undefined,
        serviceDate: form.serviceDate,
        serviceDescription: form.serviceDescription,
        paymentMethod: form.paymentMethod as PaymentMethod,
        value: form.value,
        observations: form.observations || undefined,
      };

      if (editingReceipt) {
        const patch: ReceiptPatch = { ...receiptForm, number: editingReceipt.number };
        await updateReceipt(editingReceipt.id, patch);
        setSuccessReceipt({ ...editingReceipt, ...receiptForm } as ReceiptType);
      } else {
        const created = await createReceipt(receiptForm);
        setSuccessReceipt(created);
      }
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Erro ao salvar recibo. Verifique sua conexão.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handlePreview() {
    setPreviewLoading(true);
    try {
      const data = {
        number: editingReceipt ? editingReceipt.number : nextNumber,
        clientName: form.clientName || "Cliente",
        date: formatDateBR(form.serviceDate || toISODate(new Date())),
        service: form.serviceDescription || "Serviço",
        paymentMethod: form.paymentMethod || "Pix",
        value: form.value,
        observations: form.observations || "",
      };
      const url = await previewReceiptPdf(data);
      setPreviewUrl(url);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Erro ao gerar preview");
    } finally {
      setPreviewLoading(false);
    }
  }

  function closePreview() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
  }

  async function handleViewExisting(receipt: ReceiptType) {
    setPreviewLoading(true);
    try {
      const url = await previewReceiptPdf(receiptToPdfData(receipt));
      setPreviewUrl(url);
    } catch {
      setSubmitError("Erro ao gerar preview do recibo");
    } finally {
      setPreviewLoading(false);
    }
  }

  async function handleDownloadExisting(receipt: ReceiptType) {
    try {
      await downloadReceiptPdf(receiptToPdfData(receipt), receipt.clientName);
    } catch {
      setSubmitError("Erro ao baixar recibo");
    }
  }

  async function handleDownloadSuccess() {
    if (!successReceipt) return;
    try {
      await downloadReceiptPdf(receiptToPdfData(successReceipt), successReceipt.clientName);
    } catch {
      setSubmitError("Erro ao baixar PDF");
    }
  }

  async function handleViewSuccess() {
    if (!successReceipt) return;
    setPreviewLoading(true);
    try {
      const url = await previewReceiptPdf(receiptToPdfData(successReceipt));
      setPreviewUrl(url);
    } catch {
      setSubmitError("Erro ao gerar preview");
    } finally {
      setPreviewLoading(false);
    }
  }

  async function handleDelete(id: string, number: string) {
    try {
      await deleteReceipt(id);
      setDeletingId(null);
    } catch {
      setSubmitError("Erro ao excluir recibo");
    }
  }

  function getFieldError(field: string): string | undefined {
    return formErrors.find((e) => e.field === field)?.message;
  }

  const isEmpty = !loading && receipts.length === 0;
  const noResults = !loading && receipts.length > 0 && filtered.length === 0;
  const isSupabaseMissing = error?.includes("Could not find the table") || error?.includes("PGRST205");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-black">
            <Receipt size={22} className="text-[var(--accent)]" /> Recibos
          </h2>
          <p className="mt-1 text-xs text-zinc-500">
            {receipts.length} recibo{receipts.length !== 1 ? "s" : ""} emitido{receipts.length !== 1 ? "s" : ""}
          </p>
        </div>
        <button onClick={openNewForm} className="btn-primary flex items-center gap-2 text-sm">
          <Plus size={16} /> Novo recibo
        </button>
      </div>

      <div className="relative">
        <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por número, cliente, telefone ou serviço..."
          className="input-admin w-full pl-10"
        />
      </div>

      {loading && (
        <div className="flex items-center justify-center gap-2 py-12 text-sm text-zinc-500">
          <Loader2 size={18} className="animate-spin" /> Carregando recibos...
        </div>
      )}

      {error && !loading && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-5 py-4">
          <div className="flex items-center gap-2 text-sm text-red-300">
            <AlertTriangle size={16} />
            <span className="font-bold">Não foi possível carregar os recibos.</span>
          </div>
          <p className="mt-2 text-xs text-red-400/70">{error}</p>
          {isSupabaseMissing && (
            <div className="mt-3 rounded-lg border border-amber-500/20 bg-amber-500/10 p-3">
              <p className="text-xs font-bold text-amber-300">Migration não aplicada</p>
              <p className="mt-1 text-xs text-amber-400/70">
                A tabela receipts precisa ser criada no Supabase. Abra o SQL Editor no Dashboard e execute o conteudo de:
              </p>
              <code className="mt-1 block rounded bg-black/30 p-2 text-[10px] text-amber-300/80">
                supabase/migrations/20260908_receipts.sql
              </code>
            </div>
          )}
          <button
            onClick={() => window.location.reload()}
            className="mt-3 flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-zinc-400 transition hover:bg-white/10"
          >
            <RotateCcw size={12} /> Tentar novamente
          </button>
        </div>
      )}

      {isEmpty && !error && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[var(--accent-15)] bg-[var(--bg-card)] py-16 text-center">
          <FileText size={40} className="mb-3 text-zinc-600" />
          <p className="text-sm font-bold text-zinc-400">Nenhum recibo emitido</p>
          <p className="mt-1 text-xs text-zinc-600">Clique em &quot;Novo recibo&quot; para começar</p>
        </div>
      )}

      {noResults && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[var(--accent-15)] bg-[var(--bg-card)] py-12 text-center">
          <Search size={32} className="mb-3 text-zinc-600" />
          <p className="text-sm text-zinc-500">Nenhum resultado para &quot;{query}&quot;</p>
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <Panel title="Histórico">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">
                  <th className="pb-3 pr-4">Recibo</th>
                  <th className="pb-3 pr-4">Cliente</th>
                  <th className="hidden pb-3 pr-4 md:table-cell">Data</th>
                  <th className="hidden pb-3 pr-4 lg:table-cell">Serviço</th>
                  <th className="pb-3 pr-4">Valor</th>
                  <th className="hidden pb-3 pr-4 md:table-cell">Pagamento</th>
                  <th className="pb-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id} className="border-b border-white/5 transition hover:bg-white/[0.02]">
                    <td className="py-3 pr-4 font-mono text-xs font-bold text-[var(--accent)]">{r.number}</td>
                    <td className="py-3 pr-4">
                      <p className="truncate font-medium">{r.clientName}</p>
                      {r.clientPhone && <p className="text-xs text-zinc-500">{r.clientPhone}</p>}
                    </td>
                    <td className="hidden py-3 pr-4 text-xs text-zinc-400 md:table-cell">{formatDateBR(r.serviceDate)}</td>
                    <td className="hidden py-3 pr-4 text-xs text-zinc-400 lg:table-cell">{r.serviceDescription}</td>
                    <td className="py-3 pr-4 text-xs font-bold">{money(r.value)}</td>
                    <td className="hidden py-3 pr-4 text-xs text-zinc-400 md:table-cell">{r.paymentMethod}</td>
                    <td className="py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleViewExisting(r)}
                          title="Visualizar"
                          className="rounded-lg p-2 text-zinc-400 transition hover:bg-white/5 hover:text-[var(--accent)]"
                        >
                          <Eye size={15} />
                        </button>
                        <button
                          onClick={() => handleDownloadExisting(r)}
                          title="Baixar PDF"
                          className="rounded-lg p-2 text-zinc-400 transition hover:bg-white/5 hover:text-[var(--accent)]"
                        >
                          <Download size={15} />
                        </button>
                        <button
                          onClick={() => openEditForm(r)}
                          title="Editar"
                          className="rounded-lg p-2 text-zinc-400 transition hover:bg-white/5 hover:text-yellow-400"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          onClick={() => setDeletingId(r.id)}
                          title="Excluir"
                          className="rounded-lg p-2 text-zinc-400 transition hover:bg-white/5 hover:text-red-400"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}

      {showForm && createPortal(
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/35 backdrop-blur-[2px] p-4"
          onClick={closeForm}
        >
          <div
            className="flex w-full max-w-[620px] flex-col overflow-hidden rounded-2xl border border-[var(--accent-20)] bg-[var(--bg-card)] shadow-2xl animate-enter-up"
            style={{ maxHeight: "calc(100dvh - 32px)" }}
            onClick={(e) => e.stopPropagation()}
          >
            {successReceipt ? (
              <>
                <div className="flex-none border-b border-white/10 px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/15">
                        <CheckCircle2 size={20} className="text-emerald-400" />
                      </div>
                      <div>
                        <p className="text-sm font-bold">Recibo emitido com sucesso</p>
                        <p className="text-xs text-zinc-500">
                          <span className="font-bold text-[var(--accent)]">{successReceipt.number}</span>
                        </p>
                      </div>
                    </div>
                    <button onClick={closeForm} className="rounded-lg p-1 text-zinc-500 transition hover:text-white">
                      <X size={20} />
                    </button>
                  </div>
                </div>
                <div className="flex flex-col items-center gap-4 px-6 py-8">
                  <p className="text-center text-sm text-zinc-400">
                    {successReceipt.clientName} — {money(successReceipt.value)}
                  </p>
                  <div className="flex w-full flex-col gap-2 sm:flex-row">
                    <button
                      onClick={handleViewSuccess}
                      disabled={previewLoading}
                      className="btn-secondary flex flex-1 items-center justify-center gap-2 text-sm"
                    >
                      {previewLoading ? <Loader2 size={14} className="animate-spin" /> : <Eye size={14} />}
                      Visualizar
                    </button>
                    <button
                      onClick={handleDownloadSuccess}
                      className="btn-primary flex flex-1 items-center justify-center gap-2 text-sm"
                    >
                      <Download size={14} />
                      Baixar PDF
                    </button>
                  </div>
                  <button
                    onClick={closeForm}
                    className="text-xs text-zinc-500 transition hover:text-zinc-300"
                  >
                    Fechar
                  </button>
                </div>
              </>
            ) : (
              <>
                {/* ── HEADER (flex-none) ── */}
                <div className="flex-none border-b border-white/10 bg-white/[0.03] px-6 py-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-black text-white">
                      {editingReceipt ? "Editar Recibo" : "Novo Recibo"}
                    </h3>
                    <button onClick={closeForm} className="rounded-lg p-1 text-zinc-500 transition hover:text-white">
                      <X size={20} />
                    </button>
                  </div>
                  {!editingReceipt && (
                    <p className="mt-1 text-xs text-zinc-400">
                      Próximo número estimado:{" "}
                      <span className="font-bold text-[var(--accent)]">{nextNumber}</span>
                    </p>
                  )}
                  {editingReceipt && (
                    <p className="mt-1 text-xs text-zinc-400">
                      <span className="font-bold text-[var(--accent)]">{editingReceipt.number}</span> — não será alterado
                    </p>
                  )}
                </div>

                {/* ── BODY (flex-1, scrollável) ── */}
                <div ref={formBodyRef} className="flex-1 min-h-0 overflow-y-auto px-6 py-5">
                  <form id="receipt-form" className="contents" onSubmit={(e) => { e.preventDefault(); handleEmitir(); }}>
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                          <label className="mb-1 block text-[10px] font-bold uppercase tracking-[0.28em] text-[var(--accent)]">
                            Cliente *
                          </label>
                          <input
                            value={form.clientName}
                            onChange={(e) => setForm({ ...form, clientName: e.target.value })}
                            placeholder="Nome do cliente"
                            className={`input-admin w-full ${getFieldError("clientName") ? "border-red-500" : ""}`}
                          />
                          {getFieldError("clientName") && (
                            <p className="mt-1 text-xs text-red-400">{getFieldError("clientName")}</p>
                          )}
                        </div>
                        <div>
                          <label className="mb-1 block text-[10px] font-bold uppercase tracking-[0.28em] text-[var(--accent)]">
                            Telefone
                          </label>
                          <input
                            value={form.clientPhone}
                            onChange={(e) => setForm({ ...form, clientPhone: e.target.value })}
                            placeholder="(31) 99999-0000"
                            className="input-admin w-full"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                          <label className="mb-1 block text-[10px] font-bold uppercase tracking-[0.28em] text-[var(--accent)]">
                            Data do serviço *
                          </label>
                          <input
                            type="date"
                            value={form.serviceDate}
                            onChange={(e) => setForm({ ...form, serviceDate: e.target.value })}
                            className={`input-admin w-full ${getFieldError("serviceDate") ? "border-red-500" : ""}`}
                          />
                          {getFieldError("serviceDate") && (
                            <p className="mt-1 text-xs text-red-400">{getFieldError("serviceDate")}</p>
                          )}
                        </div>
                        <div>
                          <label className="mb-1 block text-[10px] font-bold uppercase tracking-[0.28em] text-[var(--accent)]">
                            Valor *
                          </label>
                          <MoneyInput
                            value={form.value}
                            onChange={(v) => setForm({ ...form, value: v })}
                            placeholder="0,00"
                            error={getFieldError("value")}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                          <label className="mb-1 block text-[10px] font-bold uppercase tracking-[0.28em] text-[var(--accent)]">
                            Serviço *
                          </label>
                          <select
                            value={form.serviceDescription}
                            onChange={(e) => setForm({ ...form, serviceDescription: e.target.value })}
                            className={`input-admin w-full ${getFieldError("serviceDescription") ? "border-red-500" : ""}`}
                          >
                            <option value="">Selecione o serviço</option>
                            {SERVICES.map((s) => (
                              <option key={s} value={s}>{s}</option>
                            ))}
                          </select>
                          {getFieldError("serviceDescription") && (
                            <p className="mt-1 text-xs text-red-400">{getFieldError("serviceDescription")}</p>
                          )}
                        </div>
                        <div>
                          <label className="mb-1 block text-[10px] font-bold uppercase tracking-[0.28em] text-[var(--accent)]">
                            Forma de pagamento *
                          </label>
                          <select
                            value={form.paymentMethod}
                            onChange={(e) => setForm({ ...form, paymentMethod: e.target.value as PaymentMethod | "" })}
                            className={`input-admin w-full ${getFieldError("paymentMethod") ? "border-red-500" : ""}`}
                          >
                            <option value="">Selecione</option>
                            {PAYMENT_METHODS.map((pm) => (
                              <option key={pm} value={pm}>{pm}</option>
                            ))}
                          </select>
                          {getFieldError("paymentMethod") && (
                            <p className="mt-1 text-xs text-red-400">{getFieldError("paymentMethod")}</p>
                          )}
                        </div>
                      </div>

                      <div>
                        <label className="mb-1 block text-[10px] font-bold uppercase tracking-[0.28em] text-[var(--accent)]">
                          Observações
                        </label>
                        <textarea
                          value={form.observations}
                          onChange={(e) => setForm({ ...form, observations: e.target.value })}
                          placeholder="Observações adicionais (opcional)"
                          rows={2}
                          className="input-admin w-full resize-none"
                        />
                      </div>
                    </div>
                  </form>
                </div>

                {/* ── FOOTER (flex-none) ── */}
                <div className="flex-none border-t border-white/10 px-6 py-4">
                  {submitError && (
                    <div className="mb-3 flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-300">
                      <AlertTriangle size={14} />
                      <span>{submitError}</span>
                      <button onClick={() => setSubmitError(null)} className="ml-auto"><X size={12} /></button>
                    </div>
                  )}
                  <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                    <button
                      type="button"
                      onClick={handlePreview}
                      disabled={previewLoading}
                      className="btn-secondary flex items-center justify-center gap-2 text-sm"
                    >
                      {previewLoading ? <Loader2 size={14} className="animate-spin" /> : <Eye size={14} />}
                      Visualizar
                    </button>
                    <button
                      type="submit"
                      form="receipt-form"
                      disabled={submitting}
                      className="btn-primary flex items-center justify-center gap-2 text-sm"
                    >
                      {submitting ? <Loader2 size={14} className="animate-spin" /> : <Receipt size={14} />}
                      {editingReceipt ? "Salvar alterações" : "Emitir recibo"}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>,
        document.body
      )}

      {previewUrl && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={closePreview}>
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
          <div
            className="relative flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl border border-[var(--accent-20)] bg-[var(--bg-card)] shadow-2xl animate-enter-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-3">
              <p className="text-sm font-bold">Preview do Recibo</p>
              <button onClick={closePreview} className="rounded-lg p-1 text-zinc-500 transition hover:text-white">
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-2">
              <iframe src={previewUrl} className="h-[70vh] w-full rounded-lg" title="Preview Recibo" />
            </div>
          </div>
        </div>,
        document.body
      )}

      {deletingId && createPortal((() => {
        const receipt = receipts.find((r) => r.id === deletingId);
        if (!receipt) return null;
        return (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={() => setDeletingId(null)}>
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <div
              className="relative w-full max-w-sm rounded-2xl border border-red-500/20 bg-[var(--bg-card)] p-6 shadow-2xl animate-enter-up"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500/15">
                  <AlertTriangle size={20} className="text-red-400" />
                </div>
                <div>
                  <p className="text-sm font-bold">Excluir recibo</p>
                  <p className="text-xs text-zinc-500">Esta ação não pode ser desfeita</p>
                </div>
              </div>
              <p className="mb-1 text-sm text-zinc-300">
                Excluir o recibo <span className="font-bold text-[var(--accent)]">{receipt.number}</span>?
              </p>
              <p className="mb-5 text-xs text-zinc-500">O número não será reutilizado.</p>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setDeletingId(null)}
                  className="btn-secondary text-sm"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => handleDelete(receipt.id, receipt.number)}
                  className="flex items-center gap-2 rounded-xl bg-red-500/20 px-4 py-2.5 text-sm font-bold text-red-300 transition hover:bg-red-500/30"
                >
                  <Trash2 size={14} /> Excluir
                </button>
              </div>
            </div>
          </div>
        );
      })(), document.body)}
    </div>
  );
}
