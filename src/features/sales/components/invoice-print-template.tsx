"use client";

import { useRef, useState } from "react";
import { Printer, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CompanySettings } from "@/features/settings/settings-store";

export interface PrintableInvoice {
  reference: string;
  date: string;
  customer: string;
  outlet: string;
  total: number;
  paid: number;
  balance: number;
  status: "Paid" | "Partial" | "Overdue" | "Unpaid";
  paymentMethod: "cash" | "bank" | "credit";
  bankAccount?: string;
  discount?: number;
  tax?: number;
  taxRate?: number;
  taxInclusive?: boolean;
  notes?: string;
  items: Array<{
    sku?: string;
    name: string;
    qty: number;
    price: number;
    serial?: string;
    serials?: string[];
    warranty?: { length: number; unit: "days" | "months" | "years" };
  }>;
}

interface InvoicePrintTemplateProps {
  invoice: PrintableInvoice;
  business?: CompanySettings["business"];
  onClose: () => void;
}

const paymentLabels: Record<PrintableInvoice["paymentMethod"], string> = {
  cash: "Cash",
  bank: "Card / Bank",
  credit: "Store Credit",
};

const money = (amount: number) => `PKR ${amount.toLocaleString("en-PK")}`;

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (character) => ({
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
})[character] ?? character);

const warrantyLabel = (length: number, unit: "days" | "months" | "years") =>
  `${length} ${length === 1 ? unit.slice(0, -1) : unit} warranty`;

