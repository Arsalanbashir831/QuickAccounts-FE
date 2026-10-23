"use client";

import { CheckCircle2, Printer } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import type { CompanySettings } from "@/features/settings/settings-store";

export interface PosReceiptData {
  reference: string;
  dateLabel: string;
  timeLabel: string;
  outlet: string;
  cashier: string;
  customer: string;
  items: Array<{ name: string; sku: string; qty: number; price: number }>;
  subtotal: number;
  discount: number;
  tax: number;
  taxRate: number;
  taxInclusive: boolean;
  total: number;
  paid: number;
  change: number;
  paymentLabel: string;
  bankAccount?: string;
  business: CompanySettings["business"];
}

const money = (amount: number) => `$${amount.toLocaleString("en-PK")}`;

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (character) => ({
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
})[character] ?? character);

function buildReceiptHTML(receipt: PosReceiptData): string {
  const businessName = escapeHtml(receipt.business.name.trim() || "Northstar Traders");
  const logo = receipt.business.logoDataUrl
    ? `<img class="logo" src="${escapeHtml(receipt.business.logoDataUrl)}" alt="${businessName}">`
    : "";
  const businessMeta = [receipt.business.address, receipt.business.phone, receipt.business.email]
    .map((line) => line?.trim())
    .filter((line): line is string => Boolean(line))
    .map(escapeHtml)
    .join("<br>");
  const itemRows = receipt.items.map((item) => `
    <tr class="item-row">
      <td colspan="2">
        <div class="item-name">${escapeHtml(item.name)}</div>
        <div class="item-meta">${escapeHtml(item.sku)} · ${item.qty} × ${money(item.price)}</div>
      </td>
      <td class="amount">${money(item.price * item.qty)}</td>
    </tr>`).join("");
  const taxLabel = `Tax (${receipt.taxRate}%${receipt.taxInclusive ? " incl." : ""})`;

  return `<!doctype html>
<html lang="en"><head>
  <meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Receipt ${escapeHtml(receipt.reference)}</title>
  <style>
    @page { size: 80mm auto; margin: 4mm; }
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; background: #fff; color: #111; }
    body { width: 72mm; font: 10.5px/1.45 "SFMono-Regular", Menlo, Consolas, monospace; -webkit-font-smoothing: antialiased; }
    .center { text-align: center; }
    .logo { display: block; max-width: 42mm; max-height: 12mm; margin: 0 auto 2mm; object-fit: contain; }
    h1 { margin: 0 0 1mm; font-size: 14px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; }
    .meta { color: #444; font-size: 9px; line-height: 1.5; }
    .rule { margin: 2.5mm 0; border-top: 1px dashed #8a8a8a; }
    .rule-solid { margin: 2.5mm 0; border-top: 1px solid #111; }
    .receipt-label { margin: 1mm 0 2mm; font-size: 9px; font-weight: 700; letter-spacing: .18em; text-transform: uppercase; }
    .info { font-size: 9.5px; }
    .info div { display: flex; justify-content: space-between; gap: 3mm; padding: .4mm 0; }
    .info span { color: #555; }
    .info strong { font-weight: 600; text-align: right; }
    table { width: 100%; border-collapse: collapse; }
    .item-row td { padding: 1.6mm 0; vertical-align: top; border-bottom: 1px dotted #d4d4d4; }
    .item-name { font-weight: 700; overflow-wrap: anywhere; }
    .item-meta { color: #555; font-size: 8.5px; }
    .amount { text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; }
    .totals { margin-top: 1.5mm; }
    .totals .row { display: flex; justify-content: space-between; gap: 3mm; padding: .5mm 0; font-size: 9.5px; }
    .totals .row span { color: #444; }
    .totals .row strong { font-variant-numeric: tabular-nums; }
    .grand { display: flex; justify-content: space-between; gap: 3mm; margin: 1.5mm 0; padding: 2mm 0; border-top: 1.5px solid #111; border-bottom: 1.5px solid #111; font-size: 13px; font-weight: 700; }
    .grand strong { font-variant-numeric: tabular-nums; }
    .payment { margin-top: 1.5mm; font-size: 9.5px; }
    .payment div { display: flex; justify-content: space-between; gap: 3mm; padding: .4mm 0; }
    .payment span { color: #555; }
    .change { margin-top: 1.5mm; padding: 1.5mm 2mm; border: 1px dashed #111; font-weight: 700; }
    .footer { margin-top: 4mm; text-align: center; font-size: 9px; color: #333; }
    .footer strong { display: block; margin-bottom: 1mm; font-size: 10px; }
    .reference { margin-top: 2.5mm; font-size: 8px; letter-spacing: .08em; color: #666; }
    @media print { * { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
  </style>
</head><body>
  <header class="center">
    ${logo}
    <h1>${businessName}</h1>
    ${businessMeta ? `<div class="meta">${businessMeta}</div>` : ""}
    <div class="receipt-label">Sales Receipt</div>
  </header>
  <div class="rule"></div>
  <section class="info">
    <div><span>Receipt</span><strong>${escapeHtml(receipt.reference)}</strong></div>
    <div><span>Date</span><strong>${escapeHtml(receipt.dateLabel)} · ${escapeHtml(receipt.timeLabel)}</strong></div>
    <div><span>Outlet</span><strong>${escapeHtml(receipt.outlet)}</strong></div>
    <div><span>Cashier</span><strong>${escapeHtml(receipt.cashier)}</strong></div>
    <div><span>Customer</span><strong>${escapeHtml(receipt.customer)}</strong></div>
  </section>
  <div class="rule"></div>
  <table><tbody>${itemRows}</tbody></table>
  <section class="totals">
    <div class="row"><span>Subtotal</span><strong>${money(receipt.subtotal)}</strong></div>
    ${receipt.discount > 0 ? `<div class="row"><span>Discount</span><strong>−${money(receipt.discount)}</strong></div>` : ""}
    ${receipt.tax > 0 ? `<div class="row"><span>${escapeHtml(taxLabel)}</span><strong>${money(receipt.tax)}</strong></div>` : ""}
    <div class="grand"><span>TOTAL</span><strong>${money(receipt.total)}</strong></div>
  </section>
  <section class="payment">
    <div><span>Payment</span><strong>${escapeHtml(receipt.paymentLabel)}</strong></div>
    ${receipt.bankAccount ? `<div><span>Account</span><strong>${escapeHtml(receipt.bankAccount)}</strong></div>` : ""}
    <div><span>Paid</span><strong>${money(receipt.paid)}</strong></div>
  </section>
  ${receipt.change > 0 ? `<div class="change center">CHANGE DUE · ${money(receipt.change)}</div>` : ""}
  <footer class="footer">
    <strong>Thank you for your business!</strong>
    Please keep this receipt for returns and warranty.
    <div class="reference">${escapeHtml(receipt.reference)} · ${escapeHtml(businessName)}</div>
  </footer>
</body></html>`;
}

