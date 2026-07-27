import type { Proposal } from "@/domain/proposal/types";
import { money } from "@/lib/quotes";

export function proposalValidityISO(days = 10) {
  return new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);
}

export function proposalCode(proposal: Proposal) {
  const date = new Date(proposal.createdAt || new Date().toISOString());
  const year = date.getFullYear();
  const shortId = proposal.id.replace(/[^a-zA-Z0-9]/g, "").slice(0, 6).toUpperCase() || "000001";
  return `AME-${year}-${shortId}`;
}

export function buildPremiumProposalMessage(proposal: Proposal) {
  return `🚘 ALVES MOBILIDADE EXECUTIVA

PROPOSTA COMERCIAL PREMIUM

Cliente: ${proposal.client || "Cliente"}
Embarque: ${proposal.origin}
Destino: ${proposal.destination}
Data: ${proposal.date || "A combinar"}
Horário: ${proposal.time || "A combinar"}
Passageiros: ${proposal.passengers}
Bagagens: ${proposal.bags}
Distância estimada: ${proposal.km || "a confirmar"} km

Valor do atendimento executivo: ${money(proposal.value)}
Validade: 10 dias, até ${new Date(proposal.validUntil + "T00:00:00").toLocaleDateString("pt-BR")}

Incluso no atendimento:
• Motorista executivo
• Veículo confortável
• Pontualidade
• Atendimento personalizado
• Suporte pelo WhatsApp

Alves Mobilidade Executiva
Mais do que transporte. Uma experiência em mobilidade.`;
}

export function svgEscape(value: string) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function wrapSvgText(value: string, maxChars = 28) {
  const words = String(value || "").split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";

  words.forEach((word) => {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxChars && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  });

  if (current) lines.push(current);
  return lines.slice(0, 3);
}

export function svgMultiline(value: string, x: number, y: number, options?: { maxChars?: number; size?: number; weight?: number; fill?: string; lineHeight?: number }) {
  const maxChars = options?.maxChars ?? 28;
  const size = options?.size ?? 24;
  const weight = options?.weight ?? 800;
  const fill = options?.fill ?? "#f5f0e8";
  const lineHeight = options?.lineHeight ?? size + 8;
  const lines = wrapSvgText(value, maxChars);

  return `<text x="${x}" y="${y}" fill="${fill}" font-size="${size}" font-weight="${weight}" font-family="Arial, Helvetica, sans-serif">${lines
    .map((line, index) => `<tspan x="${x}" dy="${index === 0 ? 0 : lineHeight}">${svgEscape(line)}</tspan>`)
    .join("")}</text>`;
}

