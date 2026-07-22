export interface InvoicePdfInput {
  invoiceNumber: string;
  status: string;
  currency: string;
  subtotal: number;
  total: number;
  dueDate: Date;
  paidAt: Date | null;
  customerEmail: string;
  customerName: string;
  items: { description: string; quantity: number; unitPrice: number; totalPrice: number }[];
  createdAt?: Date;
}

const PAGE_W = 595.28;
const PAGE_H = 841.89;
const M = 48;

const COLORS = {
  primary: "#131b2e",
  secondary: "#712ae2",
  accent: "#4cd7f6",
  text: "#191c1e",
  muted: "#45464d",
  line: "#d8dadc",
  white: "#ffffff",
  paid: "#0d7a4e",
  pending: "#b45309",
  seal: "#712ae2",
  sealInner: "#8a4cfc",
};

function hexRgb(hex: string): string {
  const h = hex.replace("#", "");
  const r = (parseInt(h.slice(0, 2), 16) / 255).toFixed(3);
  const g = (parseInt(h.slice(2, 4), 16) / 255).toFixed(3);
  const b = (parseInt(h.slice(4, 6), 16) / 255).toFixed(3);
  return `${r} ${g} ${b}`;
}

function escapePdfText(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function formatMoney(amount: number, currency: string): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount);
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function statusLabel(status: string): string {
  return status.replace(/_/g, " ");
}

function wrapText(text: string, maxLen: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxLen && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines : [text.slice(0, maxLen)];
}

function circlePath(cx: number, cy: number, r: number): string {
  const k = 0.5522847498 * r;
  return [
    "q",
    "1 0 0 1",
    `${cx.toFixed(2)} ${cy.toFixed(2)} cm`,
    `${r.toFixed(2)} 0 m`,
    `${r.toFixed(2)} ${k.toFixed(2)} ${k.toFixed(2)} ${r.toFixed(2)} 0 ${r.toFixed(2)} c`,
    `${(-k).toFixed(2)} ${r.toFixed(2)} ${(-r).toFixed(2)} ${k.toFixed(2)} ${(-r).toFixed(2)} 0 c`,
    `${(-k).toFixed(2)} ${(-r).toFixed(2)} ${(-r).toFixed(2)} ${(-k).toFixed(2)} 0 ${(-r).toFixed(2)} c`,
    `${k.toFixed(2)} ${(-r).toFixed(2)} ${r.toFixed(2)} ${(-k).toFixed(2)} ${r.toFixed(2)} 0 c`,
    "h",
    "Q",
  ].join("\n");
}

