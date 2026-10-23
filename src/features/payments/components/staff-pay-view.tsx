"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { CalendarDays, CheckCircle2, Clock3, Plus, Search, Users, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface StaffPayroll {
  id: string;
  name: string;
  role: string;
  baseSalary: number;
  commissions: number;
  deductions: number;
  netPayable: number;
}

interface SalaryPayment {
  id: string;
  staffId: string;
  period: string;
  paidOn: string;
  amount: number;
  deduction: number;
  method: "Cash" | "Bank transfer";
  reference: string;
}

const staff: StaffPayroll[] = [
  { id: "sp-1", name: "Muhammad Usman", role: "Senior Sales Associate", baseSalary: 65000, commissions: 14500, deductions: 0, netPayable: 79500 },
  { id: "sp-2", name: "Bilal Ahmed", role: "Warehouse In-charge", baseSalary: 55000, commissions: 0, deductions: 5000, netPayable: 50000 },
  { id: "sp-3", name: "Ali Hassan", role: "Lead Hardware Technician", baseSalary: 70000, commissions: 8200, deductions: 0, netPayable: 78200 },
];

const initialPayments: SalaryPayment[] = [
  { id: "sal-1008", staffId: "sp-3", period: "2026-10", paidOn: "2026-10-05", amount: 78200, deduction: 0, method: "Bank transfer", reference: "SAL-1008" },
  { id: "sal-1007", staffId: "sp-1", period: "2026-09", paidOn: "2026-09-30", amount: 79500, deduction: 0, method: "Bank transfer", reference: "SAL-1007" },
  { id: "sal-1006", staffId: "sp-2", period: "2026-09", paidOn: "2026-09-30", amount: 50000, deduction: 0, method: "Cash", reference: "SAL-1006" },
  { id: "sal-1005", staffId: "sp-3", period: "2026-09", paidOn: "2026-09-30", amount: 78200, deduction: 0, method: "Bank transfer", reference: "SAL-1005" },
  { id: "sal-1004", staffId: "sp-1", period: "2026-08", paidOn: "2026-08-31", amount: 79500, deduction: 0, method: "Bank transfer", reference: "SAL-1004" },
  { id: "sal-1003", staffId: "sp-2", period: "2026-08", paidOn: "2026-08-31", amount: 50000, deduction: 0, method: "Cash", reference: "SAL-1003" },
  { id: "sal-1002", staffId: "sp-3", period: "2026-08", paidOn: "2026-08-31", amount: 78200, deduction: 0, method: "Bank transfer", reference: "SAL-1002" },
];

type GroupMode = "month" | "employee";
const money = (amount: number) => `$${amount.toLocaleString("en-PK")}`;
const monthLabel = (period: string) => new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${period}-01T00:00:00Z`));
const paidDate = (value: string) => new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`));
const localISODate = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

