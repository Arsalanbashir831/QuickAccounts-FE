"use client";

import { Printer, X } from "lucide-react";
import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { saleKind, saleStatus } from "@/domain/ledger";
import type { Party, Sale } from "@/domain/types";
import { formatDateWith, type CompanySettings } from "@/features/settings/settings-store";
import { formatMoney } from "@/lib/format/money";
import { paymentLabel } from "@/features/pos/components/pos-receipt-dialog";

const money = (amount: number) => formatMoney(amount);
const esc = (value: string) => value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] ?? c);

export function buildInvoiceHTML(sale: Sale, settings: CompanySettings, customer?: Party, customerBalance?: number) {
  const { business, rules } = settings;
  const date = (iso: string) => formatDateWith(business.dateFormat, iso);
  const kind = saleKind(sale);
  const title = kind === "Sale" ? (sale.channel === "invoice" ? "Sales invoice" : "Sales receipt") : kind === "Return" ? "Credit note" : "Exchange note";
  const rows = sale.lines.map((line, index) => {
    const unit = line.qty < 0 ? line.unitNet : line.price;
    return `<tr${line.qty < 0 ? ' class="ret"' : ""}>
      <td>${index + 1}</td>
      <td><strong>${line.qty < 0 ? "Return · " : ""}${esc(line.name)}</strong><br><span class="muted">${esc(line.sku)}</span></td>
      <td>${esc(line.color)}</td>
      <td class="c">${line.size === "OS" ? "—" : esc(line.size)}</td>
      <td class="r">${line.qty}</td>
      <td class="r">${money(unit)}</td>
      <td class="r">${money(line.qty * unit)}</td>
    </tr>`;
  }).join("");
  const due = sale.total - sale.amountPaid;
  return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(sale.number)}</title><style>
    @page { size: A4; margin: 14mm; }
    body { font: 12px/1.5 "Avenir Next", "Segoe UI", sans-serif; color: #111; margin: 0; }
    header { display: flex; justify-content: space-between; gap: 24px; border-bottom: 2px solid #111; padding-bottom: 12px; }
    h1 { margin: 0; font-size: 20px; } h2 { margin: 0; font-size: 22px; text-transform: uppercase; letter-spacing: .08em; text-align: right; }
    .muted { color: #666; font-size: 11px; } .r { text-align: right; } .c { text-align: center; }
    .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin: 18px 0; }
    table { width: 100%; border-collapse: collapse; } th { text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: .08em; color: #555; border-bottom: 1px solid #111; padding: 6px 4px; }
    td { padding: 7px 4px; border-bottom: 1px solid #e5e5e5; vertical-align: top; } .ret td { color: #b42318; }
    .totals { margin-left: auto; width: 280px; margin-top: 12px; } .totals div { display: flex; justify-content: space-between; padding: 3px 0; }
    .grand { border-top: 2px solid #111; font-weight: 700; font-size: 15px; margin-top: 4px; padding-top: 6px !important; }
    .note { margin-top: 24px; padding: 10px; background: #f5f5f5; border-radius: 6px; }
  </style></head><body>
  <header>
    <div>${business.logoDataUrl ? `<img src="${esc(business.logoDataUrl)}" style="max-height:48px;margin-bottom:6px" alt="">` : ""}<h1>${esc(business.name)}</h1>
      <div class="muted">${[business.address, business.phone, business.email, business.taxNumber ? `NTN ${business.taxNumber}` : ""].filter(Boolean).map((line) => esc(line)).join("<br>")}</div></div>
    <div><h2>${title}</h2><div class="r"><strong>${esc(sale.number)}</strong><br>${date(sale.date)}${sale.dueDate ? `<br>Due ${date(sale.dueDate)}` : ""}</div></div>
  </header>
  <section class="meta">
    <div><div class="muted">Bill to</div><strong>${esc(sale.customerName)}</strong>${customer?.phone ? `<br>${esc(customer.phone)}` : ""}${customer?.city ? `<br>${esc(customer.city)}` : ""}</div>
    <div class="r"><div class="muted">Payment</div><strong>${esc(paymentLabel(sale))}</strong><br>Status: ${saleStatus(sale)}</div>
  </section>
  <table><thead><tr><th>#</th><th>Style</th><th>Colour</th><th class="c">Size</th><th class="r">Qty</th><th class="r">Rate</th><th class="r">Amount</th></tr></thead><tbody>${rows}</tbody></table>
  <section class="totals">
    <div><span>Subtotal</span><span>${money(sale.subtotal)}</span></div>
    ${sale.discount ? `<div><span>Discount</span><span>−${money(sale.discount)}</span></div>` : ""}
    ${sale.tax ? `<div><span>Sales tax (${rules.taxRate}%${rules.taxInclusive ? " incl." : ""})</span><span>${money(sale.tax)}</span></div>` : ""}
    <div class="grand"><span>${sale.total < 0 ? "Refund" : "Total"}</span><span>${money(Math.abs(sale.total))}</span></div>
    ${sale.total > 0 ? `<div><span>Paid</span><span>${money(sale.amountPaid)}</span></div><div><strong>Balance due</strong><strong>${money(Math.max(0, due))}</strong></div>` : ""}
    ${customerBalance !== undefined && customer ? `<div class="muted"><span>Total account balance</span><span>${money(customerBalance)}</span></div>` : ""}
  </section>
  ${sale.notes ? `<div class="note">${esc(sale.notes)}</div>` : ""}
  <p class="muted" style="margin-top:28px;text-align:center">${esc(rules.receiptFooter)}</p>
  </body></html>`;
}

export function InvoicePrintDialog({ sale, settings, customer, customerBalance, onClose }: { sale: Sale; settings: CompanySettings; customer?: Party; customerBalance?: number; onClose: () => void }) {
  const frameRef = useRef<HTMLIFrameElement>(null);
  return (
    <div role="dialog" aria-modal="true" aria-label={`Print ${sale.number}`} className="fixed inset-0 z-[9999] overflow-auto bg-black/70 p-4 sm:p-6">
      <div className="sticky top-0 z-10 mx-auto mb-4 flex max-w-4xl items-center justify-between gap-3 rounded-xl bg-[#141516] px-4 py-3 text-white shadow-2xl">
        <p className="text-sm font-bold">A4 invoice · {sale.number}</p>
        <div className="flex gap-2">
          <Button onClick={() => { frameRef.current?.contentWindow?.focus(); frameRef.current?.contentWindow?.print(); }}><Printer className="size-4" />Print</Button>
          <Button variant="ghost" className="text-white hover:bg-white/10 hover:text-white" onClick={onClose}><X className="size-4" />Close</Button>
        </div>
      </div>
      <iframe ref={frameRef} title={`Invoice ${sale.number}`} srcDoc={buildInvoiceHTML(sale, settings, customer, customerBalance)} className="mx-auto block h-[1100px] w-full max-w-4xl rounded bg-white shadow-2xl" />
    </div>
  );
}