function buildContentStream(input: InvoicePdfInput): string {
  const ops: string[] = [];
  const pushText = (
    text: string,
    x: number,
    y: number,
    size: number,
    font: "F1" | "F2" = "F1",
    color = COLORS.text,
  ) => {
    ops.push(`${hexRgb(color)} rg`);
    ops.push(`BT /${font} ${size} Tf ${x.toFixed(2)} ${y.toFixed(2)} Td (${escapePdfText(text)}) Tj ET`);
  };

  const headerH = 96;
  ops.push(`${hexRgb(COLORS.primary)} rg`);
  ops.push(`0 ${PAGE_H - headerH} ${PAGE_W} ${headerH} re f`);

  ops.push(`${hexRgb(COLORS.secondary)} rg`);
  ops.push(`${PAGE_W - 180} ${PAGE_H - headerH} 180 ${headerH} re f`);

  pushText("Vexira Host", M, PAGE_H - 42, 22, "F2", COLORS.white);
  pushText("VexiraLabs · Enterprise Infrastructure", M, PAGE_H - 64, 10, "F1", COLORS.accent);
  pushText("INVOICE", PAGE_W - M - 120, PAGE_H - 50, 26, "F2", COLORS.white);
  pushText(input.invoiceNumber, PAGE_W - M - 120, PAGE_H - 72, 11, "F1", COLORS.white);

  let y = PAGE_H - headerH - 36;

  ops.push(`${hexRgb(COLORS.line)} RG 1 w`);
  ops.push(`${M} ${y} m ${PAGE_W - M} ${y} l S`);

  y -= 28;
  pushText("BILL TO", M, y, 9, "F2", COLORS.muted);
  pushText("INVOICE DETAILS", PAGE_W / 2 + 12, y, 9, "F2", COLORS.muted);

  y -= 18;
  const customer = input.customerName || input.customerEmail;
  pushText(customer, M, y, 12, "F2");
  pushText(`Invoice date: ${formatDate(input.createdAt ?? input.dueDate)}`, PAGE_W / 2 + 12, y, 10, "F1");

  y -= 16;
  pushText(input.customerEmail, M, y, 10, "F1", COLORS.muted);
  pushText(`Due date: ${formatDate(input.dueDate)}`, PAGE_W / 2 + 12, y, 10, "F1");

  y -= 16;
  const statusColor = input.status === "PAID" ? COLORS.paid : COLORS.pending;
  pushText(`Status: ${statusLabel(input.status)}`, PAGE_W / 2 + 12, y, 10, "F2", statusColor);

  if (input.paidAt) {
    y -= 14;
    pushText(`Paid on: ${formatDate(input.paidAt)}`, PAGE_W / 2 + 12, y, 10, "F1", COLORS.paid);
  }

  y -= 32;
  const tableTop = y;
  const colDesc = M;
  const colQty = PAGE_W - M - 220;
  const colUnit = PAGE_W - M - 150;
  const colTotal = PAGE_W - M - 70;
  const rowH = 22;

  ops.push(`${hexRgb(COLORS.primary)} rg`);
  ops.push(`${M} ${tableTop - rowH} ${PAGE_W - M * 2} ${rowH} re f`);

  pushText("Description", colDesc + 8, tableTop - 15, 9, "F2", COLORS.white);
  pushText("Qty", colQty, tableTop - 15, 9, "F2", COLORS.white);
  pushText("Unit", colUnit, tableTop - 15, 9, "F2", COLORS.white);
  pushText("Amount", colTotal, tableTop - 15, 9, "F2", COLORS.white);

  y = tableTop - rowH;
  input.items.forEach((item, index) => {
    y -= rowH;
    if (index % 2 === 0) {
      ops.push(`${hexRgb("#f2f4f6")} rg`);
      ops.push(`${M} ${y} ${PAGE_W - M * 2} ${rowH} re f`);
    }

    const descLines = wrapText(item.description, 42).slice(0, 2);
    pushText(descLines[0] ?? item.description, colDesc + 8, y + 7, 9, "F1");
    pushText(String(item.quantity), colQty, y + 7, 9, "F1");
    pushText(formatMoney(item.unitPrice, input.currency), colUnit, y + 7, 9, "F1");
    pushText(formatMoney(item.totalPrice, input.currency), colTotal, y + 7, 9, "F2");
  });

  y -= 8;
  ops.push(`${hexRgb(COLORS.line)} RG 1 w`);
  ops.push(`${M} ${y} m ${PAGE_W - M} ${y} l S`);

  const summaryX = PAGE_W - M - 190;
  y -= 24;
  pushText("Subtotal", summaryX, y, 10, "F1", COLORS.muted);
  pushText(formatMoney(input.subtotal, input.currency), summaryX + 90, y, 10, "F2");

  y -= 18;
  ops.push(`${hexRgb(COLORS.secondary)} rg`);
  ops.push(`${summaryX - 8} ${y - 6} 188 28 re f`);
  pushText("Total due", summaryX, y + 2, 11, "F2", COLORS.white);
  pushText(formatMoney(input.total, input.currency), summaryX + 90, y + 2, 12, "F2", COLORS.white);

  const sealCx = M + 62;
  const sealCy = 118;
  const sealR = 52;

  ops.push(`${hexRgb(COLORS.seal)} RG 2.5 w`);
  ops.push(circlePath(sealCx, sealCy, sealR));
  ops.push("S");
  ops.push(`${hexRgb(COLORS.sealInner)} RG 1.2 w`);
  ops.push(circlePath(sealCx, sealCy, sealR - 8));
  ops.push("S");
  ops.push("Q");

  pushText("VEXIRALABS", sealCx - 38, sealCy + 10, 11, "F2", COLORS.seal);
  pushText("OFFICIAL", sealCx - 24, sealCy - 4, 8, "F2", COLORS.seal);
  pushText("SEAL", sealCx - 14, sealCy - 14, 8, "F2", COLORS.seal);
  pushText(input.invoiceNumber.slice(-8).toUpperCase(), sealCx - 22, sealCy - 28, 7, "F1", COLORS.muted);

  ops.push(`${hexRgb(COLORS.line)} rg`);
  ops.push(`0 0 ${PAGE_W} 56 re f`);
  pushText("Thank you for choosing Vexira Host.", M, 34, 10, "F2", COLORS.text);
  pushText("vexirahost.com  ·  billing@vexirahost.com  ·  VexiraLabs", M, 18, 8, "F1", COLORS.muted);

  return ops.join("\n");
}

function buildPdfDocument(contentStream: string): Buffer {
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Contents 4 0 R /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> >>",
    `<< /Length ${Buffer.byteLength(contentStream, "utf8")} >>\nstream\n${contentStream}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>",
  ];

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [0];

  objects.forEach((body, index) => {
    offsets.push(Buffer.byteLength(pdf, "utf8"));
    pdf += `${index + 1} 0 obj\n${body}\nendobj\n`;
  });

  const xrefOffset = Buffer.byteLength(pdf, "utf8");
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  for (let i = 1; i <= objects.length; i++) {
    pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\n`;
  pdf += `startxref\n${xrefOffset}\n%%EOF`;

  return Buffer.from(pdf, "utf8");
}

/** Branded A4 invoice PDF — no external dependencies. */
export function buildInvoicePdf(input: InvoicePdfInput): Buffer {
  const contentStream = buildContentStream(input);
  return buildPdfDocument(contentStream);
}