// The preview and browser PDF print the same document.
function buildInvoiceHTML(invoice: PrintableInvoice, business?: CompanySettings["business"]): string {
  const subtotal = invoice.items.reduce((sum, item) => sum + item.price * item.qty, 0);
  const rows = invoice.items.map((item, index) => {
    const serials = item.serials ?? (item.serial ? [item.serial] : []);
    return `<tr>
      <td class="index">${index + 1}</td>
      <td><strong>${escapeHtml(item.name)}</strong>
        ${serials.length > 12 ? `<div class="detail">${serials.length} serial / barcode values listed below</div>` : serials.length ? `<div class="detail">Serial / barcode: ${serials.map(escapeHtml).join(", ")}</div>` : ""}
        ${item.warranty ? `<div class="detail">${warrantyLabel(item.warranty.length, item.warranty.unit)}</div>` : ""}
      </td>
      <td class="center">${item.qty}</td>
      <td class="amount">${money(item.price)}</td>
      <td class="amount strong">${money(item.price * item.qty)}</td>
    </tr>`;
  }).join("");
  const serialAppendix = invoice.items.flatMap((item) => {
    const serials = item.serials ?? (item.serial ? [item.serial] : []);
    if (serials.length <= 12) return [];
    const codeRows = Array.from({ length: Math.ceil(serials.length / 3) }, (_, rowIndex) => `<tr>${Array.from({ length: 3 }, (_, columnIndex) => {
      const index = rowIndex * 3 + columnIndex;
      return `<td>${serials[index] ? `<span class="serial-index">${index + 1}.</span> ${escapeHtml(serials[index])}` : ""}</td>`;
    }).join("")}</tr>`).join("");
    return [`<section class="serial-appendix"><h2>${escapeHtml(item.name)} · serial / barcode register</h2><table class="serial-table"><tbody>${codeRows}</tbody></table></section>`];
  }).join("");
  const statusClass = invoice.status === "Paid" ? "paid" : invoice.status === "Partial" ? "partial" : "unpaid";
  const balance = invoice.balance > 0
    ? `<div class="total-line balance"><span>Balance due</span><strong>${money(invoice.balance)}</strong></div>`
    : "";
  const notes = invoice.notes?.trim()
    ? `<section class="notes"><h2>Additional notes</h2><p>${escapeHtml(invoice.notes.trim()).replace(/\n/g, "<br>")}</p></section>`
    : "";
  const businessName = escapeHtml(business?.name.trim() || "Northstar Traders");
  const logo = business?.logoDataUrl ? `<img class="logo" src="${escapeHtml(business.logoDataUrl)}" alt="${businessName}">` : "";
  const businessMeta = [business?.legalName, business?.address, business?.phone, business?.email, business?.registrationNumber ? `Registration: ${business.registrationNumber}` : undefined, business?.taxNumber ? `Tax no.: ${business.taxNumber}` : undefined]
    .map((line) => line?.trim())
    .filter((line): line is string => Boolean(line))
    .map(escapeHtml)
    .join("<br>");
  const taxLabel = `Sales tax (${invoice.taxRate ?? 5}%${invoice.taxInclusive ? ", included" : ""})`;

  return `<!doctype html>
<html lang="en"><head>
  <meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Invoice ${escapeHtml(invoice.reference)}</title>
  <style>
    @page { size: A4 portrait; margin: 15mm 16mm; }
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; background: #fff; color: #111; }
    body { font: 10pt/1.4 "Avenir Next", Avenir, "Segoe UI", sans-serif; font-feature-settings: "kern" 1, "liga" 1; text-rendering: optimizeLegibility; }
    .sheet { width: 210mm; min-height: 297mm; padding: 15mm 16mm; background: #fff; }
    .header { display: flex; justify-content: space-between; gap: 12mm; padding-bottom: 8mm; border-bottom: 2.5pt solid #ea580c; }
    .logo { display: block; width: auto; max-width: 42mm; height: 12mm; object-fit: contain; object-position: left center; margin-bottom: 3mm; }
    .company-name { font-weight: 700; font-size: 10pt; }
    .company-meta { color: #565b63; font-size: 8pt; line-height: 1.6; }
    .document-heading { text-align: right; flex: none; }
    .document-heading h1 { margin: 0; color: #ea580c; font-size: 24pt; line-height: 1.05; letter-spacing: .07em; }
    .reference { display: inline-block; margin: 2mm 0 3mm; padding: 1.5mm 3mm; border-radius: 1mm; background: #ea580c; color: #fff; font-weight: 700; font-size: 9pt; }
    .meta { font-size: 8pt; line-height: 1.7; }
    .meta span { color: #717782; }
    .status { font-weight: 700; }
    .status.paid { color: #16803a; }
    .status.partial { color: #a36500; }
    .status.unpaid { color: #b42318; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8mm; margin: 8mm 0; }
    .info-box { min-height: 24mm; padding: 4mm 5mm; background: #f5f5f6; border-radius: 1.5mm; }
    .info-box:first-child { border-left: 1mm solid #ea580c; }
    .eyebrow { margin-bottom: 2mm; color: #a74706; font-size: 7pt; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; }
    .info-box strong { display: block; font-size: 10pt; }
    .info-box small { display: block; margin-top: 1mm; color: #565b63; font-size: 8pt; }
    table { width: 100%; border-collapse: collapse; font-size: 8.5pt; }
    thead { display: table-header-group; }
    thead th { padding: 2.5mm 2mm; background: #111; color: #fff; font-weight: 700; text-align: left; }
    thead th:first-child { border-radius: 1mm 0 0 1mm; }
    thead th:last-child { border-radius: 0 1mm 1mm 0; }
    tbody tr { break-inside: avoid; border-bottom: 1px solid #e7e7e7; }
    tbody tr:nth-child(even) { background: #fafafa; }
    td { padding: 2.5mm 2mm; vertical-align: top; }
    .index { width: 6mm; color: #7d828b; }
    .center { text-align: center; }
    .amount { text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; }
    .strong { font-weight: 700; }
    .detail { margin-top: 1mm; color: #5f6670; font-size: 7.5pt; overflow-wrap: anywhere; }
    .serial-appendix { margin-top: 8mm; padding-top: 4mm; border-top: 1px dashed #d7d7d7; }
    .serial-appendix h2 { margin: 0 0 3mm; font-size: 9pt; break-after: avoid; }
    .serial-table td { width: 33.33%; padding: 1.5mm 2mm; font: 7.5pt/1.3 monospace; overflow-wrap: anywhere; }
    .serial-index { color: #7d828b; }
    .totals-wrap { display: flex; justify-content: flex-end; margin-top: 6mm; break-inside: avoid; }
    .totals { width: 70mm; border-top: 1.5pt solid #e7e7e7; padding-top: 2mm; }
    .total-line { display: flex; justify-content: space-between; gap: 4mm; padding: 1.5mm 2mm; font-size: 8.5pt; }
    .total-line span { color: #565b63; }
    .total-line strong { font-variant-numeric: tabular-nums; white-space: nowrap; }
    .grand { margin: 1mm 0; padding: 2.5mm 2mm; border-radius: 1.5mm; background: #111; color: #fff; font-size: 10pt; font-weight: 700; }
    .grand span { color: #fff; }
    .grand strong { color: #ff8a40; }
    .balance { color: #b42318; background: #fff2f0; }
    .balance span { color: #b42318; }
    .notes { margin-top: 8mm; padding-top: 4mm; border-top: 1px dashed #d7d7d7; break-inside: avoid; }
    .notes h2 { margin: 0 0 2mm; font-size: 9pt; }
    .notes p { margin: 0; color: #4b515b; white-space: normal; overflow-wrap: anywhere; }
    .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 10mm; margin-top: 14mm; color: #747984; font-size: 8pt; text-align: center; break-inside: avoid; }
    .signature-line { height: 10mm; border-bottom: 1px solid #c9cdd2; margin-bottom: 2mm; }
    .footer { margin-top: 9mm; padding-top: 3mm; border-top: 1px solid #e7e7e7; color: #9297a0; font-size: 7pt; text-align: center; }
    @media print { html, body { width: auto; } .sheet { width: auto; min-height: 0; padding: 0; box-shadow: none; } * { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
  </style>
</head><body><main class="sheet">
  <header class="header">
    <div>${logo}<div class="company-name">${businessName}</div>${businessMeta ? `<div class="company-meta">${businessMeta}</div>` : ""}</div>
    <div class="document-heading"><h1>INVOICE</h1><div class="reference">${escapeHtml(invoice.reference)}</div><div class="meta">
      <div><span>Date issued: </span><strong>${escapeHtml(invoice.date)}</strong></div>
      <div><span>Outlet: </span><strong>${escapeHtml(invoice.outlet)}</strong></div>
      <div><span>Status: </span><strong class="status ${statusClass}">${escapeHtml(invoice.status)}</strong></div>
    </div></div>
  </header>
  <section class="info-grid">
    <div class="info-box"><div class="eyebrow">Bill to</div><strong>${escapeHtml(invoice.customer)}</strong><small>Customer account</small></div>
    <div class="info-box"><div class="eyebrow">Payment information</div><strong>${paymentLabels[invoice.paymentMethod]}</strong>${invoice.bankAccount ? `<small>${escapeHtml(invoice.bankAccount)}</small>` : ""}</div>
  </section>
  <table><thead><tr><th>#</th><th>Description</th><th class="center">Qty</th><th class="amount">Unit price</th><th class="amount">Total</th></tr></thead><tbody>${rows}</tbody></table>
  <div class="totals-wrap"><div class="totals">
    <div class="total-line"><span>Subtotal</span><strong>${money(subtotal)}</strong></div>
    ${invoice.discount ? `<div class="total-line"><span>Discount</span><strong>−${money(invoice.discount)}</strong></div>` : ""}
    ${invoice.tax !== undefined ? `<div class="total-line"><span>${taxLabel}</span><strong>${money(invoice.tax)}</strong></div>` : ""}
    <div class="total-line grand"><span>Grand total</span><strong>${money(invoice.total)}</strong></div>
    ${invoice.paid > 0 ? `<div class="total-line"><span>Amount received</span><strong>${money(invoice.paid)}</strong></div>` : ""}
    ${balance}
  </div></div>
  ${serialAppendix}
  ${notes}
  <div class="signatures"><div><div class="signature-line"></div>Authorized signature</div><div><div class="signature-line"></div>Customer signature</div></div>
  <footer class="footer">Thank you for your business · ${businessName} · ${escapeHtml(invoice.reference)} · ${escapeHtml(invoice.date)}</footer>
</main></body></html>`;
}

