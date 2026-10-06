"use client";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Pencil, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useStore } from "@/components/store";
import { ACCOUNT_ICON, TransactionRow, useComposer } from "@/components/domain";
import { BarChart, LineChart } from "@/components/charts";
import { Item, Stagger } from "@/components/motion";
import { Button, Card, CardHeader, ConfirmDialog, Drawer, EmptyState, Field, IconCircle, MetricCard, MoneyInput, TextInput, useToast } from "@/components/ui";
import { fmtDate, fmtMoney } from "@/lib/model";

export default function AccountDetail() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { accounts, transactions, goals, simulations, currency, update, remove, fresh } = useStore();
  const compose = useComposer();
  const toast = useToast();
  const a = accounts.find((x) => x.id === Number(id));
  const [edit, setEdit] = useState(false);
  const [del, setDel] = useState(false);
  const [name, setName] = useState(a?.name ?? "");
  const [bal, setBal] = useState(a?.balance ?? 0);
  const tx = useMemo(() => transactions.filter((t) => t.accountId === Number(id)), [transactions, id]);

  const stats = useMemo(() => {
    const now = new Date(); const key = now.toISOString().slice(0, 7);
    const month = tx.filter((t) => t.date.startsWith(key));
    const inflow = month.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0);
    const outflow = -month.filter((t) => t.amount < 0).reduce((s, t) => s + t.amount, 0);
    const months = Array.from({ length: 4 }, (_, i) => { const d = new Date(now.getFullYear(), now.getMonth() - 3 + i, 1); return d.toISOString().slice(0, 7); });
    const flows = months.map((mk) => ({ label: new Date(mk + "-01").toLocaleDateString("en-GB", { month: "short" }), a: tx.filter((t) => t.date.startsWith(mk) && t.amount > 0).reduce((s, t) => s + t.amount, 0), b: -tx.filter((t) => t.date.startsWith(mk) && t.amount < 0).reduce((s, t) => s + t.amount, 0) }));
    // reconstruct balance trend backwards from the current balance
    const sorted = [...tx].sort((x, y) => (x.date < y.date ? 1 : -1));
    let b = a?.balance ?? 0; const pts: { d: string; v: number }[] = [{ d: "Now", v: b }];
    for (const t of sorted.slice(0, 40)) { b -= t.amount; pts.push({ d: fmtDate(t.date), v: b }); }
    pts.reverse();
    return { inflow, outflow, flows, trend: pts };
  }, [tx, a]);

  if (!a) return <Card><EmptyState icon={<ArrowLeft className="h-5 w-5" />} title="Account not found" body="It may have been removed." action={<Button href="/app/accounts">Back to accounts</Button>} /></Card>;
  const cur = a.currency || currency;
  const money = (v: number) => fmtMoney(v, cur);
  const linked = goals.filter((g) => g.accountId === a.id);

  return (
    <div>
      <Link href="/app/accounts" className="mb-4 inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-muted hover:text-fg"><ArrowLeft className="h-4 w-4" strokeWidth={1.5} />Accounts</Link>
      <motion.div layoutId={`account-${a.id}`} className="card mb-5 flex flex-col gap-4 p-5 md:flex-row md:items-center">
        <IconCircle size={52} tone={a.type === "Credit Card" ? "ink" : "accent"}>{ACCOUNT_ICON[a.type]}</IconCircle>
        <div className="flex-1"><h1 className="text-[24px] font-bold tracking-tight">{a.name}</h1><p className="text-[12.5px] text-muted">{a.type} · {cur} · updated {fmtDate(a.updatedAt)}</p></div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" icon={<Pencil className="h-3.5 w-3.5" />} onClick={() => { setName(a.name); setBal(a.balance); setEdit(true); }}>Edit</Button>
          <Button variant="secondary" size="sm" icon={<Trash2 className="h-3.5 w-3.5" />} onClick={() => setDel(true)}>Delete</Button>
          <Button size="sm" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => compose("transaction", { accountId: a.id })}>Add Transaction</Button>
        </div>
      </motion.div>
      <Stagger className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Item className="col-span-2 md:col-span-1"><MetricCard solid label="Current balance" value={a.balance} format={money} /></Item>
        <Item><MetricCard label="Inflow this month" value={stats.inflow} format={money} /></Item>
        <Item><MetricCard label="Outflow this month" value={stats.outflow} format={money} /></Item>
        <Item className="col-span-2 md:col-span-1"><MetricCard label="Net change" value={stats.inflow - stats.outflow} format={(v) => fmtMoney(v, cur, { sign: true })} deltaTone={stats.inflow - stats.outflow >= 0 ? "pos" : "neg"} delta={stats.inflow - stats.outflow >= 0 ? "growing" : "shrinking"} /></Item>
      </Stagger>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card><CardHeader title="Balance trend" sub="Reconstructed from transactions" />{stats.trend.length > 1 ? <LineChart series={[{ label: "Balance", data: stats.trend.map((p) => p.v), fill: true }]} labels={stats.trend.map((p) => p.d)} currency={cur} /> : <p className="py-10 text-center text-[13px] text-muted">Add transactions to see a trend.</p>}</Card>
        <Card><CardHeader title="Cash flow" sub="Inflow vs outflow by month" /><BarChart data={stats.flows} currency={cur} names={["Inflow", "Outflow"]} keys={["a", "b"]} /></Card>
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2 !p-3"><div className="px-2 pt-2"><CardHeader title="Recent transactions" sub={`${tx.length} total`} /></div>
          {tx.length === 0 ? <EmptyState icon={<Plus className="h-5 w-5" />} title="No transactions" body="Add or import transactions to unlock deeper analytics." /> :
            <ul><AnimatePresence initial={false}>{tx.slice(0, 12).map((t) => <TransactionRow key={t.id} t={t} currency={cur} fresh={fresh.has(`transactions:${t.id}`)} onDelete={async () => { await remove("transactions", t.id); toast("Transaction removed"); }} />)}</AnimatePresence></ul>}
        </Card>
        <div className="space-y-4">
          <Card><CardHeader title="Linked goals" />{linked.length ? linked.map((g) => <Link key={g.id} href={`/app/goals/${g.id}`} className="block rounded-xl p-2 text-[13px] font-semibold hover:bg-glow">{g.name}<span className="num ml-2 text-muted">{fmtMoney(g.current, currency, { compact: true })}</span></Link>) : <p className="text-[12.5px] text-muted">No goals linked to this account.</p>}</Card>
          <Card><CardHeader title="Related simulations" />{simulations.slice(0, 3).map((s) => <Link key={s.id} href={`/app/simulations/${s.id}`} className="flex justify-between rounded-xl p-2 text-[13px] hover:bg-glow"><span className="font-semibold">{s.scenarioName}</span><span className="num text-muted">{fmtDate(s.createdAt)}</span></Link>)}{simulations.length === 0 && <p className="text-[12.5px] text-muted">Every simulation uses this balance as starting liquidity.</p>}</Card>
        </div>
      </div>
      <Drawer open={edit} onClose={() => setEdit(false)} title="Edit account" footer={<div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setEdit(false)}>Cancel</Button><Button onClick={async () => { await update("accounts", a.id, { name, balance: bal }); setEdit(false); toast("Account updated"); }}>Save</Button></div>}>
        <div className="space-y-4"><Field label="Name"><TextInput value={name} onChange={(e) => setName(e.target.value)} /></Field><Field label="Balance" hint="Adjusting the balance directly does not create a transaction."><MoneyInput value={bal} onChange={setBal} currency={cur} /></Field></div>
      </Drawer>
      <ConfirmDialog open={del} onClose={() => setDel(false)} title={`Delete ${a.name}?`} body="Transactions stay in your history but will no longer be linked to this account. Your Twin's liquidity will change." onConfirm={async () => { await remove("accounts", a.id); toast("Account deleted"); router.push("/app/accounts"); }} />
    </div>
  );
}
