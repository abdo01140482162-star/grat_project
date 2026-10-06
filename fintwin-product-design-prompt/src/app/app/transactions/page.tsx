"use client";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeftRight, Check, FileUp, Plus, Search, Upload, AlertTriangle, XCircle, Copy, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useStore } from "@/components/store";
import { useQuery } from "@/components/hooks";
import { CATEGORIES, CATEGORY_ICON, TransactionRow, useComposer } from "@/components/domain";
import { Badge, Button, Card, ConfirmDialog, Drawer, EmptyState, ErrorState, Field, IconCircle, MoneyInput, PageHeader, Pill, Select, TextInput, cx, useToast } from "@/components/ui";
import { ProgressPill } from "@/components/motion";
import { type Transaction, fmtDate, fmtMoney } from "@/lib/model";

export default function TransactionsPage() {
  const { transactions, accounts, currency, remove, update, fresh } = useStore();
  const compose = useComposer();
  const toast = useToast();
  const query = useQuery();
  const [q, setQ] = useState(""); const [kind, setKind] = useState("all"); const [cat, setCat] = useState("all"); const [acc, setAcc] = useState("all"); const [month, setMonth] = useState("all");
  const [sel, setSel] = useState<Transaction | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [limit, setLimit] = useState(40);
  useEffect(() => { if (query?.get("q")) setQ(query.get("q")!); if (query?.get("category")) setCat(query.get("category")!); if (query?.get("import")) setImportOpen(true); }, [query]);
  const months = useMemo(() => [...new Set(transactions.map((t) => t.date.slice(0, 7)))].sort().reverse(), [transactions]);
  const accName = (id: number | null) => accounts.find((a) => a.id === id)?.name;
  const list = useMemo(() => transactions.filter((t) =>
    (kind === "all" || t.kind === kind) && (cat === "all" || t.category === cat) && (acc === "all" || String(t.accountId) === acc) && (month === "all" || t.date.startsWith(month)) &&
    (!q || (t.description + t.category).toLowerCase().includes(q.toLowerCase()))), [transactions, kind, cat, acc, month, q]);
  const totals = useMemo(() => ({ in: list.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0), out: -list.filter((t) => t.amount < 0 && t.kind !== "transfer").reduce((s, t) => s + t.amount, 0) }), [list]);

  return (
    <div>
      <PageHeader eyebrow="Financial life" title="Transactions" sub="The raw record of what happened. It keeps your Twin, analytics and AI context current." actions={<><Button variant="secondary" icon={<FileUp className="h-4 w-4" strokeWidth={1.6} />} onClick={() => setImportOpen(true)}>Import</Button><Button icon={<Plus className="h-4 w-4" strokeWidth={1.8} />} onClick={() => compose("transaction")}>Add transaction</Button></>} />
      <div className="mb-4 flex flex-col gap-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <label className="relative flex-1 md:max-w-sm"><Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" strokeWidth={1.5} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search transactions" aria-label="Search transactions" className="h-10 w-full rounded-full border border-line bg-card pl-10 pr-4 text-[13px] outline-none focus:border-accent" /></label>
          <div className="no-scrollbar flex gap-2 overflow-x-auto">{[["all", "All"], ["income", "Income"], ["expense", "Expense"], ["transfer", "Transfer"]].map(([v, l]) => <Pill key={v} active={kind === v} onClick={() => setKind(v)}>{l}</Pill>)}</div>
        </div>
        <div className="grid grid-cols-3 gap-2 md:flex">
          <Select aria-label="Category" className="!h-9 md:w-44 !text-[12.5px]" value={cat} onChange={setCat} options={[{ value: "all", label: "All categories" }, ...CATEGORIES]} />
          <Select aria-label="Account" className="!h-9 md:w-44 !text-[12.5px]" value={acc} onChange={setAcc} options={[{ value: "all", label: "All accounts" }, ...accounts.map((a) => ({ value: String(a.id), label: a.name }))]} />
          <Select aria-label="Month" className="!h-9 md:w-40 !text-[12.5px]" value={month} onChange={setMonth} options={[{ value: "all", label: "All dates" }, ...months.map((m) => ({ value: m, label: new Date(m + "-01").toLocaleDateString("en-GB", { month: "long", year: "numeric" }) }))]} />
        </div>
      </div>
      <div className="mb-3 flex gap-4 text-[12px] text-muted"><span>{list.length} transactions</span><span>In <b className="num text-pos">{fmtMoney(totals.in, currency)}</b></span><span>Out <b className="num text-fg">{fmtMoney(totals.out, currency)}</b></span></div>
      <Card className="!p-2">
        {transactions.length === 0 ? <EmptyState icon={<ArrowLeftRight className="h-5 w-5" strokeWidth={1.5} />} title="No transactions yet" body="Add or import transactions to unlock deeper analytics." action={<div className="flex gap-2"><Button onClick={() => compose("transaction")}>Add</Button><Button variant="secondary" onClick={() => setImportOpen(true)}>Import CSV</Button></div>} />
          : list.length === 0 ? <EmptyState icon={<Search className="h-5 w-5" strokeWidth={1.5} />} title="Nothing matches these filters" body="Try a different search or clear a filter." action={<Button variant="secondary" onClick={() => { setQ(""); setKind("all"); setCat("all"); setAcc("all"); setMonth("all"); }}>Clear filters</Button>} />
          : <motion.ul layout className="relative">
              <AnimatePresence initial={true} mode="popLayout">
                {list.slice(0, limit).map((t) => <TransactionRow key={t.id} t={t} account={accName(t.accountId)} currency={currency} selected={sel?.id === t.id} fresh={fresh.has(`transactions:${t.id}`)} onSelect={() => setSel(t)} onDelete={async () => { await remove("transactions", t.id); toast("Transaction removed — balance restored"); }} />)}
              </AnimatePresence>
            </motion.ul>}
        {list.length > limit && <div className="p-3 text-center"><Button variant="secondary" size="sm" onClick={() => setLimit((l) => l + 40)}>Show more</Button></div>}
      </Card>
      <TxDrawer t={sel} onClose={() => setSel(null)} onSave={async (p) => { if (sel) { await update("transactions", sel.id, p); toast("Transaction updated"); setSel(null); } }} onDelete={async () => { if (sel) { await remove("transactions", sel.id); setSel(null); toast("Transaction removed"); } }} account={accName(sel?.accountId ?? null)} />
      <ImportDrawer open={importOpen} onClose={() => setImportOpen(false)} />
    </div>
  );
}

