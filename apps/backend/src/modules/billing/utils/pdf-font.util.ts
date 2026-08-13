/**
 * Minimal TrueType subsetter for PDF Type0/CID embedding.
 * Supports Unicode BMP (AZ / TR / EN / RU) via cmap format 4.
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

interface ParsedFont {
  buffer: Buffer;
  unitsPerEm: number;
  ascent: number;
  descent: number;
  capHeight: number;
  bbox: [number, number, number, number];
  italicAngle: number;
  glyphWidths: number[];
  glyphCount: number;
  loca: number[];
  glyfOffset: number;
}

const parsedCache = new Map<string, ParsedFont>();

function readU16(buf: Buffer, offset: number): number {
  return buf.readUInt16BE(offset);
}

function readI16(buf: Buffer, offset: number): number {
  return buf.readInt16BE(offset);
}

function readU32(buf: Buffer, offset: number): number {
  return buf.readUInt32BE(offset);
}

function findTable(buf: Buffer, tag: string): { offset: number; length: number } | null {
  const count = readU16(buf, 4);
  for (let i = 0; i < count; i++) {
    const o = 12 + i * 16;
    if (buf.toString("ascii", o, o + 4) === tag) {
      return { offset: readU32(buf, o + 8), length: readU32(buf, o + 12) };
    }
  }
  return null;
}

function parseFont(filePath: string): ParsedFont {
  const cached = parsedCache.get(filePath);
  if (cached) return cached;
  const buf = readFileSync(filePath);

  const head = findTable(buf, "head");
  const hhea = findTable(buf, "hhea");
  const maxp = findTable(buf, "maxp");
  const hmtx = findTable(buf, "hmtx");
  const loca = findTable(buf, "loca");
  const glyf = findTable(buf, "glyf");
  const cmap = findTable(buf, "cmap");
  const os2 = findTable(buf, "OS/2");
  const post = findTable(buf, "post");
  if (!head || !hhea || !maxp || !hmtx || !loca || !glyf || !cmap) {
    throw new Error(`Incomplete TrueType font: ${filePath}`);
  }

  const unitsPerEm = readU16(buf, head.offset + 18);
  const xMin = readI16(buf, head.offset + 36);
  const yMin = readI16(buf, head.offset + 38);
  const xMax = readI16(buf, head.offset + 40);
  const yMax = readI16(buf, head.offset + 42);
  const locaIsLong = readU16(buf, head.offset + 50) === 1;
  const ascent = readI16(buf, hhea.offset + 4);
  const descent = readI16(buf, hhea.offset + 6);
  const numberOfHMetrics = readU16(buf, hhea.offset + 34);
  const glyphCount = readU16(buf, maxp.offset + 4);

  const glyphWidths: number[] = [];
  for (let i = 0; i < glyphCount; i++) {
    if (i < numberOfHMetrics) {
      glyphWidths.push(readU16(buf, hmtx.offset + i * 4));
    } else {
      glyphWidths.push(glyphWidths[numberOfHMetrics - 1] ?? unitsPerEm);
    }
  }

  const locaOffsets: number[] = [];
  for (let i = 0; i <= glyphCount; i++) {
    locaOffsets.push(
      locaIsLong ? readU32(buf, loca.offset + i * 4) : readU16(buf, loca.offset + i * 2) * 2,
    );
  }

  const cmapOffset = cmap.offset;
  const numTables = readU16(buf, cmapOffset + 2);
  let hasFormat4 = false;
  for (let i = 0; i < numTables; i++) {
    const rec = cmapOffset + 4 + i * 8;
    const subOffset = cmapOffset + readU32(buf, rec + 4);
    if (readU16(buf, subOffset) === 4) {
      hasFormat4 = true;
      break;
    }
  }
  if (!hasFormat4) throw new Error("Font has no Unicode cmap format 4");

  let capHeight = ascent;
  if (os2 && os2.length >= 88) {
    capHeight = readI16(buf, os2.offset + 88) || ascent;
  }
  const italicAngle = post
    ? readI16(buf, post.offset + 4) + readU16(buf, post.offset + 6) / 65536
    : 0;

  const parsed: ParsedFont = {
    buffer: buf,
    unitsPerEm,
    ascent,
    descent,
    capHeight,
    bbox: [xMin, yMin, xMax, yMax],
    italicAngle,
    glyphWidths,
    glyphCount,
    loca: locaOffsets,
    glyfOffset: glyf.offset,
  };
  parsedCache.set(filePath, parsed);
  return parsed;
}

function glyphForCodeSafe(font: ParsedFont, code: number): number {
  const buf = font.buffer;
  const cmap = findTable(buf, "cmap");
  if (!cmap) return 0;
  const numTables = readU16(buf, cmap.offset + 2);
  let sub: number | null = null;
  for (let i = 0; i < numTables; i++) {
    const rec = cmap.offset + 4 + i * 8;
    const platform = readU16(buf, rec);
    const encoding = readU16(buf, rec + 2);
    const off = cmap.offset + readU32(buf, rec + 4);
    if (readU16(buf, off) === 4 && platform === 3 && encoding === 1) {
      sub = off;
      break;
    }
    if (readU16(buf, off) === 4 && sub == null) sub = off;
  }
  if (sub == null) return 0;
  const segCount = readU16(buf, sub + 6) / 2;
  const endCodes = sub + 14;
  const startCodes = endCodes + 2 * segCount + 2;
  const idDelta = startCodes + 2 * segCount;
  const idRangeOffset = idDelta + 2 * segCount;
  for (let i = 0; i < segCount; i++) {
    const end = readU16(buf, endCodes + i * 2);
    const start = readU16(buf, startCodes + i * 2);
    if (code < start || code > end) continue;
    const ro = readU16(buf, idRangeOffset + i * 2);
    const delta = readI16(buf, idDelta + i * 2);
    if (ro === 0) return (code + delta) & 0xffff;
    const glyphOffset = idRangeOffset + i * 2 + ro + (code - start) * 2;
    const gid = readU16(buf, glyphOffset);
    return gid === 0 ? 0 : (gid + delta) & 0xffff;
  }
  return 0;
}

function collectComposite(font: ParsedFont, glyphId: number, into: Set<number>): void {
  if (into.has(glyphId) || glyphId >= font.glyphCount) return;
  into.add(glyphId);
  const start = font.loca[glyphId] ?? 0;
  const end = font.loca[glyphId + 1] ?? start;
  if (end <= start) return;
  const glyf = font.buffer.subarray(font.glyfOffset + start, font.glyfOffset + end);
  if (glyf.length < 2) return;
  const numberOfContours = glyf.readInt16BE(0);
  if (numberOfContours >= 0) return;
  let offset = 10;

  while (true) {
    if (offset + 4 > glyf.length) break;
    const flags = glyf.readUInt16BE(offset);
    const child = glyf.readUInt16BE(offset + 2);
    collectComposite(font, child, into);
    offset += 4;
    if (flags & 1) offset += 4;
    else offset += 2;
    if (flags & 8) offset += 2;
    else if (flags & 64) offset += 4;
    else if (flags & 128) offset += 8;
    if (!(flags & 32)) break;
  }
}

function checksum(buf: Buffer): number {
  const padded = Buffer.concat([buf, Buffer.alloc((4 - (buf.length % 4)) % 4)]);
  let sum = 0;
  for (let i = 0; i < padded.length; i += 4) {
    sum = (sum + padded.readUInt32BE(i)) >>> 0;
  }
  return sum;
}

function buildSubsetFont(font: ParsedFont, glyphSlots: number[]): Buffer {
  /** glyphSlots[cid] = original glyph id. CID 0 is always .notdef */
  const glyphs = glyphSlots;
  const usedOriginal = new Set(glyphs);
  const oldToNew = new Map<number, number>();
  glyphs.forEach((id, cid) => {
    if (!oldToNew.has(id)) oldToNew.set(id, cid);
  });
  void usedOriginal;

  const glyfParts: Buffer[] = [];
  const locaOffsets: number[] = [0];
  for (const gid of glyphs) {
    const start = font.loca[gid] ?? 0;
    const end = font.loca[gid + 1] ?? start;
    let slice = font.buffer.subarray(font.glyfOffset + start, font.glyfOffset + end);
    if (slice.length >= 12 && slice.readInt16BE(0) < 0) {
      const rewritten = Buffer.from(slice);
      let offset = 10;

      while (true) {
        if (offset + 4 > rewritten.length) break;
        const flags = rewritten.readUInt16BE(offset);
        const child = rewritten.readUInt16BE(offset + 2);
        rewritten.writeUInt16BE(oldToNew.get(child) ?? 0, offset + 2);
        offset += 4;
        if (flags & 1) offset += 4;
        else offset += 2;
        if (flags & 8) offset += 2;
        else if (flags & 64) offset += 4;
        else if (flags & 128) offset += 8;
        if (!(flags & 32)) break;
      }
      slice = rewritten;
    }
    const pad = (4 - (slice.length % 4)) % 4;
    glyfParts.push(slice);
    if (pad) glyfParts.push(Buffer.alloc(pad));
    locaOffsets.push(locaOffsets[locaOffsets.length - 1]! + slice.length + pad);
  }
  const glyfBuf = Buffer.concat(glyfParts);
  const locaBuf = Buffer.alloc((glyphs.length + 1) * 4);
  locaOffsets.forEach((off, i) => locaBuf.writeUInt32BE(off, i * 4));

  const hheaSrc = findTable(font.buffer, "hhea")!;
  const hhea = Buffer.from(font.buffer.subarray(hheaSrc.offset, hheaSrc.offset + hheaSrc.length));
  hhea.writeUInt16BE(glyphs.length, 34);

  const hmtx = Buffer.alloc(glyphs.length * 4);
  glyphs.forEach((gid, i) => {
    hmtx.writeUInt16BE(font.glyphWidths[gid] ?? font.unitsPerEm, i * 4);
  });

  const maxpSrc = findTable(font.buffer, "maxp")!;
  const maxp = Buffer.from(
    font.buffer.subarray(maxpSrc.offset, maxpSrc.offset + Math.min(maxpSrc.length, 32)),
  );
  maxp.writeUInt16BE(glyphs.length, 4);

  const headSrc = findTable(font.buffer, "head")!;
  const head = Buffer.from(font.buffer.subarray(headSrc.offset, headSrc.offset + headSrc.length));
  head.writeUInt16BE(1, 50); // indexToLocFormat long
  head.writeUInt32BE(0, 8); // checksumAdjustment

  const copyTable = (tag: string): Buffer | null => {
    const t = findTable(font.buffer, tag);
    return t ? Buffer.from(font.buffer.subarray(t.offset, t.offset + t.length)) : null;
  };

  const tables: { tag: string; data: Buffer }[] = [
    { tag: "head", data: head },
    { tag: "hhea", data: hhea },
    { tag: "maxp", data: maxp },
    { tag: "hmtx", data: hmtx },
    { tag: "loca", data: locaBuf },
    { tag: "glyf", data: glyfBuf },
  ];
  for (const tag of ["cvt ", "fpgm", "prep", "gasp", "name", "OS/2", "post"]) {
    const data = copyTable(tag);
    if (data) tables.push({ tag, data });
  }
  tables.sort((a, b) => (a.tag < b.tag ? -1 : 1));

  const headerSize = 12 + tables.length * 16;
  let offset = headerSize;
  const records: { tag: string; data: Buffer; check: number; offset: number }[] = [];
  for (const table of tables) {
    const pad = (4 - (table.data.length % 4)) % 4;
    const data = pad ? Buffer.concat([table.data, Buffer.alloc(pad)]) : table.data;
    records.push({ tag: table.tag, data, check: checksum(data), offset });
    offset += data.length;
  }

  const out = Buffer.alloc(offset);
  const entrySelector = Math.floor(Math.log2(tables.length));
  const searchRange = 16 * 2 ** entrySelector;
  out.writeUInt32BE(0x00010000, 0);
  out.writeUInt16BE(tables.length, 4);
  out.writeUInt16BE(searchRange, 6);
  out.writeUInt16BE(entrySelector, 8);
  out.writeUInt16BE(tables.length * 16 - searchRange, 10);

  records.forEach((rec, i) => {
    const o = 12 + i * 16;
    out.write(rec.tag.padEnd(4, " "), o, 4, "ascii");
    out.writeUInt32BE(rec.check, o + 4);
    out.writeUInt32BE(rec.offset, o + 8);
    out.writeUInt32BE(tables[i]!.data.length, o + 12);
    rec.data.copy(out, rec.offset);
  });

  const headTable = records.find((r) => r.tag === "head");
  if (headTable) {
    const whole = checksum(out);
    out.writeUInt32BE((0xb1b0afba - whole) >>> 0, headTable.offset + 8);
  }
  return out;
}

