/**
 * Professional multilingual invoice PDF (AZ / TR / EN / RU).
 * Embeds a Noto Sans subset so ə/ı/ğ/ş/ç/ü and Cyrillic render correctly.
 */
import { existsSync } from "node:fs";
import { join } from "node:path";
import { deflateSync } from "node:zlib";

import { getInvoicePdfCopy, intlLocale, type InvoicePdfLocale } from "./invoice-pdf.i18n";
import { embedFontSubset, type EmbeddedFont } from "./pdf-font.util";

export const INVOICE_PDF_VERSION = "5.0";

export interface InvoicePdfInput {
  invoiceNumber: string;
  status: string;
  currency: string;
  subtotal: number;
  total: number;
  amountPaid?: number;
  amountDue?: number;
  dueDate: Date;
  paidAt: Date | null;
  customerEmail: string;
  customerName: string;
  items: { description: string; quantity: number; unitPrice: number; totalPrice: number }[];
  createdAt?: Date;
  locale?: InvoicePdfLocale;
}

const PAGE_W = 595.28;
const PAGE_H = 841.89;
const M = 42;
const FOOTER_H = 44;
const STAMP_R = 44;
const STAMP_CX = PAGE_W - M - STAMP_R - 6;
const STAMP_CY = FOOTER_H + 22 + STAMP_R;

const C = {
  navy: "#0B1220",
  accent: "#0071E3",
  ink: "#0F172A",
  body: "#334155",
  muted: "#64748B",
  line: "#E2E8F0",
  zebra: "#F8FAFC",
  white: "#FFFFFF",
  stamp: "#1E3A8A",
  paid: "#047857",
  pending: "#B45309",
  overdue: "#B91C1C",
  void: "#64748B",
  headerMuted: "#94A3B8",
};

function hexRgb(hex: string): string {
  const h = hex.replace("#", "");
  const r = (parseInt(h.slice(0, 2), 16) / 255).toFixed(4);
  const g = (parseInt(h.slice(2, 4), 16) / 255).toFixed(4);
  const b = (parseInt(h.slice(4, 6), 16) / 255).toFixed(4);
  return `${r} ${g} ${b}`;
}

function fontPath(file: string): string {
  const candidates = [
    join(__dirname, "../../../assets/fonts", file),
    join(__dirname, "../../../../assets/fonts", file),
    join(process.cwd(), "assets/fonts", file),
    join(process.cwd(), "dist/assets/fonts", file),
    join(process.cwd(), "apps/backend/assets/fonts", file),
  ];
  const found = candidates.find((p) => existsSync(p));
  if (!found) {
    throw new Error(`Invoice PDF font missing: ${file}`);
  }
  return found;
}