export const PosReceiptDialog = ({
  receipt,
  onClose,
}: {
  receipt: PosReceiptData;
  onClose: () => void;
}) => {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [previewHeight, setPreviewHeight] = useState(640);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const handlePrint = () => {
    frameRef.current?.contentWindow?.focus();
    frameRef.current?.contentWindow?.print();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Receipt ${receipt.reference}`}
      className="fixed inset-0 z-[9999] overflow-auto bg-black/75 p-4 sm:p-6"
    >
      <div className="sticky top-0 z-10 mx-auto mb-4 flex w-full max-w-2xl flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-[#141516] px-4 py-3 text-white shadow-2xl">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-emerald-500/15 text-emerald-400">
            <CheckCircle2 className="size-5" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-bold">Sale completed · {money(receipt.total)}</p>
            <p className="truncate text-xs text-white/55">
              {receipt.reference}
              {receipt.change > 0 ? ` · Change ${money(receipt.change)}` : ""}
              {` · ${receipt.paymentLabel}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={handlePrint}>
            <Printer className="size-4" />
            Print receipt
          </Button>
          <Button className="text-white hover:bg-white/10 hover:text-white" variant="ghost" onClick={onClose}>Done</Button>
        </div>
      </div>
      <div className="mx-auto w-fit max-w-full rounded-sm bg-white shadow-2xl">
        <iframe
          ref={frameRef}
          title={`Receipt ${receipt.reference}`}
          srcDoc={buildReceiptHTML(receipt)}
          onLoad={() => {
            const height = frameRef.current?.contentDocument?.body.getBoundingClientRect().height;
            if (height) setPreviewHeight(Math.max(360, Math.ceil(height)));
          }}
          style={{ display: "block", width: "80mm", height: `${previewHeight}px`, border: 0 }}
        />
      </div>
    </div>
  );
};