export function buildPremiumProposalSvg(proposal: Proposal, WHATSAPP_QR_DATA_URL: string) {
  const validUntil = new Date(proposal.validUntil + "T00:00:00").toLocaleDateString("pt-BR");
  const createdAt = new Date(proposal.createdAt).toLocaleDateString("pt-BR");
  const code = proposalCode(proposal);
  const phone = proposal.phone ? proposal.phone : "(31) 99845-8084";
  const dateTime = `${proposal.date || "A combinar"}${proposal.time ? ` às ${proposal.time}` : ""}`;
  const passengersBags = `${proposal.passengers} passageiro(s) • ${proposal.bags} mala(s)`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="794" height="1123" viewBox="0 0 794 1123">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#161616"/>
      <stop offset="56%" stop-color="#080808"/>
      <stop offset="100%" stop-color="#000000"/>
    </linearGradient>
    <linearGradient id="blue" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#8bc0e8"/>
      <stop offset="45%" stop-color="#2d6da8"/>
      <stop offset="100%" stop-color="#1a3a6b"/>
    </linearGradient>
    <radialGradient id="shine" cx="82%" cy="8%" r="72%">
      <stop offset="0%" stop-color="#2d6da8" stop-opacity="0.18"/>
      <stop offset="55%" stop-color="#2d6da8" stop-opacity="0.04"/>
      <stop offset="100%" stop-color="#2d6da8" stop-opacity="0"/>
    </radialGradient>
  </defs>

  <rect width="794" height="1123" fill="url(#bg)"/>
  <rect width="794" height="1123" fill="url(#shine)"/>
  <rect x="44" y="44" width="706" height="1035" rx="34" fill="none" stroke="#2d6da8" stroke-opacity="0.38" stroke-width="1.5"/>

  <text x="84" y="102" fill="#2d6da8" font-size="12" font-weight="900" letter-spacing="4" font-family="Arial, Helvetica, sans-serif">AME • ALVES MOBILIDADE EXECUTIVA</text>
  <text x="710" y="102" fill="#9f9f9f" font-size="11" text-anchor="end" font-family="Arial, Helvetica, sans-serif">${svgEscape(createdAt)}</text>
  <text x="710" y="122" fill="#9f9f9f" font-size="11" text-anchor="end" font-family="Arial, Helvetica, sans-serif">${svgEscape(code)}</text>
  <text x="84" y="166" fill="#ffffff" font-size="42" font-weight="900" font-family="Arial, Helvetica, sans-serif">Proposta Executiva</text>
  <text x="84" y="198" fill="#cfcfcf" font-size="17" font-family="Arial, Helvetica, sans-serif">Transfer executivo premium com conforto, segurança e pontualidade.</text>

  <rect x="84" y="246" width="626" height="142" rx="24" fill="#241c14" stroke="#2d6da8" stroke-opacity="0.34"/>
  <text x="108" y="294" fill="#2d6da8" font-size="12" font-weight="900" letter-spacing="4" font-family="Arial, Helvetica, sans-serif">EMBARQUE</text>
  ${svgMultiline(proposal.origin, 108, 330, { maxChars: 23, size: 21, weight: 900, lineHeight: 25 })}
  <text x="397" y="336" fill="#2d6da8" font-size="30" text-anchor="middle" font-family="Arial, Helvetica, sans-serif">→</text>
  <text x="456" y="294" fill="#2d6da8" font-size="12" font-weight="900" letter-spacing="4" font-family="Arial, Helvetica, sans-serif">DESTINO</text>
  ${svgMultiline(proposal.destination, 456, 330, { maxChars: 21, size: 21, weight: 900, lineHeight: 25 })}

  <rect x="84" y="430" width="286" height="90" rx="18" fill="#141414" stroke="#ffffff" stroke-opacity="0.11"/>
  <text x="108" y="466" fill="#2d6da8" font-size="12" font-weight="900" letter-spacing="4" font-family="Arial, Helvetica, sans-serif">CLIENTE</text>
  ${svgMultiline(proposal.client || "Cliente", 108, 496, { maxChars: 22, size: 21, weight: 900, lineHeight: 24 })}

  <rect x="424" y="430" width="286" height="90" rx="18" fill="#141414" stroke="#ffffff" stroke-opacity="0.11"/>
  <text x="448" y="466" fill="#2d6da8" font-size="12" font-weight="900" letter-spacing="4" font-family="Arial, Helvetica, sans-serif">DATA E HORÁRIO</text>
  ${svgMultiline(dateTime, 448, 496, { maxChars: 20, size: 20, weight: 900, lineHeight: 23 })}

  <rect x="84" y="548" width="286" height="90" rx="18" fill="#141414" stroke="#ffffff" stroke-opacity="0.11"/>
  <text x="108" y="584" fill="#2d6da8" font-size="12" font-weight="900" letter-spacing="4" font-family="Arial, Helvetica, sans-serif">DISTÂNCIA</text>
  <text x="108" y="614" fill="#ffffff" font-size="21" font-weight="900" font-family="Arial, Helvetica, sans-serif">${svgEscape(String(proposal.km || "a confirmar"))} km</text>

  <rect x="424" y="548" width="286" height="90" rx="18" fill="#141414" stroke="#ffffff" stroke-opacity="0.11"/>
  <text x="448" y="584" fill="#2d6da8" font-size="11" font-weight="900" letter-spacing="3" font-family="Arial, Helvetica, sans-serif">PASSAGEIROS / BAGAGENS</text>
  ${svgMultiline(passengersBags, 448, 614, { maxChars: 22, size: 19, weight: 900, lineHeight: 22 })}

  <rect x="84" y="670" width="626" height="124" rx="22" fill="#111111" stroke="#2d6da8" stroke-opacity="0.24"/>
  <text x="108" y="710" fill="#2d6da8" font-size="12" font-weight="900" letter-spacing="4" font-family="Arial, Helvetica, sans-serif">VALOR DO ATENDIMENTO EXECUTIVO</text>
  <text x="108" y="762" fill="url(#blue)" font-size="52" font-weight="900" font-family="Arial, Helvetica, sans-serif">${svgEscape(money(proposal.value))}</text>
  <text x="108" y="786" fill="#d8d8d8" font-size="15" font-family="Arial, Helvetica, sans-serif">Validade: 10 dias, até ${svgEscape(validUntil)}</text>

  <rect x="84" y="830" width="292" height="48" rx="16" fill="#151515"/>
  <text x="108" y="860" fill="#ffffff" font-size="16" font-family="Arial, Helvetica, sans-serif">✓ Motorista executivo</text>
  <rect x="418" y="830" width="292" height="48" rx="16" fill="#151515"/>
  <text x="442" y="860" fill="#ffffff" font-size="16" font-family="Arial, Helvetica, sans-serif">✓ Veículo confortável</text>
  <rect x="84" y="894" width="292" height="48" rx="16" fill="#151515"/>
  <text x="108" y="924" fill="#ffffff" font-size="16" font-family="Arial, Helvetica, sans-serif">✓ Pontualidade</text>
  <rect x="418" y="894" width="292" height="48" rx="16" fill="#151515"/>
  <text x="442" y="924" fill="#ffffff" font-size="16" font-family="Arial, Helvetica, sans-serif">✓ Atendimento personalizado</text>

  <line x1="84" y1="982" x2="438" y2="982" stroke="#2d6da8" stroke-opacity="0.28"/>
  <text x="84" y="1012" fill="#ffffff" font-size="16" font-weight="900" font-family="Arial, Helvetica, sans-serif">Alves Mobilidade Executiva</text>
  <text x="84" y="1035" fill="#bdbdbd" font-size="12" font-family="Arial, Helvetica, sans-serif">Mais do que transporte. Uma experiência em mobilidade.</text>
  <text x="84" y="1056" fill="#bdbdbd" font-size="12" font-family="Arial, Helvetica, sans-serif">WhatsApp: ${svgEscape(phone)} • alvesmobilidade.com.br</text>

  <rect x="602" y="948" width="108" height="108" rx="18" fill="#ffffff" stroke="#2d6da8" stroke-opacity="0.42"/>
  <image x="612" y="958" width="88" height="88" href="${WHATSAPP_QR_DATA_URL}" preserveAspectRatio="xMidYMid meet"/>
  <text x="656" y="1072" fill="#2d6da8" font-size="10" text-anchor="middle" font-family="Arial, Helvetica, sans-serif">WhatsApp</text>
</svg>`;
}

export function dataUrlToBytes(dataUrl: string) {
  const base64 = dataUrl.split(",")[1] || "";
  const binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

export function concatBytes(chunks: Uint8Array[]) {
  const length = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const result = new Uint8Array(length);
  let offset = 0;
  chunks.forEach((chunk) => {
    result.set(chunk, offset);
    offset += chunk.length;
  });
  return result;
}

export function buildImagePdf(jpegBytes: Uint8Array, imageWidth: number, imageHeight: number) {
  const encoder = new TextEncoder();
  const chunks: Uint8Array[] = [];
  const offsets: number[] = [0];
  let position = 0;

  function pushText(text: string) {
    const bytes = encoder.encode(text);
    chunks.push(bytes);
    position += bytes.length;
  }

  function pushBytes(bytes: Uint8Array) {
    chunks.push(bytes);
    position += bytes.length;
  }

  function beginObject(number: number) {
    offsets[number] = position;
    pushText(`${number} 0 obj\n`);
  }

  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const content = `q\n${pageWidth} 0 0 ${pageHeight} 0 0 cm\n/Im0 Do\nQ`;
  const contentBytes = encoder.encode(content);

  pushText("%PDF-1.4\n%\xFF\xFF\xFF\xFF\n");

  beginObject(1);
  pushText("<< /Type /Catalog /Pages 2 0 R >>\nendobj\n");

  beginObject(2);
  pushText("<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n");

  beginObject(3);
  pushText(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>\nendobj\n`);

  beginObject(4);
  pushText(`<< /Type /XObject /Subtype /Image /Width ${imageWidth} /Height ${imageHeight} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpegBytes.length} >>\nstream\n`);
  pushBytes(jpegBytes);
  pushText("\nendstream\nendobj\n");

  beginObject(5);
  pushText(`<< /Length ${contentBytes.length} >>\nstream\n`);
  pushBytes(contentBytes);
  pushText("\nendstream\nendobj\n");

  const xrefPosition = position;
  pushText("xref\n0 6\n0000000000 65535 f \n");
  for (let index = 1; index <= 5; index += 1) {
    pushText(`${String(offsets[index]).padStart(10, "0")} 00000 n \n`);
  }
  pushText(`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefPosition}\n%%EOF`);

  return new Blob([concatBytes(chunks)], { type: "application/pdf" });
}

