import type { ReceiptTemplateConfig } from '@/domain/receipt/types';

const PAGE_WIDTH = 595.2756;
const PAGE_HEIGHT = 841.8898;

// Label positions from template (extracted via pdf.js)
const LABELS = {
  numero: { x: 484.8, y: 735.7, width: 7.6, fontSize: 7.0 },
  cliente: { x: 64.7, y: 608.2, width: 33.8, fontSize: 7.3 },
  data: { x: 390.7, y: 608.2, width: 22.3, fontSize: 7.3 },
  servico: { x: 64.7, y: 561.7, width: 35.8, fontSize: 7.3 },
  pagamento: { x: 390.7, y: 561.7, width: 52.2, fontSize: 7.3 },
  valor: { x: 66.7, y: 487.6, width: 71.8, fontSize: 7.3 },
  observacoes: { x: 57.0, y: 454.2, width: 74.9, fontSize: 9.0 },
};

// Page margins
const LEFT_MARGIN = 57;
const RIGHT_MARGIN = 57;
const BOX_RIGHT_EDGE = PAGE_WIDTH - RIGHT_MARGIN; // 538.2756
const VALUE_RIGHT_PADDING = 14;

// Tighter horizontal padding between label and value
const LABEL_VALUE_PADDING = 5;

// Font metrics for Helvetica (approximate)
// For vertical centering: baseline = cellCenterY + (ascender - descender) / 2
// Helvetica: ascender ~ 0.718 * fontSize, descender ~ 0.207 * fontSize
function visualCenterOffset(fontSize: number): number {
  const ascender = 0.718 * fontSize;
  const descender = 0.207 * fontSize;
  return (ascender - descender) / 2; // ~0.255 * fontSize
}

// Cell geometry based on label positions and gaps
// Row 1: CLIENTE/DATA labels at y=608.2, next row at y=561.7
// Label height ~7.3pt, blue band ~615 to ~600
// Value area: ~600 to ~561.7 = 38.3pt tall
// Cell center: (600 + 561.7) / 2 = 580.85
// Subir ~15% da altura da célula (38.3pt * 0.15 = 5.75pt)
// Anterior era 572.2 (baseline 575.0). Subir 1x o último ajuste (+4.8pt) -> baseline 579.8
const CLIENTE_DATA_CENTER_Y = 577.0;

// Row 2: SERVIÇO/PAGAMENTO labels at y=561.7, next label at y=487.6
// Value area: ~554 to ~487.6 = 66.4pt tall
// Cell center: (554 + 487.6) / 2 = 520.8
// Anterior era 524.1 (baseline 526.9). Subir 1x o último ajuste (+6.7pt) -> baseline 533.6
const SERVICO_PAGAMENTO_CENTER_Y = 530.8;

// VALOR RECEBIDO: label at y=487.6, OBSERVAÇÕES at y=454.2
// Value area: ~480 to ~454.2 = 25.8pt tall
// Cell center: (480 + 454.2) / 2 = 467.1
// Anterior era 494.4 (baseline 498.0). Descer 1x o último ajuste (-7.8pt) -> baseline 490.2
const VALOR_CENTER_Y = 486.6;

// OBSERVAÇÕES: label at y=454.2, value area starts ~447
// First baseline ~12pt below box top (internal padding)
const OBSERVACOES_FIRST_BASELINE = 435; // ~12pt below estimated box top

const V_OFFSET = {
  clienteData: visualCenterOffset(11),    // ~2.8pt
  servicoPagamento: visualCenterOffset(11), // ~2.8pt
  valor: visualCenterOffset(14),          // ~3.6pt
};

export const receiptTemplateConfig: ReceiptTemplateConfig = {
  pageWidth: PAGE_WIDTH,
  pageHeight: PAGE_HEIGHT,
  fields: {
    number: {
      x: LABELS.numero.x + LABELS.numero.width + LABEL_VALUE_PADDING, // 497.4
      y: LABELS.numero.y, // Same line as label
      fontSize: 10,
      font: 'regular', // Match original weight (not bold)
      color: { r: 0.2, g: 0.2, b: 0.2 }, // Softer than pure black
      align: 'left',
    },
    clientName: {
      x: LABELS.cliente.x + LABELS.cliente.width + LABEL_VALUE_PADDING, // 103.5
      y: CLIENTE_DATA_CENTER_Y + V_OFFSET.clienteData, // ~583.7
      fontSize: 11,
      font: 'bold', // Original has bold weight for client name
      color: { r: 0, g: 0, b: 0 },
      maxWidth: 260,
      maxLines: 1,
      align: 'left',
    },
    date: {
      x: LABELS.data.x + LABELS.data.width + LABEL_VALUE_PADDING, // 418.0
      y: CLIENTE_DATA_CENTER_Y + V_OFFSET.clienteData, // Same vertical center
      fontSize: 11,
      font: 'regular',
      color: { r: 0, g: 0, b: 0 },
      maxWidth: 120,
      maxLines: 1,
      align: 'left',
    },
    service: {
      x: LABELS.servico.x + LABELS.servico.width + LABEL_VALUE_PADDING, // 105.5
      y: SERVICO_PAGAMENTO_CENTER_Y + V_OFFSET.servicoPagamento, // ~523.6
      fontSize: 11,
      font: 'regular',
      color: { r: 0, g: 0, b: 0 },
      maxWidth: 260,
      maxLines: 1,
      align: 'left',
    },
    paymentMethod: {
      x: LABELS.pagamento.x + LABELS.pagamento.width + LABEL_VALUE_PADDING, // 447.9
      y: SERVICO_PAGAMENTO_CENTER_Y + V_OFFSET.servicoPagamento, // Same vertical center
      fontSize: 11,
      font: 'regular',
      color: { r: 0, g: 0, b: 0 },
      maxWidth: 100,
      maxLines: 1,
      align: 'left',
    },
    value: {
      x: BOX_RIGHT_EDGE - VALUE_RIGHT_PADDING, // 524.2756 (right edge of text)
      y: VALOR_CENTER_Y + V_OFFSET.valor, // ~470.7 (centered in box)
      fontSize: 14,
      font: 'bold',
      color: { r: 0, g: 0, b: 0 },
      align: 'right',
      maxWidth: 140,
    },
    observations: {
      x: LABELS.observacoes.x + LABEL_VALUE_PADDING, // 62.0
      y: OBSERVACOES_FIRST_BASELINE, // 435 (12pt internal top padding)
      fontSize: 9.5,
      font: 'regular',
      color: { r: 0, g: 0, b: 0 },
      maxWidth: PAGE_WIDTH - LEFT_MARGIN - RIGHT_MARGIN, // 481.2756
      maxLines: 5,
      lineHeight: 1.3,
      align: 'left',
    },
  },
};