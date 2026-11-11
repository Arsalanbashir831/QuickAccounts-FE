"use client";

import { CheckCircle2, Printer } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { saleKind } from "@/domain/ledger";
import type { Sale } from "@/domain/types";
import { formatDateWith, type CompanySettings } from "@/features/settings/settings-store";
import { formatMoney } from "@/lib/format/money";

const money = (amount: number) => formatMoney(amount);

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (character) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
})[character] ?? character);

export const paymentLabel = (sale: Pick<Sale, "method" | "total">) =>
  sale.total < 0
    ? { cash: "Cash refund", card: "Card refund", transfer: "Transfer refund", credit: "Credited to account" }[sale.method]
    : { cash: "Cash", card: "Card", transfer: "Bank / wallet transfer", credit: "On credit (khata)" }[sale.method];

export function buildReceiptHTML(sale: Sale, settings: CompanySettings, accountName?: string): string {
  const { business, rules } = settings;
  const businessName = escapeHtml(business.name.trim() || "Shoe store");
  const logo = business.logoDataUrl ? `<img class="logo" src="${escapeHtml(business.logoDataUrl)}" alt="${businessName}">` : "";
  const businessMeta = [business.address, business.phone, business.taxNumber ? `NTN ${business.taxNumber}` : ""]
    .map((line) => line?.trim()).filter(Boolean).map((line) => escapeHtml(line as string)).join("<br>");
  const kind = saleKind(sale);
  const title = kind === "Return" ? "Refund receipt" : kind === "Exchange" ? "Exchange receipt" : "Sales receipt";
  const itemRows = sale.lines.map((line) => {
    const variant = line.size === "OS" ? line.color : `${line.color} · Size ${line.size}`;
    const unit = line.qty < 0 ? line.unitNet : line.price;
    return `
    <tr class="item-row${line.qty < 0 ? " returned" : ""}">
      <td colspan="2">
        <div class="item-name">${line.qty < 0 ? "RETURN · " : ""}${escapeHtml(line.name)}</div>
        <div class="item-meta">${escapeHtml(variant)} · ${Math.abs(line.qty)} × ${money(unit)}</div>
      </td>
      <td class="amount">${money(line.qty * unit)}</td>
    </tr>`;
  }).join("");
  const change = sale.tendered !== undefined ? Math.max(0, sale.tendered - sale.amountPaid) : 0;
  const due = sale.total - sale.amountPaid;

  return `<!doctype html>
<html lang="en"><head>
  <meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Receipt ${escapeHtml(sale.number)}</title>
  <style>
    @page { size: 80mm auto; margin: 4mm; }
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; background: #fff; color: #111; }
    body { width: 72mm; font: 10.5px/1.45 "SFMono-Regular", Menlo, Consolas, monospace; }
    .center { text-align: center; }
    .logo { display: block; max-width: 42mm; max-height: 12mm; margin: 0 auto 2mm; object-fit: contain; }
    h1 { margin: 0 0 1mm; font-size: 14px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; }
    .meta { color: #444; font-size: 9px; line-height: 1.5; }
    .rule { margin: 2.5mm 0; border-top: 1px dashed #8a8a8a; }
    .label { margin: 1.5mm 0 1mm; font-size: 9px; font-weight: 700; letter-spacing: .18em; text-transform: uppercase; }
    .info { font-size: 9.5px; }
    .info div, .totals div, .payment div { display: flex; justify-content: space-between; gap: 3mm; padding: .4mm 0; }
    .info span, .totals span, .payment span { color: #555; }
    table { width: 100%; border-collapse: collapse; }
    .item-row td { padding: 1.6mm 0; vertical-align: top; border-bottom: 1px dotted #d4d4d4; }
    .item-name { font-weight: 700; overflow-wrap: anywhere; }
    .item-meta { color: #555; font-size: 8.5px; }
    .returned .item-name, .returned .amount { color: #b42318; }
    .amount { text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; }
    .grand { display: flex; justify-content: space-between; margin: 1.5mm 0; padding: 2mm 0; border-top: 1.5px solid #111; border-bottom: 1.5px solid #111; font-size: 13px; font-weight: 700; }
    .change { margin-top: 1.5mm; padding: 1.5mm 2mm; border: 1px dashed #111; font-weight: 700; }
    .footer { margin-top: 4mm; text-align: center; font-size: 9px; color: #333; }
    .footer strong { display: block; margin-bottom: 1mm; font-size: 10px; }
  </style>
</head><body>
  <header class="center">
    ${logo}
    <h1>${businessName}</h1>
    ${businessMeta ? `<div class="meta">${businessMeta}</div>` : ""}
    <div class="label">${title}</div>
  </header>
  <div class="rule"></div>
  <section class="info">
    <div><span>Receipt</span><strong>${escapeHtml(sale.number)}</strong></div>
    <div><span>Date</span><strong>${escapeHtml(formatDateWith(business.dateFormat, sale.date))} · ${escapeHtml(sale.time)}</strong></div>
    <div><span>Served by</span><strong>${escapeHtml(sale.cashier)}</strong></div>
    <div><span>Customer</span><strong>${escapeHtml(sale.customerName)}</strong></div>
  </section>
  <div class="rule"></div>
  <table><tbody>${itemRows}</tbody></table>
  <section class="totals">
    <div><span>Subtotal</span><strong>${money(sale.subtotal)}</strong></div>
    ${sale.discount > 0 ? `<div><span>Discount</span><strong>−${money(sale.discount)}</strong></div>` : ""}
    ${sale.tax > 0 ? `<div><span>Sales tax (${rules.taxRate}%${rules.taxInclusive ? " incl." : ""})</span><strong>${money(sale.tax)}</strong></div>` : ""}
    <div class="grand"><span>${sale.total < 0 ? "REFUND" : "TOTAL"}</span><strong>${money(Math.abs(sale.total))}</strong></div>
  </section>
  <section class="payment">
    <div><span>Payment</span><strong>${escapeHtml(paymentLabel(sale))}</strong></div>
    ${accountName && sale.method !== "cash" ? `<div><span>Account</span><strong>${escapeHtml(accountName)}</strong></div>` : ""}
    ${sale.tendered !== undefined ? `<div><span>Cash received</span><strong>${money(sale.tendered)}</strong></div>` : ""}
    ${sale.total > 0 ? `<div><span>Paid</span><strong>${money(sale.amountPaid)}</strong></div>` : ""}
    ${due > 0 ? `<div><span>Balance on account</span><strong>${money(due)}</strong></div>` : ""}
  </section>
  ${change > 0 ? `<div class="change center">CHANGE · ${money(change)}</div>` : ""}
  <footer class="footer">
    <strong>Thank you for shopping with us!</strong>
    ${escapeHtml(rules.receiptFooter)}
  </footer>
</body></html>`;
}