export function safeProposalFilename(proposal: Proposal, extension: "pdf" | "png") {
  return `${proposalCode(proposal)}-${proposal.client || "proposta"}.${extension}`.replace(/[^a-zA-Z0-9_.-]/g, "-");
}

export async function renderPremiumProposalCanvas(proposal: Proposal, WHATSAPP_QR_DATA_URL: string) {
  const svg = buildPremiumProposalSvg(proposal, WHATSAPP_QR_DATA_URL);
  const svgBlob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  const svgUrl = URL.createObjectURL(svgBlob);
  const image = new Image();

  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error("Não foi possível gerar a imagem da proposta."));
    image.src = svgUrl;
  });

  const canvas = document.createElement("canvas");
  canvas.width = 794;
  canvas.height = 1123;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas indisponível no navegador.");

  context.fillStyle = "#050505";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  URL.revokeObjectURL(svgUrl);

  return canvas;
}

export async function downloadPremiumProposalImage(proposal: Proposal, WHATSAPP_QR_DATA_URL: string) {
  const canvas = await renderPremiumProposalCanvas(proposal, WHATSAPP_QR_DATA_URL);
  const pngDataUrl = canvas.toDataURL("image/png");
  const link = document.createElement("a");
  link.href = pngDataUrl;
  link.download = safeProposalFilename(proposal, "png");
  document.body.appendChild(link);
  link.click();
  link.remove();
}

export async function downloadPremiumProposalPdf(proposal: Proposal, WHATSAPP_QR_DATA_URL: string, onStatus?: (msg: string) => void) {
  if (onStatus) onStatus("Gerando PDF premium...");
  const canvas = await renderPremiumProposalCanvas(proposal, WHATSAPP_QR_DATA_URL);
  const jpegDataUrl = canvas.toDataURL("image/jpeg", 0.96);
  const jpegBytes = dataUrlToBytes(jpegDataUrl);
  const pdfBlob = buildImagePdf(jpegBytes, canvas.width, canvas.height);
  const pdfUrl = URL.createObjectURL(pdfBlob);
  const link = document.createElement("a");
  link.href = pdfUrl;
  link.download = safeProposalFilename(proposal, "pdf");
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(pdfUrl);
  if (onStatus) onStatus("PDF premium baixado ✓");
}
