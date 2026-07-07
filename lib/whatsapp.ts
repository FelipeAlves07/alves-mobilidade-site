export function cleanPhone(phone: string) {
  return phone.replace(/\D/g, "");
}

export function openWhatsApp(phone: string, message: string) {
  if (typeof window === "undefined") return;

  const number = cleanPhone(phone);

  if (!number) {
    alert("Esse contato não tem telefone cadastrado.");
    return;
  }

  const finalNumber = number.startsWith("55") ? number : `55${number}`;

  window.open(
    `https://wa.me/${finalNumber}?text=${encodeURIComponent(message)}`,
    "_blank"
  );
}

export function openWhatsAppWithoutNumber(message: string) {
  if (typeof window === "undefined") return;

  window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank");
}