export interface EmbeddedFont {
  subset: Buffer;
  widths: number[];
  cidToGidMap: Buffer;
  toPdf: (text: string) => string;
  widthOf: (text: string, size: number) => number;
  descriptor: {
    name: string;
    ascent: number;
    descent: number;
    capHeight: number;
    italicAngle: number;
    bbox: [number, number, number, number];
    stemV: number;
    flags: number;
  };
}

export function embedFontSubset(filePath: string, texts: string[], bold: boolean): EmbeddedFont {
  const font = parseFont(filePath);
  const charToOriginal = new Map<number, number>();
  const neededOriginal = new Set<number>([0]);

  const addChar = (code: number) => {
    if (code > 0xffff) return;
    if (charToOriginal.has(code)) return;
    const gid = glyphForCodeSafe(font, code);
    charToOriginal.set(code, gid);
    collectComposite(font, gid, neededOriginal);
  };

  addChar(32);
  for (const text of texts) {
    for (const ch of text) addChar(ch.codePointAt(0) ?? 32);
  }

  const orderedOriginal = Array.from(neededOriginal).sort((a, b) => a - b);
  if (orderedOriginal[0] !== 0) orderedOriginal.unshift(0);
  const originalToNew = new Map<number, number>();
  orderedOriginal.forEach((gid, i) => originalToNew.set(gid, i));

  const subset = buildSubsetFont(font, orderedOriginal);
  const maxCid = Math.max(32, ...charToOriginal.keys());
  const cidToGidMap = Buffer.alloc((maxCid + 1) * 2);
  const widths: number[] = Array.from({ length: maxCid + 1 }, () =>
    Math.round(((font.glyphWidths[0] ?? font.unitsPerEm) * 1000) / font.unitsPerEm),
  );

  for (const [code, originalGid] of charToOriginal) {
    const newGid = originalToNew.get(originalGid) ?? 0;
    cidToGidMap.writeUInt16BE(newGid, code * 2);
    widths[code] = Math.round(
      ((font.glyphWidths[originalGid] ?? font.unitsPerEm) * 1000) / font.unitsPerEm,
    );
  }

  const hash = createHash("md5").update(subset).digest("hex").slice(0, 8).toUpperCase();
  const name = `${bold ? "NotoSans-Bold" : "NotoSans"}-${hash}`;

  return {
    subset,
    widths,
    cidToGidMap,
    toPdf: (text: string) => {
      let out = "<";
      for (const ch of text) {
        const cp = ch.codePointAt(0) ?? 32;
        out += (cp > 0xffff ? 32 : cp).toString(16).padStart(4, "0");
      }
      return `${out}>`;
    },
    widthOf: (text: string, size: number) => {
      let w = 0;
      for (const ch of text) {
        const cp = ch.codePointAt(0) ?? 32;
        w += widths[cp] ?? widths[32] ?? 500;
      }
      return (w * size) / 1000;
    },
    descriptor: {
      name,
      ascent: Math.round((font.ascent * 1000) / font.unitsPerEm),
      descent: Math.round((font.descent * 1000) / font.unitsPerEm),
      capHeight: Math.round((font.capHeight * 1000) / font.unitsPerEm),
      italicAngle: font.italicAngle,
      bbox: font.bbox.map((v) => Math.round((v * 1000) / font.unitsPerEm)) as [
        number,
        number,
        number,
        number,
      ],
      stemV: bold ? 120 : 80,
      flags: bold ? 4 : 32,
    },
  };
}