function TxDrawer({ t, onClose, onSave, onDelete, account }: { t: Transaction | null; onClose: () => void; onSave: (p: Partial<Transaction>) => void; onDelete: () => void; account?: string }) {
  const { currency } = useStore();
  const [cat, setCat] = useState(""); const [amt, setAmt] = useState(0); const [desc, setDesc] = useState(""); const [confirm, setConfirm] = useState(false);
  useEffect(() => { if (t) { setCat(t.category); setAmt(Math.abs(t.amount)); setDesc(t.description); } }, [t]);
  return (
    <>
      <Drawer open={!!t} onClose={onClose} title="Transaction details" footer={<div className="flex justify-between"><Button variant="ghost" icon={<Trash2 className="h-4 w-4" />} onClick={() => setConfirm(true)}>Delete</Button><Button onClick={() => t && onSave({ category: cat, description: desc, amount: t.amount < 0 ? -amt : amt })}>Save changes</Button></div>}>
        {t && <div className="space-y-5">
          <div className="rounded-[22px] bg-card2 p-5 text-center"><IconCircle size={48} tone={t.amount > 0 ? "accent" : "card"}>{CATEGORY_ICON[t.category] ?? CATEGORY_ICON.Other}</IconCircle><div className={cx("num mt-3 text-[28px] font-bold", t.amount > 0 && "text-pos")}>{fmtMoney(t.amount, currency, { sign: true })}</div><div className="text-[12.5px] text-muted">{fmtDate(t.date)} · {account ?? "No account"}</div></div>
          <Field label="Description"><TextInput value={desc} onChange={(e) => setDesc(e.target.value)} /></Field>
          <Field label="Amount"><MoneyInput value={amt} onChange={setAmt} currency={currency} /></Field>
          <Field label="Category"><Select value={cat} onChange={setCat} options={CATEGORIES} /></Field>
          <p className="text-[11.5px] text-muted">Recategorizing changes spending analytics and the AI's month-over-month comparisons.</p>
        </div>}
      </Drawer>
      <ConfirmDialog open={confirm} onClose={() => setConfirm(false)} title="Delete this transaction?" body="The linked account balance will be restored." onConfirm={() => { setConfirm(false); onDelete(); }} />
    </>
  );
}

