export function formatCurrency(value: number) {
  return Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function addDaysISO(days: number) {
  return new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);
}

export function formatDateBR(date: string) {
  if (!date) return "";

  const [year, month, day] = date.split("-");

  if (!year || !month || !day) return date;

  return `${day}/${month}/${year}`;
}