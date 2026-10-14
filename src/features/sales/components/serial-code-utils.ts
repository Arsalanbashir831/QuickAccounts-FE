export interface SerialLine {
  id: string;
  qty: number;
  stock: number;
  serials: string[];
}

const serialHeaders = new Set(["serial", "serialnumber", "serialbarcode", "serialorbarcode", "barcode", "barcodeorserial", "imei", "code"]);

const cellText = (value: unknown) => value === null || value === undefined ? "" : String(value).trim();

export function serialsFromRows(rows: readonly (readonly unknown[])[]): string[] {
  if (rows.length === 0) return [];
  const first = rows[0];
  const headerIndex = first.findIndex((cell) => serialHeaders.has(cellText(cell).toLowerCase().replace(/[^a-z]/g, "")));
  const column = headerIndex >= 0 ? headerIndex : 0;
  return rows.slice(headerIndex >= 0 ? 1 : 0).map((row) => cellText(row[column])).filter(Boolean);
}

export function parseCsvRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  const source = text.replace(/^\uFEFF/, "");

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    if (character === '"') {
      if (quoted && source[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === "," && !quoted) {
      row.push(cell);
      cell = "";
    } else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && source[index + 1] === "\n") index += 1;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += character;
    }
  }
  if (quoted) throw new Error("The CSV has an unclosed quoted value.");
  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

export function serialsFromPaste(text: string): string[] {
  return serialsFromRows(text.split(/\r?\n/).map((line) => line.split("\t")));
}

export function addSerialCodes<T extends SerialLine>(items: readonly T[], itemId: string, codes: readonly string[]) {
  const used = new Set(items.flatMap((item) => item.serials.map((serial) => serial.trim()).filter(Boolean)));
  let accepted = 0;
  let duplicates = 0;
  let overCapacity = 0;
  let lastIndex = -1;
  const next = items.map((item) => {
    if (item.id !== itemId) return item;
    const serials = [...item.serials];
    for (const rawCode of codes) {
      const code = rawCode.trim();
      if (!code) continue;
      if (used.has(code)) {
        duplicates += 1;
        continue;
      }
      let index = serials.findIndex((serial) => !serial.trim());
      if (index === -1) {
        if (serials.length >= item.stock) {
          overCapacity += 1;
          continue;
        }
        index = serials.length;
        serials.push("");
      }
      serials[index] = code;
      used.add(code);
      accepted += 1;
      lastIndex = index;
    }
    return { ...item, qty: serials.length, serials };
  });
  return { items: next, accepted, duplicates, overCapacity, lastIndex };
}

export function pasteSerialCodes<T extends SerialLine>(items: readonly T[], itemId: string, startIndex: number, codes: readonly string[]) {
  const target = items.find((item) => item.id === itemId);
  if (!target) return { items: [...items], accepted: 0, duplicates: 0, overCapacity: 0, lastIndex: -1 };
  const used = new Set(items.flatMap((item) => item.serials.flatMap((serial, index) =>
    item.id === itemId && index >= startIndex && index < startIndex + codes.length ? [] : serial.trim() ? [serial.trim()] : [],
  )));
  const serials = [...target.serials];
  let accepted = 0;
  let duplicates = 0;
  let overCapacity = 0;
  let lastIndex = -1;

  codes.forEach((rawCode, offset) => {
    const code = rawCode.trim();
    if (!code) return;
    const index = startIndex + offset;
    if (index >= target.stock) {
      overCapacity += 1;
      return;
    }
    if (used.has(code)) {
      duplicates += 1;
      return;
    }
    while (serials.length <= index) serials.push("");
    serials[index] = code;
    used.add(code);
    accepted += 1;
    lastIndex = index;
  });

  return {
    items: items.map((item) => item.id === itemId ? { ...item, qty: serials.length, serials } : item),
    accepted,
    duplicates,
    overCapacity,
    lastIndex,
  };
}
