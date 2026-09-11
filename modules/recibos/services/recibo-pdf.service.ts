import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import type { ReceiptPdfData, ReceiptFieldConfig, ReceiptTemplateConfig } from '@/domain/receipt/types';
import { receiptTemplateConfig } from './recibo-template.config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEMPLATE_PATH = path.join(__dirname, '..', '..', '..', 'public', 'branding', 'recibo-template.pdf');

let templateCache: Uint8Array | null = null;
let fontRegularCache: PDFFont | null = null;
let fontBoldCache: PDFFont | null = null;

async function loadTemplate(): Promise<Uint8Array> {
  if (!templateCache) {
    templateCache = fs.readFileSync(TEMPLATE_PATH);
  }
  return templateCache;
}

async function getFonts(pdfDoc: PDFDocument): Promise<{ regular: PDFFont; bold: PDFFont }> {
  if (!fontRegularCache || !fontBoldCache) {
    fontRegularCache = await pdfDoc.embedFont(StandardFonts.Helvetica);
    fontBoldCache = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  }
  return { regular: fontRegularCache, bold: fontBoldCache };
}

function getFont(fonts: { regular: PDFFont; bold: PDFFont }, weight: 'regular' | 'bold'): PDFFont {
  return weight === 'bold' ? fonts.bold : fonts.regular;
}

function formatCurrency(value: number): string {
  return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
}

function wrapText(
  text: string,
  font: PDFFont,
  fontSize: number,
  maxWidth: number,
  maxLines: number,
  lineHeight: number
): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    const width = font.widthOfTextAtSize(test, fontSize);
    if (width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);

  if (lines.length > maxLines) {
    const lastLineIndex = maxLines - 1;
    const lastLine = lines[lastLineIndex];
    const ellipsis = '…';
    let truncated = lastLine;
    while (font.widthOfTextAtSize(truncated + ellipsis, fontSize) > maxWidth && truncated.length > 0) {
      truncated = truncated.slice(0, -1);
    }
    lines[lastLineIndex] = truncated + ellipsis;
    return lines.slice(0, maxLines);
  }
  return lines;
}

function drawField(
  page: PDFPage,
  fonts: { regular: PDFFont; bold: PDFFont },
  text: string,
  config: ReceiptFieldConfig
): void {
  const font = getFont(fonts, config.font);
  const color = rgb(config.color.r, config.color.g, config.color.b);
  let x = config.x;
  const y = config.y;

  if (config.maxWidth && config.maxLines && config.maxLines > 1) {
    const lines = wrapText(text, font, config.fontSize, config.maxWidth, config.maxLines, config.lineHeight || 1.2);
    lines.forEach((line, index) => {
      const lineY = y - index * config.fontSize * (config.lineHeight || 1.2);
      let lineX = x;
      if (config.align === 'center') {
        lineX = x - font.widthOfTextAtSize(line, config.fontSize) / 2;
      } else if (config.align === 'right') {
        lineX = x - font.widthOfTextAtSize(line, config.fontSize);
      }
      page.drawText(line, {
        x: lineX,
        y: lineY,
        size: config.fontSize,
        font,
        color,
      });
    });
  } else {
    let finalX = x;
    if (config.align === 'center') {
      finalX = x - font.widthOfTextAtSize(text, config.fontSize) / 2;
    } else if (config.align === 'right') {
      finalX = x - font.widthOfTextAtSize(text, config.fontSize);
    }
    page.drawText(text, {
      x: finalX,
      y,
      size: config.fontSize,
      font,
      color,
    });
  }
}

export async function generateReceiptPdf(data: ReceiptPdfData): Promise<Uint8Array> {
  if (!data.number || !data.number.trim()) {
    throw new Error("Número do recibo não definido. Emita o recibo antes de gerar o PDF.");
  }

  const templateBytes = await loadTemplate();
  const pdfDoc = await PDFDocument.load(templateBytes);
  const page = pdfDoc.getPages()[0];
  const fonts = await getFonts(pdfDoc);

  const fields = receiptTemplateConfig.fields;

  drawField(page, fonts, data.number, fields.number);
  drawField(page, fonts, data.clientName, fields.clientName);
  drawField(page, fonts, data.date, fields.date);
  drawField(page, fonts, data.service, fields.service);
  drawField(page, fonts, data.paymentMethod, fields.paymentMethod);
  drawField(page, fonts, formatCurrency(data.value), fields.value);
  drawField(page, fonts, data.observations || "", fields.observations);

  return pdfDoc.save();
}

export async function generateReceiptBlob(data: ReceiptPdfData): Promise<Blob> {
  const pdfBytes = await generateReceiptPdf(data);
  return new Blob([pdfBytes.slice().buffer], { type: "application/pdf" });
}

export async function downloadReceipt(data: ReceiptPdfData, filename?: string): Promise<void> {
  const blob = await generateReceiptBlob(data);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || `recibo-${data.number.replace('/', '-')}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function previewReceipt(data: ReceiptPdfData): Promise<string> {
  const blob = await generateReceiptBlob(data);
  return URL.createObjectURL(blob);
}