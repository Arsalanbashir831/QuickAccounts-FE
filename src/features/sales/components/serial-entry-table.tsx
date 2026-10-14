"use client";

import { useRef, useState, type ChangeEvent, type ClipboardEvent, type KeyboardEvent } from "react";
import { FileSpreadsheet, ScanLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { parseCsvRows, serialsFromPaste, serialsFromRows } from "./serial-code-utils";

interface BatchResult {
  accepted: number;
  duplicates: number;
  overCapacity: number;
  lastIndex: number;
}

interface SerialEntryTableProps {
  itemId: string;
  productName: string;
  qty: number;
  stock: number;
  stockLabel?: string;
  capacityLabel?: string;
  serials: string[];
  duplicateSerials: ReadonlySet<string>;
  onChange: (index: number, value: string) => void;
  onAddCodes: (codes: string[]) => BatchResult;
  onPasteCodes: (startIndex: number, codes: string[]) => BatchResult;
}

export const SerialEntryTable = ({
  itemId,
  productName,
  qty,
  stock,
  stockLabel,
  capacityLabel = "stock limit",
  serials,
  duplicateSerials,
  onChange,
  onAddCodes,
  onPasteCodes,
}: SerialEntryTableProps) => {
  const [scanValue, setScanValue] = useState("");
  const [notice, setNotice] = useState("");
  const [isReading, setIsReading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const scanRef = useRef<HTMLInputElement>(null);

  const captured = serials.filter((serial) => serial.trim()).length;

  const showResult = (result: BatchResult) => {
    const parts = [`${result.accepted} ${result.accepted === 1 ? "code" : "codes"} added`];
    if (result.duplicates) parts.push(`${result.duplicates} duplicate ${result.duplicates === 1 ? "skipped" : "codes skipped"}`);
    if (result.overCapacity) parts.push(`${result.overCapacity} over ${capacityLabel}`);
    setNotice(`${parts.join(" · ")}.`);
    if (result.lastIndex >= 0 && typeof requestAnimationFrame === "function") {
      requestAnimationFrame(() => {
        document.getElementById(`serial-${itemId}-${result.lastIndex}`)?.scrollIntoView?.({ block: "nearest" });
      });
    }
  };

  const handleScan = () => {
    const codes = serialsFromPaste(scanValue);
    if (codes.length === 0) return;
    showResult(onAddCodes(codes));
    setScanValue("");
    scanRef.current?.focus();
  };

  const handlePaste = (event: ClipboardEvent<HTMLInputElement>, index: number) => {
    const text = event.clipboardData.getData("text/plain");
    if (!/[\r\n\t]/.test(text)) return;
    event.preventDefault();
    const codes = serialsFromPaste(text);
    if (codes.length > 0) showResult(onPasteCodes(index, codes));
  };

  const handleFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const extension = file.name.split(".").at(-1)?.toLowerCase();
    if (extension !== "csv" && extension !== "xlsx") {
      setNotice("Choose a .csv or .xlsx file.");
      event.target.value = "";
      return;
    }
    if (file.size > 5_000_000) {
      setNotice("The file is too large. Use a file under 5 MB.");
      event.target.value = "";
      return;
    }

    setIsReading(true);
    try {
      const rows = extension === "csv"
        ? parseCsvRows(await file.text())
        : await import("read-excel-file/browser").then(({ readSheet }) => readSheet(file));
      const codes = serialsFromRows(rows);
      if (codes.length === 0) {
        setNotice("No serial or barcode values were found in the first sheet.");
      } else {
        showResult(onAddCodes(codes));
      }
    } catch (error) {
      setNotice(error instanceof Error ? `Could not read file: ${error.message}` : "Could not read this file.");
    } finally {
      setIsReading(false);
      event.target.value = "";
    }
  };

  return (
    <section className="mt-4 overflow-hidden rounded-lg border bg-card" aria-label={`${productName} serial and barcode table`}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-muted/30 px-3 py-3 sm:px-4">
        <div>
          <h4 className="text-sm font-semibold text-heading">Serial / barcode register</h4>
          <p className="text-xs text-muted-foreground">{captured} of {qty} captured · {stockLabel ?? `${stock} available in stock`}</p>
        </div>
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          <div className="relative min-w-[12rem] flex-1 sm:w-52 sm:flex-none">
            <ScanLine aria-hidden="true" className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              ref={scanRef}
              aria-label={`Scan serial or barcode for ${productName}`}
              value={scanValue}
              onChange={(event) => setScanValue(event.target.value)}
              onKeyDown={(event: KeyboardEvent<HTMLInputElement>) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  handleScan();
                }
              }}
              onPaste={(event) => {
                const text = event.clipboardData.getData("text/plain");
                if (!/[\r\n\t]/.test(text)) return;
                event.preventDefault();
                showResult(onAddCodes(serialsFromPaste(text)));
                setScanValue("");
              }}
              placeholder="Scan code, then Enter"
              autoComplete="off"
              spellCheck={false}
              className="h-9 pl-8 font-mono text-sm"
            />
          </div>
          <Button type="button" variant="outline" size="sm" disabled={isReading} onClick={() => fileRef.current?.click()}>
            <FileSpreadsheet className="size-4" />
            {isReading ? "Reading…" : "Upload CSV / Excel"}
          </Button>
          <input ref={fileRef} type="file" accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={handleFile} className="sr-only" aria-label={`Upload codes for ${productName}`} tabIndex={-1} />
        </div>
      </div>

      <div className="max-h-80 overflow-auto">
        <table className="w-full table-fixed border-collapse text-sm">
          <thead className="sticky top-0 z-10 bg-[#f4f4f5] text-left text-xs text-muted-foreground">
            <tr><th scope="col" className="w-14 border-b px-3 py-2 font-semibold">#</th><th scope="col" className="border-b px-3 py-2 font-semibold">Serial / barcode</th><th scope="col" className="w-24 border-b px-3 py-2 font-semibold">Status</th></tr>
          </thead>
          <tbody>
            {serials.map((serial, index) => {
              const duplicate = Boolean(serial.trim() && duplicateSerials.has(serial.trim()));
              return (
                <tr key={index} className="border-b last:border-b-0 odd:bg-white even:bg-muted/20">
                  <th scope="row" className="px-3 py-1.5 text-left font-mono text-xs font-medium text-muted-foreground">{index + 1}</th>
                  <td className="px-2 py-1">
                    <Input
                      id={`serial-${itemId}-${index}`}
                      aria-label={`${productName} unit ${index + 1} serial or barcode`}
                      aria-invalid={duplicate}
                      value={serial}
                      onChange={(event) => onChange(index, event.target.value)}
                      onPaste={(event) => handlePaste(event, index)}
                      onKeyDown={(event) => {
                        if (event.key !== "Enter") return;
                        event.preventDefault();
                        const next = document.getElementById(`serial-${itemId}-${index + 1}`) ?? scanRef.current;
                        next?.focus();
                      }}
                      placeholder="Scan, paste, or type"
                      autoComplete="off"
                      spellCheck={false}
                      className="h-8 w-full border-transparent bg-transparent px-2 font-mono text-sm shadow-none focus-visible:border-ring"
                    />
                  </td>
                  <td className={`px-3 py-1.5 text-xs font-medium ${duplicate ? "text-destructive" : serial.trim() ? "text-success" : "text-muted-foreground"}`}>
                    {duplicate ? "Duplicate" : serial.trim() ? "Ready" : "Empty"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 border-t bg-muted/20 px-3 py-2 text-xs text-muted-foreground sm:px-4">
        <span>Paste an Excel column into a row, or upload a file with a “Serial” or “Barcode” column.</span>
        <span>Format Excel codes as text to preserve leading zeros.</span>
      </div>
      {notice ? <p role="status" className="border-t px-3 py-2 text-xs text-heading sm:px-4">{notice}</p> : null}
    </section>
  );
};