export const PosReceiptDialog = ({ sale, settings, accountName, onClose }: { sale: Sale; settings: CompanySettings; accountName?: string; onClose: () => void }) => {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [previewHeight, setPreviewHeight] = useState(640);
  const change = sale.tendered !== undefined ? Math.max(0, sale.tendered - sale.amountPaid) : 0;
  const kind = saleKind(sale);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const handlePrint = () => {
    frameRef.current?.contentWindow?.focus();
    frameRef.current?.contentWindow?.print();
  };

  return (
    <div role="dialog" aria-modal="true" aria-label={`Receipt ${sale.number}`} className="fixed inset-0 z-[9999] overflow-auto bg-black/75 p-4 sm:p-6">
      <div className="sticky top-0 z-10 mx-auto mb-4 flex w-full max-w-2xl flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-[#141516] px-4 py-3 text-white shadow-2xl">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-emerald-500/15 text-emerald-400"><CheckCircle2 className="size-5" /></span>
          <div className="min-w-0">
            <p className="text-sm font-bold">
              {kind === "Return" ? `Refund · ${money(Math.abs(sale.total))}` : kind === "Exchange" && sale.total <= 0 ? `Exchange done${sale.total < 0 ? ` · refund ${money(-sale.total)}` : ""}` : `${kind} completed · ${money(sale.total)}`}
            </p>
            <p className="truncate text-xs text-white/55">
              {sale.number} · {paymentLabel(sale)}
              {change > 0 ? ` · Change ${money(change)}` : ""}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={handlePrint}><Printer className="size-4" />Print receipt</Button>
          <Button className="text-white hover:bg-white/10 hover:text-white" variant="ghost" onClick={onClose}>Done</Button>
        </div>
      </div>
      {change > 0 ? (
        <p className="mx-auto mb-4 w-fit rounded-xl bg-emerald-500 px-6 py-3 text-center text-2xl font-black text-white shadow-2xl">Give change {money(change)}</p>
      ) : null}
      <div className="mx-auto w-fit max-w-full rounded-sm bg-white shadow-2xl">
        <iframe
          ref={frameRef}
          title={`Receipt ${sale.number}`}
          srcDoc={buildReceiptHTML(sale, settings, accountName)}
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