/* ---------------- Import flow ---------------- */
type Row = { date: string; description: string; amount: number; category: string; status: "valid" | "warning" | "invalid" | "duplicate"; note?: string };
const SAMPLE = `Date,Description,Amount,Category
${new Date().toISOString().slice(0, 10)},Spinneys groceries,-1240,Food
${new Date().toISOString().slice(0, 10)},Client invoice #204,6500,Freelance
${new Date().toISOString().slice(0, 10)},Gym membership,-650,
2024-13-45,Broken row,abc,Other
${new Date().toISOString().slice(0, 10)},Vodafone bill,-310,Utilities`;
function parseCSV(text: string) {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  const split = (l: string) => { const out: string[] = []; let cur = "", qt = false; for (const ch of l) { if (ch === '"') qt = !qt; else if (ch === "," && !qt) { out.push(cur); cur = ""; } else cur += ch; } out.push(cur); return out.map((s) => s.trim()); };
  const header = split(lines[0] ?? "");
  return { header, rows: lines.slice(1).map(split) };
}
function ImportDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { accounts, transactions, create, currency } = useStore();
  const toast = useToast();
  const [step, setStep] = useState(0);
  const [raw, setRaw] = useState(""); const [drag, setDrag] = useState(false);
  const [map, setMap] = useState<Record<string, number>>({ date: 0, description: 1, amount: 2, category: 3 });
  const [acc, setAcc] = useState(String(accounts[0]?.id ?? ""));
  const [busy, setBusy] = useState(false); const [err, setErr] = useState<string | null>(null); const [done, setDone] = useState(0);
  useEffect(() => { if (!open) { setStep(0); setRaw(""); setErr(null); setDone(0); } }, [open]);
  const parsed = useMemo(() => parseCSV(raw), [raw]);
  useEffect(() => {
    const h = parsed.header.map((x) => x.toLowerCase());
    const find = (keys: string[], d: number) => { const i = h.findIndex((x) => keys.some((k) => x.includes(k))); return i >= 0 ? i : d; };
    setMap({ date: find(["date"], 0), description: find(["desc", "name", "merchant", "details"], 1), amount: find(["amount", "value", "sum"], 2), category: find(["cat", "type"], 3) });
  }, [parsed.header]);
  const rows: Row[] = useMemo(() => parsed.rows.map((r) => {
    const date = r[map.date] ?? ""; const description = r[map.description] ?? ""; const amount = parseFloat((r[map.amount] ?? "").replace(/[^\d.\-]/g, ""));
    const category = r[map.category] || "";
    const dOk = /^\d{4}-\d{2}-\d{2}$/.test(date) && !isNaN(new Date(date).getTime());
    if (!dOk || isNaN(amount) || !description) return { date, description, amount: amount || 0, category, status: "invalid" as const, note: !dOk ? "Invalid date" : isNaN(amount) ? "Invalid amount" : "Missing description" };
    if (transactions.some((t) => t.date === date && Math.abs(t.amount - amount) < 0.01 && t.description.toLowerCase() === description.toLowerCase())) return { date, description, amount, category, status: "duplicate" as const, note: "Already in your history" };
    if (!category || !CATEGORIES.includes(category)) return { date, description, amount, category: category && CATEGORIES.includes(category) ? category : "Other", status: "warning" as const, note: "Category set to Other" };
    return { date, description, amount, category, status: "valid" as const };
  }), [parsed, map, transactions]);
  const counts = { valid: rows.filter((r) => r.status === "valid").length, warning: rows.filter((r) => r.status === "warning").length, invalid: rows.filter((r) => r.status === "invalid").length, duplicate: rows.filter((r) => r.status === "duplicate").length };
  const importable = rows.filter((r) => r.status === "valid" || r.status === "warning");
  const onFile = async (f?: File) => { if (!f) return; setRaw(await f.text()); setStep(1); };
  const doImport = async () => {
    setBusy(true); setErr(null);
    try {
      await create("transactions", importable.map((r) => ({ date: r.date, description: r.description, amount: r.amount, category: r.category, kind: r.amount > 0 ? "income" : r.category === "Transfer" ? "transfer" : "expense", accountId: acc ? Number(acc) : null })));
      setDone(importable.length); setStep(4); toast("Transactions imported successfully");
    } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  };
  const steps = ["Upload", "Map columns", "Validate", "Preview", "Done"];
  const st = { valid: { i: <Check className="h-3.5 w-3.5" />, t: "pos" as const }, warning: { i: <AlertTriangle className="h-3.5 w-3.5" />, t: "warn" as const }, invalid: { i: <XCircle className="h-3.5 w-3.5" />, t: "neg" as const }, duplicate: { i: <Copy className="h-3.5 w-3.5" />, t: "neutral" as const } };
  return (
    <Drawer open={open} onClose={onClose} width={620} title="Import transactions" footer={step > 0 && step < 4 ? <div className="flex justify-between"><Button variant="secondary" onClick={() => setStep(step - 1)}>Back</Button>{step < 3 ? <Button disabled={rows.length === 0} onClick={() => setStep(step + 1)}>Continue</Button> : <Button loading={busy} disabled={importable.length === 0} onClick={doImport}>Import {importable.length} rows</Button>}</div> : undefined}>
      <div className="mb-5 flex gap-1.5">{steps.map((s, i) => <div key={s} className="flex-1"><div className={cx("h-1.5 rounded-full transition-colors duration-500", i <= step ? "bg-accent" : "bg-line2")} /><div className={cx("mt-1.5 text-[10.5px] font-semibold", i === step ? "text-fg" : "text-faint")}>{s}</div></div>)}</div>
      <AnimatePresence mode="wait">
        <motion.div key={step} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.25 }}>
          {step === 0 && <div className="space-y-4">
            <label onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)} onDrop={(e) => { e.preventDefault(); setDrag(false); onFile(e.dataTransfer.files[0]); }}
              className={cx("flex cursor-pointer flex-col items-center justify-center rounded-[22px] border-2 border-dashed p-10 text-center transition-colors", drag ? "border-accent bg-accentsoft" : "border-line2 bg-card hover:bg-card2")}>
              <IconCircle size={48} tone={drag ? "accent" : "card"}><Upload className="h-5 w-5" strokeWidth={1.5} /></IconCircle>
              <div className="mt-3 text-[14px] font-bold">Drop a CSV file here</div><div className="text-[12px] text-muted">or click to browse · Date, Description, Amount, Category</div>
              <input type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
            </label>
            <Button variant="secondary" className="w-full" onClick={() => { setRaw(SAMPLE); setStep(1); }}>Use a sample file</Button>
          </div>}
          {step === 1 && <div className="space-y-3">
            <p className="text-[13px] text-muted">We detected {parsed.header.length} columns and {parsed.rows.length} rows. Confirm how they map to your Twin.</p>
            {(["date", "description", "amount", "category"] as const).map((k) => <Field key={k} label={k[0].toUpperCase() + k.slice(1)}><Select value={String(map[k])} onChange={(v) => setMap({ ...map, [k]: Number(v) })} options={parsed.header.map((h, i) => ({ value: String(i), label: h || `Column ${i + 1}` }))} /></Field>)}
            <Field label="Import into account"><Select value={acc} onChange={setAcc} options={[{ value: "", label: "No account" }, ...accounts.map((a) => ({ value: String(a.id), label: a.name }))]} /></Field>
          </div>}
          {step === 2 && <div className="space-y-4">
            <div className="grid grid-cols-4 gap-2">{(Object.keys(counts) as (keyof typeof counts)[]).map((k) => <div key={k} className="rounded-2xl bg-card2 p-3 text-center"><div className="num text-[22px] font-bold">{counts[k]}</div><Badge tone={st[k].t}>{k}</Badge></div>)}</div>
            <ProgressPill value={rows.length ? importable.length / rows.length : 0} />
            <ul className="space-y-1.5">{rows.filter((r) => r.status !== "valid").map((r, i) => <li key={i} className="flex items-center gap-2 rounded-xl bg-card px-3 py-2 text-[12.5px]"><Badge tone={st[r.status].t}>{r.status}</Badge><span className="flex-1 truncate">{r.description || "(empty)"}</span><span className="text-muted">{r.note}</span></li>)}</ul>
            {counts.invalid > 0 && <p className="text-[11.5px] text-muted">Invalid and duplicate rows will be skipped. Fix them in your file and import again anytime.</p>}
          </div>}
          {step === 3 && <div>
            {err && <div className="mb-3"><ErrorState title="Some rows could not be imported." what={err} why="The server rejected part of the batch." next="Check the rows below and try again." /></div>}
            <div className="overflow-hidden rounded-2xl border border-line"><table className="w-full text-[12.5px]"><thead className="bg-card2 text-left text-muted"><tr><th className="p-2.5 font-semibold">Date</th><th className="p-2.5 font-semibold">Description</th><th className="p-2.5 font-semibold">Category</th><th className="p-2.5 text-right font-semibold">Amount</th></tr></thead>
              <tbody>{importable.map((r, i) => <motion.tr key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.04 }} className="border-t border-line"><td className="p-2.5 num">{r.date}</td><td className="p-2.5">{r.description}</td><td className="p-2.5">{r.category}</td><td className="num p-2.5 text-right font-semibold">{fmtMoney(r.amount, currency, { sign: true })}</td></motion.tr>)}</tbody></table></div>
          </div>}
          {step === 4 && <div className="flex flex-col items-center py-10 text-center">
            <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 300, damping: 20 }} className="grid h-16 w-16 place-items-center rounded-full bg-accent text-accentfg">
              <svg viewBox="0 0 24 24" className="h-8 w-8"><motion.path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 0.2, duration: 0.5 }} /></svg>
            </motion.div>
            <h3 className="mt-4 text-[18px] font-bold">{done} transactions imported</h3><p className="mt-1 text-[13px] text-muted">Balances, analytics and your Twin are updated.</p>
            <Button className="mt-5" onClick={onClose}>View transactions</Button>
          </div>}
        </motion.div>
      </AnimatePresence>
    </Drawer>
  );
}