export const InvoicePrintTemplate = ({ invoice, business, onClose }: InvoicePrintTemplateProps) => {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [previewHeight, setPreviewHeight] = useState(1123);

  const handlePrint = () => {
    frameRef.current?.contentWindow?.focus();
    frameRef.current?.contentWindow?.print();
  };

  return (
    <div role="dialog" aria-modal="true" aria-label={`Invoice ${invoice.reference} print preview`} className="fixed inset-0 z-[9999] overflow-auto bg-black/70 p-4 sm:p-6">
      <div className="sticky top-0 z-10 mx-auto mb-4 flex w-fit gap-2 rounded-lg bg-[#1a1a1a] p-2 shadow-lg">
        <Button onClick={handlePrint}><Printer className="size-4" />Print / Save as PDF</Button>
        <Button variant="outline" onClick={onClose}><X className="size-4" />Close</Button>
      </div>
      <div className="mx-auto w-fit max-w-full overflow-x-auto rounded bg-white shadow-2xl">
        <iframe
          ref={frameRef}
          title={`Invoice ${invoice.reference}`}
          srcDoc={buildInvoiceHTML(invoice, business)}
          onLoad={() => {
            const height = frameRef.current?.contentDocument?.documentElement.scrollHeight;
            if (height) setPreviewHeight(Math.max(1123, height));
          }}
          style={{ display: "block", width: "210mm", height: `${previewHeight}px`, border: 0 }}
        />
      </div>
    </div>
  );
};