export const StaffPayView = () => {
  const [payments, setPayments] = useState(initialPayments);
  const [groupMode, setGroupMode] = useState<GroupMode>("month");
  const [selectedPeriod, setSelectedPeriod] = useState("2026-10");
  const [search, setSearch] = useState("");
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [staffId, setStaffId] = useState(staff[0].id);
  const [period, setPeriod] = useState("2026-10");
  const [paymentDate, setPaymentDate] = useState("2026-10-13");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [deductionAmount, setDeductionAmount] = useState("");
  const [method, setMethod] = useState<SalaryPayment["method"]>("Bank transfer");
  const [reference, setReference] = useState("");
  const [formError, setFormError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (!showPaymentForm) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previousOverflow; };
  }, [showPaymentForm]);

  const periodPayments = payments.filter((payment) => payment.period === selectedPeriod);
  const paidThisPeriod = periodPayments.reduce((sum, payment) => sum + payment.amount, 0);
  const deductionsThisPeriod = periodPayments.reduce((sum, payment) => sum + payment.deduction, 0);
  const totalMonthlyPayroll = staff.reduce((sum, member) => sum + member.netPayable, 0);
  const adjustedMonthlyPayroll = Math.max(0, totalMonthlyPayroll - deductionsThisPeriod);
  const outstandingThisPeriod = Math.max(0, adjustedMonthlyPayroll - paidThisPeriod);
  const filteredPayments = useMemo(() => payments.filter((payment) => {
    const member = staff.find((candidate) => candidate.id === payment.staffId);
    const matchesSearch = !search.trim() || `${member?.name ?? ""} ${payment.reference} ${payment.method} ${monthLabel(payment.period)}`.toLowerCase().includes(search.trim().toLowerCase());
    return matchesSearch;
  }).sort((left, right) => right.paidOn.localeCompare(left.paidOn) || right.reference.localeCompare(left.reference)), [payments, search]);

  const groups = useMemo(() => {
    const buckets = new Map<string, SalaryPayment[]>();
    for (const payment of filteredPayments) {
      const key = groupMode === "month" ? payment.period : payment.staffId;
      buckets.set(key, [...(buckets.get(key) ?? []), payment]);
    }
    return [...buckets.entries()].sort(([left], [right]) => groupMode === "month" ? right.localeCompare(left) : staff.findIndex((member) => member.id === left) - staff.findIndex((member) => member.id === right));
  }, [filteredPayments, groupMode]);

  const paidByStaff = (id: string, payPeriod = selectedPeriod) => payments.filter((payment) => payment.staffId === id && payment.period === payPeriod).reduce((sum, payment) => sum + payment.amount, 0);
  const deductionsByStaff = (id: string, payPeriod = selectedPeriod) => payments.filter((payment) => payment.staffId === id && payment.period === payPeriod).reduce((sum, payment) => sum + payment.deduction, 0);
  const openForm = (memberId?: string) => {
    setStaffId(memberId ?? staff[0].id);
    setPeriod(selectedPeriod);
    setPaymentDate(localISODate());
    setPaymentAmount("");
    setDeductionAmount("");
    setReference("");
    setFormError("");
    setShowPaymentForm(true);
  };

  const submitPayment = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const member = staff.find((candidate) => candidate.id === staffId);
    const amount = Number(paymentAmount);
    const deduction = Number(deductionAmount) || 0;
    const remaining = member ? Math.max(0, member.netPayable - deductionsByStaff(member.id, period) - paidByStaff(member.id, period)) : 0;
    if (!member || !paymentDate || !Number.isFinite(amount) || amount < 0 || !Number.isFinite(deduction) || deduction < 0 || amount + deduction <= 0 || amount + deduction > remaining) {
      setFormError(`Enter a payment or deduction greater than zero. Together they cannot exceed the remaining salary (${money(remaining)}).`);
      return;
    }
    const payment: SalaryPayment = { id: crypto.randomUUID(), staffId, period, paidOn: paymentDate, amount, deduction, method, reference: reference.trim() || `SAL-${String(Date.now()).slice(-5)}` };
    setPayments((current) => [payment, ...current]);
    setSelectedPeriod(period);
    setShowPaymentForm(false);
    setNotice(deduction > 0 && amount === 0 ? `Recorded a ${money(deduction)} deduction for ${member.name}.` : `Recorded ${money(amount)} payment for ${member.name}${deduction > 0 ? ` with a ${money(deduction)} deduction` : ""}.`);
  };

  return <div className="space-y-5">
    {notice ? <p role="status" className="rounded-lg border border-success/20 bg-success/10 px-4 py-3 text-sm font-medium text-success-foreground">{notice}</p> : null}

    <div className="grid gap-4 sm:grid-cols-3">
      <Card><CardHeader className="p-4"><CardDescription>Employees on payroll</CardDescription><CardTitle className="flex items-center gap-2 font-mono text-2xl"><Users className="size-5 text-muted-foreground" />{staff.length}</CardTitle></CardHeader></Card>
      <Card><CardHeader className="p-4"><CardDescription>Monthly salary total</CardDescription><CardTitle className="font-mono text-2xl">{money(adjustedMonthlyPayroll)}</CardTitle><p className="text-xs text-muted-foreground">After recorded deductions</p></CardHeader></Card>
      <Card><CardHeader className="p-4"><CardDescription>{monthLabel(selectedPeriod)} remaining</CardDescription><CardTitle className="font-mono text-2xl text-warning-foreground">{money(outstandingThisPeriod)}</CardTitle><p className="text-xs text-muted-foreground">Paid {money(paidThisPeriod)} · deductions {money(deductionsThisPeriod)}</p></CardHeader></Card>
    </div>

    <Card>
      <CardHeader className="flex flex-col gap-4 border-b sm:flex-row sm:items-center sm:justify-between"><div><CardTitle>Employees &amp; monthly salaries</CardTitle><CardDescription>Base salary, monthly additions and deductions, and payment status for {monthLabel(selectedPeriod)}</CardDescription></div><div className="flex flex-wrap items-center gap-2"><Input aria-label="Payroll period" type="month" className="w-44" value={selectedPeriod} onChange={(event) => setSelectedPeriod(event.target.value)} /><Button onClick={() => openForm()}><Plus className="size-4" />Record salary payment</Button></div></CardHeader>
      <CardContent className="p-0"><Table><TableHeader><TableRow><TableHead>Employee</TableHead><TableHead>Role</TableHead><TableHead className="text-right">Base salary</TableHead><TableHead className="text-right">Commission</TableHead><TableHead className="text-right">Deductions</TableHead><TableHead className="text-right">Net salary</TableHead><TableHead>Payment progress</TableHead></TableRow></TableHeader><TableBody>
        {staff.map((member) => {
          const paid = paidByStaff(member.id);
          const recordedDeduction = deductionsByStaff(member.id);
          const totalDeductions = member.deductions + recordedDeduction;
          const currentNetSalary = Math.max(0, member.netPayable - recordedDeduction);
          const remaining = Math.max(0, currentNetSalary - paid);
          const status = remaining === 0 ? recordedDeduction > 0 && paid === 0 ? "Deducted" : "Paid" : paid > 0 ? "Partially paid" : "Unpaid";
          return <TableRow key={member.id}>
            <TableCell><p className="font-semibold text-heading">{member.name}</p><p className="text-xs text-muted-foreground">Staff ID · {member.id.toUpperCase()}</p></TableCell><TableCell className="text-sm text-muted-foreground">{member.role}</TableCell>
            <TableCell className="whitespace-nowrap text-right font-mono text-sm font-semibold">{money(member.baseSalary)}</TableCell><TableCell className="whitespace-nowrap text-right font-mono text-sm text-success-foreground">{member.commissions ? `+ ${money(member.commissions)}` : "—"}</TableCell><TableCell className="whitespace-nowrap text-right font-mono text-sm text-destructive">{totalDeductions ? `− ${money(totalDeductions)}` : "—"}</TableCell>
            <TableCell className="whitespace-nowrap text-right font-mono text-sm font-bold">{money(currentNetSalary)}</TableCell><TableCell><div className="flex flex-col gap-1.5"><Badge tone={status === "Paid" || status === "Deducted" ? "success" : status === "Unpaid" ? "warning" : "info"}>{status}</Badge><span className="text-xs text-muted-foreground">{money(paid)} paid{recordedDeduction > 0 ? ` · ${money(recordedDeduction)} deducted` : ""}{remaining > 0 ? ` · ${money(remaining)} due` : ""}</span></div></TableCell>
          </TableRow>;
        })}
      </TableBody></Table></CardContent>
    </Card>

    <Card>
      <CardHeader className="flex flex-col gap-4 border-b lg:flex-row lg:items-center lg:justify-between"><div><CardTitle>Salary payment history</CardTitle><CardDescription>Review salary disbursements across employees and pay periods</CardDescription></div><div className="flex flex-wrap items-center gap-2"><div className="flex rounded-md border bg-muted/40 p-1" aria-label="Group salary history"><Button size="sm" variant={groupMode === "month" ? "secondary" : "ghost"} aria-pressed={groupMode === "month"} onClick={() => setGroupMode("month")}><CalendarDays className="size-4" />By month</Button><Button size="sm" variant={groupMode === "employee" ? "secondary" : "ghost"} aria-pressed={groupMode === "employee"} onClick={() => setGroupMode("employee")}><Users className="size-4" />By employee</Button></div><div className="relative w-full sm:w-56"><Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input aria-label="Search salary history" placeholder="Search staff or reference" className="pl-8" value={search} onChange={(event) => setSearch(event.target.value)} /></div></div></CardHeader>
      <CardContent className="space-y-5 p-4 sm:p-5">
        {groups.map(([key, entries]) => {
          const title = groupMode === "month" ? monthLabel(key) : staff.find((member) => member.id === key)?.name ?? "Employee";
          const total = entries.reduce((sum, payment) => sum + payment.amount, 0);
          const totalDeducted = entries.reduce((sum, payment) => sum + payment.deduction, 0);
          return <section key={key} className="overflow-hidden rounded-lg border"><header className="flex flex-wrap items-center justify-between gap-3 border-b bg-muted/40 px-4 py-3"><div><h3 className="font-semibold text-heading">{title}</h3><p className="text-xs text-muted-foreground">{entries.length} {entries.length === 1 ? "record" : "records"}</p></div><div className="flex gap-4 text-sm"><p className="font-mono font-semibold text-success-foreground">{money(total)} paid</p>{totalDeducted > 0 ? <p className="font-mono font-semibold text-destructive">{money(totalDeducted)} deducted</p> : null}</div></header><div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Employee</TableHead><TableHead>Pay period</TableHead><TableHead>Reference</TableHead><TableHead>Method</TableHead><TableHead className="text-right">Amount paid</TableHead><TableHead className="text-right">Deduction</TableHead></TableRow></TableHeader><TableBody>{entries.map((payment) => <TableRow key={payment.id}><TableCell className="whitespace-nowrap">{paidDate(payment.paidOn)}</TableCell><TableCell className="font-semibold text-heading">{staff.find((member) => member.id === payment.staffId)?.name}</TableCell><TableCell>{monthLabel(payment.period)}</TableCell><TableCell className="font-mono text-xs font-semibold text-primary">{payment.reference}</TableCell><TableCell>{payment.amount > 0 ? payment.method : "—"}</TableCell><TableCell className="whitespace-nowrap text-right font-mono font-semibold text-success-foreground">{payment.amount > 0 ? `+ ${money(payment.amount)}` : "—"}</TableCell><TableCell className="whitespace-nowrap text-right font-mono font-semibold text-destructive">{payment.deduction > 0 ? `− ${money(payment.deduction)}` : "—"}</TableCell></TableRow>)}</TableBody></Table></div></section>;
        })}
        {groups.length === 0 ? <div className="px-4 py-10 text-center"><Clock3 className="mx-auto size-7 text-muted-foreground" /><p className="mt-2 font-medium text-heading">No salary payments found</p><p className="mt-1 text-sm text-muted-foreground">Try another search.</p></div> : null}
      </CardContent>
    </Card>

    {showPaymentForm ? <div className="fixed inset-0 z-50 flex justify-end bg-background/25 backdrop-blur-sm" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowPaymentForm(false); }}><Card role="dialog" aria-modal="true" aria-labelledby="salary-payment-title" className="flex h-full max-h-screen w-full max-w-xl flex-col overflow-hidden rounded-none shadow-xl sm:rounded-l-xl"><CardHeader className="flex-row items-start justify-between border-b"><div><CardTitle id="salary-payment-title">Record salary payment</CardTitle><CardDescription>Enter the amount paid and any deduction for this pay period.</CardDescription></div><Button variant="ghost" size="icon" aria-label="Close salary payment form" onClick={() => setShowPaymentForm(false)}><X className="size-4" /></Button></CardHeader><CardContent className="overflow-y-auto p-5"><form onSubmit={submitPayment} className="space-y-4">
      <label className="block space-y-1.5 text-sm font-medium">Employee<select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={staffId} onChange={(event) => setStaffId(event.target.value)}>{staff.map((member) => <option key={member.id} value={member.id}>{member.name} · {member.role}</option>)}</select></label>
      <div className="grid gap-4 sm:grid-cols-2"><label className="block space-y-1.5 text-sm font-medium">Pay period<Input required type="month" value={period} onChange={(event) => setPeriod(event.target.value)} /></label><label className="block space-y-1.5 text-sm font-medium">Payment date<Input required type="date" value={paymentDate} onChange={(event) => setPaymentDate(event.target.value)} /></label></div>
      <div className="grid gap-4 sm:grid-cols-2"><label className="block space-y-1.5 text-sm font-medium">Amount paid (USD)<Input type="number" min="0" step="0.01" value={paymentAmount} onChange={(event) => setPaymentAmount(event.target.value)} placeholder="0.00" /></label><label className="block space-y-1.5 text-sm font-medium">Deduction (USD)<Input type="number" min="0" step="0.01" value={deductionAmount} onChange={(event) => setDeductionAmount(event.target.value)} placeholder="0.00" /></label></div>
      <p className="text-xs text-muted-foreground">Remaining before this record: {money(Math.max(0, (staff.find((member) => member.id === staffId)?.netPayable ?? 0) - deductionsByStaff(staffId, period) - paidByStaff(staffId, period)))}. Enter a payment, a deduction, or both.</p>
      {Number(paymentAmount) > 0 ? <label className="block space-y-1.5 text-sm font-medium">Payment method<select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={method} onChange={(event) => setMethod(event.target.value as SalaryPayment["method"])}><option>Bank transfer</option><option>Cash</option></select></label> : null}
      <label className="block space-y-1.5 text-sm font-medium">Reference<Input value={reference} onChange={(event) => setReference(event.target.value)} placeholder="Auto-generated if blank" /></label>
      {formError ? <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{formError}</p> : null}
      <div className="flex justify-end gap-2 border-t pt-4"><Button type="button" variant="outline" onClick={() => setShowPaymentForm(false)}>Cancel</Button><Button type="submit"><CheckCircle2 className="size-4" />Record payment</Button></div>
    </form></CardContent></Card></div> : null}
  </div>;
};