function money(amount: number, currency: string, locale: InvoicePdfLocale): string {
  try {
    return new Intl.NumberFormat(intlLocale(locale), { style: "currency", currency }).format(
      amount,
    );
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

function dateShort(date: Date, locale: InvoicePdfLocale): string {
  return new Intl.DateTimeFormat(intlLocale(locale), {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function dateTime(date: Date, locale: InvoicePdfLocale): string {
  return new Intl.DateTimeFormat(intlLocale(locale), {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

function statusColor(status: string): string {
  const s = status.toUpperCase();
  if (s === "PAID") return C.paid;
  if (s === "OVERDUE") return C.overdue;
  if (s === "VOID" || s === "CANCELLED") return C.void;
  return C.pending;
}

function wrapText(
  font: EmbeddedFont,
  text: string,
  maxWidth: number,
  size: number,
  maxLines = 2,
): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (font.widthOf(next, size) > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }
  if (current) lines.push(current);
  const cut = lines.slice(0, maxLines);
  if (lines.length > maxLines && cut.length) {
    let last = cut[cut.length - 1]!;
    while (last.length > 3 && font.widthOf(`${last}…`, size) > maxWidth) last = last.slice(0, -1);
    cut[cut.length - 1] = `${last}…`;
  }
  return cut.length ? cut : [text];
}

class Painter {
  readonly ops: string[] = [];
  constructor(
    private readonly regular: EmbeddedFont,
    private readonly bold: EmbeddedFont,
  ) {}

  fillRect(x: number, y: number, w: number, h: number, color: string): void {
    this.ops.push(
      `${hexRgb(color)} rg ${x.toFixed(2)} ${y.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re f`,
    );
  }

  line(x1: number, y1: number, x2: number, y2: number, color: string, width = 0.6): void {
    this.ops.push(
      `${hexRgb(color)} RG ${width.toFixed(2)} w ${x1.toFixed(2)} ${y1.toFixed(2)} m ${x2.toFixed(2)} ${y2.toFixed(2)} l S`,
    );
  }

  text(value: string, x: number, y: number, size: number, bold = false, color = C.ink): void {
    const font = bold ? this.bold : this.regular;
    this.ops.push(`${hexRgb(color)} rg`);
    this.ops.push(
      `BT /${bold ? "F2" : "F1"} ${size} Tf ${x.toFixed(2)} ${y.toFixed(2)} Td ${font.toPdf(value)} Tj ET`,
    );
  }

  textRight(
    value: string,
    right: number,
    y: number,
    size: number,
    bold = false,
    color = C.ink,
  ): void {
    const font = bold ? this.bold : this.regular;
    this.text(value, right - font.widthOf(value, size), y, size, bold, color);
  }

  textCenter(
    value: string,
    cx: number,
    y: number,
    size: number,
    bold = false,
    color = C.ink,
  ): void {
    const font = bold ? this.bold : this.regular;
    this.text(value, cx - font.widthOf(value, size) / 2, y, size, bold, color);
  }

  circle(cx: number, cy: number, r: number, mode: "S" | "f", color: string, strokeW = 1): void {
    const k = 0.5522847498 * r;
    if (mode === "f") this.ops.push(`${hexRgb(color)} rg`);
    else this.ops.push(`${hexRgb(color)} RG ${strokeW.toFixed(2)} w [] 0 d`);
    this.ops.push(`${(cx + r).toFixed(2)} ${cy.toFixed(2)} m`);
    this.ops.push(
      `${(cx + r).toFixed(2)} ${(cy + k).toFixed(2)} ${(cx + k).toFixed(2)} ${(cy + r).toFixed(2)} ${cx.toFixed(2)} ${(cy + r).toFixed(2)} c`,
    );
    this.ops.push(
      `${(cx - k).toFixed(2)} ${(cy + r).toFixed(2)} ${(cx - r).toFixed(2)} ${(cy + k).toFixed(2)} ${(cx - r).toFixed(2)} ${cy.toFixed(2)} c`,
    );
    this.ops.push(
      `${(cx - r).toFixed(2)} ${(cy - k).toFixed(2)} ${(cx - k).toFixed(2)} ${(cy - r).toFixed(2)} ${cx.toFixed(2)} ${(cy - r).toFixed(2)} c`,
    );
    this.ops.push(
      `${(cx + k).toFixed(2)} ${(cy - r).toFixed(2)} ${(cx + r).toFixed(2)} ${(cy - k).toFixed(2)} ${(cx + r).toFixed(2)} ${cy.toFixed(2)} c`,
    );
    this.ops.push(`h ${mode}`);
  }
}

function collectTexts(input: InvoicePdfInput, locale: InvoicePdfLocale): string[] {
  const t = getInvoicePdfCopy(locale);
  const extra = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz.,-+/·:()€$₼₽ ";
  return [
    extra,
    t.documentTitle,
    t.invoice,
    t.from,
    t.billTo,
    t.companyLegal,
    t.companyLine,
    t.issued,
    t.dueDate,
    t.paidOn,
    t.currency,
    t.description,
    t.qty,
    t.unit,
    t.amount,
    t.subtotal,
    t.amountPaid,
    t.amountDue,
    t.paymentNotes,
    t.paymentHint,
    t.support,
    t.thanks,
    t.officialFooter,
    t.generated,
    t.stampBrand,
    t.stampOfficial,
    t.stampPaid,
    t.moreItems(99),
    ...Object.values(t.status),
    input.invoiceNumber,
    input.customerName,
    input.customerEmail,
    input.currency,
    money(input.total, input.currency, locale),
    money(input.subtotal, input.currency, locale),
    money(input.amountDue ?? 0, input.currency, locale),
    money(input.amountPaid ?? 0, input.currency, locale),
    dateShort(input.dueDate, locale),
    dateShort(input.createdAt ?? input.dueDate, locale),
    dateTime(new Date(), locale),
    ...input.items.flatMap((item) => [
      item.description,
      String(item.quantity),
      money(item.unitPrice, input.currency, locale),
      money(item.totalPrice, input.currency, locale),
    ]),
  ];
}

function drawStamp(
  p: Painter,
  copy: ReturnType<typeof getInvoicePdfCopy>,
  invoiceNumber: string,
  issued: Date,
  status: string,
  locale: InvoicePdfLocale,
): void {
  const cx = STAMP_CX;
  const cy = STAMP_CY;
  const r = STAMP_R;
  p.ops.push("q");
  p.circle(cx, cy, r, "f", C.white);
  p.circle(cx, cy, r, "S", C.stamp, 2.2);
  p.circle(cx, cy, r - 5, "S", C.accent, 1.05);
  p.circle(cx, cy, r - 8.5, "S", C.stamp, 0.5);
  p.textCenter("VEXIRA", cx, cy + 8, 8.5, true, C.stamp);
  p.textCenter("HOST", cx, cy - 4, 8, true, C.accent);
  p.line(cx - 14, cy - 9, cx + 14, cy - 9, C.stamp, 0.6);
  p.textCenter(copy.stampOfficial, cx, cy - 19, 6.2, true, C.stamp);
  const ref =
    invoiceNumber
      .replace(/[^A-Za-z0-9]/g, "")
      .slice(-6)
      .toUpperCase() || "VH";
  p.textCenter(ref, cx, cy - 30, 6, false, C.muted);
  const mark = status.toUpperCase() === "PAID" ? copy.stampPaid : dateShort(issued, locale);
  p.textCenter(mark, cx, cy - 39, 5.4, true, statusColor(status));
  p.ops.push("Q");
}

function buildContent(input: InvoicePdfInput, regular: EmbeddedFont, bold: EmbeddedFont): string {
  const locale: InvoicePdfLocale = input.locale ?? "en";
  const t = getInvoicePdfCopy(locale);
  const p = new Painter(regular, bold);
  const generatedAt = new Date();
  const issued = input.createdAt ?? input.dueDate;
  const amountPaid = Number((input.amountPaid ?? 0).toFixed(2));
  const amountDue = Number(
    (
      input.amountDue ??
      (input.status === "PAID" || input.status === "VOID"
        ? 0
        : Math.max(0, input.total - amountPaid))
    ).toFixed(2),
  );

  const headerH = 92;
  p.fillRect(0, PAGE_H - headerH, PAGE_W, headerH, C.navy);
  p.fillRect(0, PAGE_H - headerH - 3, PAGE_W, 3, C.accent);

  p.text("VEXIRA HOST", M, PAGE_H - 34, 18, true, C.white);
  p.text(`${t.companyLegal}  ·  vexirahost.com`, M, PAGE_H - 50, 8, false, C.headerMuted);
  p.text("billing@vexirahost.com", M, PAGE_H - 62, 8, false, C.headerMuted);

  p.textRight(t.documentTitle, PAGE_W - M, PAGE_H - 32, 16, true, C.white);
  p.textRight(input.invoiceNumber, PAGE_W - M, PAGE_H - 50, 10, true, "#7DD3FC");
  const st = t.status[input.status.toUpperCase()] ?? input.status;
  p.textRight(st, PAGE_W - M, PAGE_H - 66, 9, true, statusColor(input.status));

  let y = PAGE_H - headerH - 28;
  const colW = (PAGE_W - M * 2 - 24) / 2;
  p.text(t.from.toUpperCase(), M, y, 7.5, true, C.accent);
  p.text(t.billTo.toUpperCase(), M + colW + 24, y, 7.5, true, C.accent);

  y -= 16;
  p.text(t.companyLegal, M, y, 11, true, C.ink);
  const customer = input.customerName?.trim() || input.customerEmail;
  p.text(customer, M + colW + 24, y, 11, true, C.ink);

  y -= 14;
  p.text(t.companyLine, M, y, 8.5, false, C.body);
  p.text(input.customerEmail, M + colW + 24, y, 8.5, false, C.body);

  y -= 22;
  p.line(M, y, PAGE_W - M, y, C.line, 0.8);
  y -= 18;

  const meta = [
    { label: t.issued, value: dateShort(issued, locale) },
    { label: t.dueDate, value: dateShort(input.dueDate, locale) },
    { label: t.paidOn, value: input.paidAt ? dateShort(input.paidAt, locale) : "—" },
    { label: t.currency, value: input.currency.toUpperCase() },
  ];
  const metaW = (PAGE_W - M * 2) / 4;
  meta.forEach((item, i) => {
    const x = M + i * metaW;
    p.text(item.label.toUpperCase(), x, y, 7, true, C.muted);
    p.text(item.value, x, y - 13, 10, true, C.ink);
  });

  y -= 36;
  const tableX = M;
  const tableW = PAGE_W - M * 2;
  const colDesc = tableX + 10;
  const descMaxW = tableW - 230;
  const colQty = tableX + tableW - 196;
  const colUnitR = tableX + tableW - 108;
  const colAmtR = tableX + tableW - 10;
  const headH = 22;

  p.fillRect(tableX, y - headH, tableW, headH, C.navy);
  p.text(t.description, colDesc, y - 15, 8.5, true, C.white);
  p.text(t.qty, colQty, y - 15, 8.5, true, C.white);
  p.textRight(t.unit, colUnitR, y - 15, 8.5, true, C.white);
  p.textRight(t.amount, colAmtR, y - 15, 8.5, true, C.white);
  y -= headH;

  const contentFloor = STAMP_CY + STAMP_R + 56;

  for (let i = 0; i < input.items.length; i++) {
    const item = input.items[i]!;
    const lines = wrapText(regular, item.description, descMaxW, 9, 2);
    const rowH = Math.max(22, 10 + lines.length * 11);
    if (y - rowH < contentFloor) {
      p.text(t.moreItems(input.items.length - i), tableX + 10, y - 12, 8, false, C.muted);
      y -= 18;
      break;
    }
    y -= rowH;
    if (i % 2 === 0) p.fillRect(tableX, y, tableW, rowH, C.zebra);
    lines.forEach((line, li) => p.text(line, colDesc, y + rowH - 13 - li * 11, 9, false, C.ink));
    p.text(String(item.quantity), colQty, y + rowH / 2 - 3, 9, false, C.body);
    p.textRight(
      money(item.unitPrice, input.currency, locale),
      colUnitR,
      y + rowH / 2 - 3,
      9,
      false,
      C.body,
    );
    p.textRight(
      money(item.totalPrice, input.currency, locale),
      colAmtR,
      y + rowH / 2 - 3,
      9,
      true,
      C.ink,
    );
  }

  p.line(tableX, y, tableX + tableW, y, C.navy, 0.9);

  const boxW = 210;
  const boxX = PAGE_W - M - boxW;
  let ty = y - 20;
  p.text(t.subtotal, boxX, ty, 9.5, false, C.muted);
  p.textRight(money(input.subtotal, input.currency, locale), PAGE_W - M, ty, 9.5, false, C.ink);

  if (amountPaid > 0) {
    ty -= 15;
    p.text(t.amountPaid, boxX, ty, 9.5, false, C.paid);
    p.textRight(
      `−${money(amountPaid, input.currency, locale)}`,
      PAGE_W - M,
      ty,
      9.5,
      false,
      C.paid,
    );
  }

  ty -= 18;
  p.fillRect(boxX - 8, ty - 8, boxW + 8, 24, C.accent);
  p.text(t.amountDue, boxX, ty, 10, true, C.white);
  p.textRight(money(amountDue, input.currency, locale), PAGE_W - M, ty, 11, true, C.white);

  p.text(t.paymentNotes, M, STAMP_CY + 14, 8, true, C.accent);
  p.text(t.paymentHint, M, STAMP_CY, 8, false, C.body);
  p.text(t.support, M, STAMP_CY - 14, 8, false, C.muted);

  drawStamp(p, t, input.invoiceNumber, issued, input.status, locale);

  p.fillRect(0, 0, PAGE_W, FOOTER_H, C.navy);
  p.fillRect(0, FOOTER_H, PAGE_W, 2, C.accent);
  p.text(t.thanks, M, 26, 8.5, true, C.white);
  p.text(`${t.officialFooter}  ·  v${INVOICE_PDF_VERSION}`, M, 13, 7, false, C.headerMuted);
  p.textRight(
    `${t.generated} ${dateTime(generatedAt, locale)}`,
    PAGE_W - M,
    13,
    7,
    false,
    C.headerMuted,
  );

  return p.ops.join("\n");
}

function pdfLiteral(value: string): string {
  return `(${value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)")})`;
}

function cmapToUnicode(): string {
  // Identity mapping is enough for BMP when CID == Unicode code point.
  const body = [
    "/CIDInit /ProcSet findresource begin",
    "12 dict begin",
    "begincmap",
    "/CIDSystemInfo << /Registry (Adobe) /Ordering (UCS) /Supplement 0 >> def",
    "/CMapName /Adobe-Identity-UCS def",
    "/CMapType 2 def",
    "1 begincodespacerange <0000> <FFFF> endcodespacerange",
    "1 beginbfrange <0000> <FFFF> <0000> endbfrange",
    "endcmap",
    "CMapName currentdict /CMap defineresource pop",
    "end",
    "end",
  ].join("\n");
  return `<< /Length ${Buffer.byteLength(body, "utf8")} >>\nstream\n${body}\nendstream`;
}

function buildPdf(
  contentStream: string,
  regular: EmbeddedFont,
  bold: EmbeddedFont,
  input: InvoicePdfInput,
): Buffer {
  const compressedContent = deflateSync(Buffer.from(contentStream, "utf8"));
  const regularFile = deflateSync(regular.subset);
  const boldFile = deflateSync(bold.subset);
  const regularMap = deflateSync(regular.cidToGidMap);
  const boldMap = deflateSync(bold.cidToGidMap);

  const info = [
    `<< /Title ${pdfLiteral(`Invoice ${input.invoiceNumber}`)}`,
    `/Author ${pdfLiteral("Vexira Host")}`,
    `/Subject ${pdfLiteral("Official Vexira Host invoice")}`,
    `/Creator ${pdfLiteral("VexiraHost Billing")}`,
    `/Producer ${pdfLiteral(`VexiraHost Invoice PDF v${INVOICE_PDF_VERSION}`)} >>`,
  ].join(" ");

  const objects: (string | Buffer)[] = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Contents 4 0 R /Resources << /Font << /F1 5 0 R /F2 11 0 R >> >> >>",
    Buffer.concat([
      Buffer.from(
        `<< /Length ${compressedContent.length} /Filter /FlateDecode >>\nstream\n`,
        "utf8",
      ),
      compressedContent,
      Buffer.from("\nendstream", "utf8"),
    ]),
    `<< /Type /Font /Subtype /Type0 /BaseFont /${regular.descriptor.name} /Encoding /Identity-H /DescendantFonts [6 0 R] /ToUnicode 8 0 R >>`,
    `<< /Type /Font /Subtype /CIDFontType2 /BaseFont /${regular.descriptor.name} /CIDSystemInfo << /Registry (Adobe) /Ordering (Identity) /Supplement 0 >> /FontDescriptor 7 0 R /W [0 [${regular.widths.join(" ")}]] /CIDToGIDMap 9 0 R >>`,
    `<< /Type /FontDescriptor /FontName /${regular.descriptor.name} /Flags ${regular.descriptor.flags} /FontBBox [${regular.descriptor.bbox.join(" ")}] /ItalicAngle ${regular.descriptor.italicAngle} /Ascent ${regular.descriptor.ascent} /Descent ${regular.descriptor.descent} /CapHeight ${regular.descriptor.capHeight} /StemV ${regular.descriptor.stemV} /FontFile2 10 0 R >>`,
    cmapToUnicode(),
    Buffer.concat([
      Buffer.from(`<< /Length ${regularMap.length} /Filter /FlateDecode >>\nstream\n`, "utf8"),
      regularMap,
      Buffer.from("\nendstream", "utf8"),
    ]),
    Buffer.concat([
      Buffer.from(
        `<< /Length ${regularFile.length} /Length1 ${regular.subset.length} /Filter /FlateDecode >>\nstream\n`,
        "utf8",
      ),
      regularFile,
      Buffer.from("\nendstream", "utf8"),
    ]),
    `<< /Type /Font /Subtype /Type0 /BaseFont /${bold.descriptor.name} /Encoding /Identity-H /DescendantFonts [12 0 R] /ToUnicode 14 0 R >>`,
    `<< /Type /Font /Subtype /CIDFontType2 /BaseFont /${bold.descriptor.name} /CIDSystemInfo << /Registry (Adobe) /Ordering (Identity) /Supplement 0 >> /FontDescriptor 13 0 R /W [0 [${bold.widths.join(" ")}]] /CIDToGIDMap 15 0 R >>`,
    `<< /Type /FontDescriptor /FontName /${bold.descriptor.name} /Flags ${bold.descriptor.flags} /FontBBox [${bold.descriptor.bbox.join(" ")}] /ItalicAngle ${bold.descriptor.italicAngle} /Ascent ${bold.descriptor.ascent} /Descent ${bold.descriptor.descent} /CapHeight ${bold.descriptor.capHeight} /StemV ${bold.descriptor.stemV} /FontFile2 16 0 R >>`,
    cmapToUnicode(),
    Buffer.concat([
      Buffer.from(`<< /Length ${boldMap.length} /Filter /FlateDecode >>\nstream\n`, "utf8"),
      boldMap,
      Buffer.from("\nendstream", "utf8"),
    ]),
    Buffer.concat([
      Buffer.from(
        `<< /Length ${boldFile.length} /Length1 ${bold.subset.length} /Filter /FlateDecode >>\nstream\n`,
        "utf8",
      ),
      boldFile,
      Buffer.from("\nendstream", "utf8"),
    ]),
    info,
  ];

  const chunks: Buffer[] = [Buffer.from("%PDF-1.4\n", "utf8")];
  const offsets: number[] = [0];
  let size = chunks[0]!.length;
  objects.forEach((body, index) => {
    offsets.push(size);
    const header = Buffer.from(`${index + 1} 0 obj\n`, "utf8");
    const payload =
      typeof body === "string"
        ? Buffer.from(`${body}\nendobj\n`, "utf8")
        : Buffer.concat([body, Buffer.from("\nendobj\n", "utf8")]);
    chunks.push(header, payload);
    size += header.length + payload.length;
  });

  const xrefOffset = size;
  let xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= objects.length; i++) {
    xref += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  xref += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R /Info 17 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  chunks.push(Buffer.from(xref, "utf8"));
  return Buffer.concat(chunks);
}

export function buildInvoicePdf(input: InvoicePdfInput): Buffer {
  const locale: InvoicePdfLocale = input.locale ?? "en";
  const texts = collectTexts(input, locale);
  const regular = embedFontSubset(fontPath("NotoSans-Regular.ttf"), texts, false);
  const bold = embedFontSubset(fontPath("NotoSans-Bold.ttf"), texts, true);
  const content = buildContent(input, regular, bold);
  return buildPdf(content, regular, bold, { ...input, locale });
}
