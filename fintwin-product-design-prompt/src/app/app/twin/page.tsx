"use client";
import { Pencil, Plus, Trash2, Layers, Info } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useStore } from "@/components/store";
import { CountUp, Item, ProgressPill, Stagger } from "@/components/motion";
import { Button, Card, CardHeader, Drawer, Field, MoneyInput, PageHeader, Select, TextInput, useToast, Badge } from "@/components/ui";
import { GOAL_ICON, goalStatus } from "@/components/domain";
import { ASSUMPTION_INFO, EXPENSE_KEYS, EXPENSE_LABELS, ESSENTIAL, type Twin, fmtMoney, fmtPct, uid, type Assumptions, PREFERENCE_ADJ } from "@/lib/model";

type Section = "income" | "expenses" | "assets" | "liabilities" | "assumptions" | null;

export default function TwinPage() {
  const { twin, saveTwin, m, currency, goals, accounts } = useStore();
  const toast = useToast();
  const [edit, setEdit] = useState<Section>(null);
  const [draft, setDraft] = useState<Twin>(twin);
  const open = (s: Section) => { setDraft(structuredClone(twin)); setEdit(s); };
  const save = async () => { await saveTwin(draft); setEdit(null); toast("Twin updated — future simulations use the new values"); };
  const money = (v: number) => fmtMoney(v, currency);
  const EditBtn = ({ s }: { s: Section }) => <Button size="sm" variant="ghost" onClick={() => open(s)} icon={<Pencil className="h-3.5 w-3.5" strokeWidth={1.6} />}>Edit</Button>;
  const Row = ({ l, v, sub }: { l: string; v: number; sub?: string }) => (
    <div className="group flex items-center justify-between rounded-xl px-2 py-2 transition hover:bg-glow"><span className="text-[13px] text-muted">{l}{sub && <span className="ml-1.5 text-[11px] text-faint">{sub}</span>}</span><span className="num text-[13.5px] font-semibold">{money(v)}</span></div>
  );
  const assetsPct = m.totalAssets / Math.max(1, m.totalAssets + m.totalDebt);

  return (
    <div>
      <PageHeader eyebrow="Financial life" title="Your Financial Twin" sub="A living model of your money. Every simulation, insight and report starts here — edit anything and the whole system updates." actions={<Button href="/app/simulations">Simulate from this Twin</Button>} />
      <Stagger className="grid gap-4 lg:grid-cols-3">
        <Item className="lg:col-span-3">
          <div className="card-solid relative overflow-hidden p-6 md:p-8">
            <div className="hatch absolute inset-y-0 right-0 w-1/3 opacity-30" />
            <div className="relative grid gap-6 md:grid-cols-4">
              <div className="md:col-span-2">
                <div className="flex items-center gap-2 text-[12.5px] font-semibold text-solidmuted"><Layers className="h-4 w-4" strokeWidth={1.5} />Net worth · {twin.profile.name || "You"}, {twin.profile.age} · {twin.profile.city}</div>
                <CountUp value={m.netWorth} format={money} className="mt-3 block text-[40px] font-bold leading-none md:text-[52px]" />
                <div className="mt-5 flex h-3 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-accent transition-all duration-700" style={{ width: `${assetsPct * 100}%` }} /></div>
                <div className="mt-2 flex justify-between text-[11.5px] text-solidmuted"><span>Assets {money(m.totalAssets)}</span><span>Debt {money(m.totalDebt)}</span></div>
              </div>
              {[{ l: "Monthly surplus", v: money(m.savings), s: `${fmtPct(m.savingsRate, 0)} of income` }, { l: "Essential coverage", v: `${m.coverage.toFixed(1)} months`, s: `${money(m.liquid)} liquid` }].map((x) => (
                <div key={x.l} className="rounded-[18px] bg-white/5 p-4"><div className="text-[12px] text-solidmuted">{x.l}</div><div className="num mt-2 text-[22px] font-bold text-accent">{x.v}</div><div className="mt-1 text-[11.5px] text-solidmuted">{x.s}</div></div>
              ))}
            </div>
          </div>
        </Item>

        <Item><Card className="h-full">
          <CardHeader title="Income" sub={`${twin.employment} · ${twin.income.frequency}`} action={<EditBtn s="income" />} />
          <Row l="Primary income" v={twin.income.monthly} /><Row l="Additional income" v={twin.income.additional} />
          <div className="mt-3 flex items-center justify-between border-t border-line pt-3"><span className="text-[13px] font-bold">Total monthly</span><CountUp value={m.income} format={money} className="text-[16px] font-bold" /></div>
          <div className="mt-2 text-[11.5px] text-muted">Assumed growth {twin.income.growth}% / year{twin.income.unsure && " (estimated)"}</div>
        </Card></Item>

        <Item><Card className="h-full">
          <CardHeader title="Expenses" sub={`${money(m.essential)} essential · ${money(m.flexible)} flexible`} action={<EditBtn s="expenses" />} />
          <div className="max-h-[220px] overflow-y-auto pr-1">
            {EXPENSE_KEYS.filter((k) => twin.expenses[k] > 0).map((k) => <Row key={k} l={EXPENSE_LABELS[k]} v={twin.expenses[k]} sub={ESSENTIAL.includes(k) ? "essential" : undefined} />)}
            {m.debtPayments > 0 && <Row l="Debt payments" v={m.debtPayments} sub="from liabilities" />}
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-line pt-3"><span className="text-[13px] font-bold">Total monthly</span><CountUp value={m.expenses} format={money} className="text-[16px] font-bold" /></div>
        </Card></Item>

        <Item><Card className="h-full">
          <CardHeader title="Financial assumptions" sub={`${PREFERENCE_ADJ[twin.preference].label} · ${twin.assumptions.horizonYears}-year horizon`} action={<EditBtn s="assumptions" />} />
          {(Object.keys(ASSUMPTION_INFO) as (keyof Assumptions)[]).map((k) => (
            <div key={k} className="flex items-center justify-between rounded-xl px-2 py-1.5 hover:bg-glow"><span className="text-[13px] text-muted">{ASSUMPTION_INFO[k].label}</span><span className="num text-[13.5px] font-semibold">{twin.assumptions[k]}{ASSUMPTION_INFO[k].unit === "%" ? "%" : " yrs"}</span></div>
          ))}
          <Link href="/app/economy" className="mt-2 inline-block text-[12px] font-semibold text-muted hover:text-fg">Open Economic Environment →</Link>
        </Card></Item>

        <Item><Card className="h-full">
          <CardHeader title="Assets" sub={money(m.totalAssets)} action={<EditBtn s="assets" />} />
          {accounts.filter((a) => a.balance > 0).map((a) => <Row key={`a${a.id}`} l={a.name} v={a.balance} sub={a.type} />)}
          {twin.assets.map((a) => <Row key={a.id} l={a.name} v={a.value} sub={a.type} />)}
          <div className="mt-2 flex items-center gap-1.5 text-[11.5px] text-muted"><Info className="h-3.5 w-3.5" strokeWidth={1.5} />Account balances sync from <Link href="/app/accounts" className="font-semibold text-fg">Accounts</Link>.</div>
        </Card></Item>

        <Item><Card className="h-full">
          <CardHeader title="Liabilities" sub={money(m.totalDebt)} action={<EditBtn s="liabilities" />} />
          {twin.liabilities.length === 0 && m.creditCards === 0 ? <p className="py-6 text-center text-[13px] text-muted">No debts recorded.</p> : (
            <div className="space-y-3">
              {twin.liabilities.map((l) => (
                <div key={l.id} className="rounded-2xl bg-card2 p-3">
                  <div className="flex justify-between text-[13px]"><span className="font-semibold">{l.name}</span><span className="num font-bold">{money(l.balance)}</span></div>
                  <div className="mt-1 flex justify-between text-[11.5px] text-muted"><span>{money(l.payment)}/mo · {l.rate}%</span><span>{l.months} months left</span></div>
                </div>
              ))}
              {m.creditCards > 0 && <Row l="Credit card balances" v={m.creditCards} sub="from accounts" />}
            </div>
          )}
        </Card></Item>

        <Item><Card className="h-full">
          <CardHeader title="Goals" sub={`${goals.length} connected`} action={<Link href="/app/goals" className="text-[12px] font-semibold text-muted hover:text-fg">Manage</Link>} />
          <div className="space-y-3">{goals.map((g) => { const s = goalStatus(g); return (
            <Link key={g.id} href={`/app/goals/${g.id}`} className="flex items-center gap-3 rounded-2xl p-1.5 hover:bg-glow">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-card2">{GOAL_ICON[g.kind] ?? GOAL_ICON.Custom}</span>
              <div className="flex-1"><div className="flex justify-between text-[12.5px]"><span className="font-semibold">{g.name}</span><Badge tone={s.tone} dot={false}>{fmtPct(s.p, 0)}</Badge></div><ProgressPill className="mt-1.5" value={s.p} height={5} /></div>
            </Link>
          ); })}</div>
        </Card></Item>
      </Stagger>

      <Drawer open={edit !== null} onClose={() => setEdit(null)} title={{ income: "Edit income", expenses: "Edit expenses", assets: "Edit assets", liabilities: "Edit liabilities", assumptions: "Edit assumptions" }[edit ?? "income"]}
        footer={<div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setEdit(null)}>Cancel</Button><Button onClick={save}>Save to Twin</Button></div>}>
        {edit === "income" && <div className="space-y-4">
          <Field label="Employment"><Select value={draft.employment} onChange={(v) => setDraft({ ...draft, employment: v })} options={["Employed", "Self-employed", "Freelancer", "Business owner", "Student", "Unemployed", "Retired", "Other"]} /></Field>
          <Field label="Primary monthly income"><MoneyInput value={draft.income.monthly} onChange={(v) => setDraft({ ...draft, income: { ...draft.income, monthly: v } })} currency={currency} /></Field>
          <Field label="Additional monthly income"><MoneyInput value={draft.income.additional} onChange={(v) => setDraft({ ...draft, income: { ...draft.income, additional: v } })} currency={currency} /></Field>
          <Field label="Expected annual growth"><MoneyInput value={draft.income.growth} onChange={(v) => setDraft({ ...draft, income: { ...draft.income, growth: v }, assumptions: { ...draft.assumptions, incomeGrowth: v } })} currency="" suffix="%" /></Field>
        </div>}
        {edit === "expenses" && <div className="grid grid-cols-2 gap-3">{EXPENSE_KEYS.map((k) => <Field key={k} label={EXPENSE_LABELS[k]}><MoneyInput value={draft.expenses[k]} onChange={(v) => setDraft({ ...draft, expenses: { ...draft.expenses, [k]: v } })} currency={currency} /></Field>)}</div>}
        {edit === "assumptions" && <div className="space-y-4">{(Object.keys(ASSUMPTION_INFO) as (keyof Assumptions)[]).map((k) => <Field key={k} label={ASSUMPTION_INFO[k].label} hint={ASSUMPTION_INFO[k].why}><MoneyInput value={draft.assumptions[k]} onChange={(v) => setDraft({ ...draft, assumptions: { ...draft.assumptions, [k]: v } })} currency="" suffix={ASSUMPTION_INFO[k].unit} /></Field>)}</div>}
        {edit === "assets" && <div className="space-y-3">
          {draft.assets.map((a, i) => (
            <div key={a.id} className="grid grid-cols-[1fr_auto] gap-2 rounded-2xl bg-card2 p-3">
              <TextInput value={a.name} onChange={(e) => { const x = [...draft.assets]; x[i] = { ...a, name: e.target.value }; setDraft({ ...draft, assets: x }); }} aria-label="Asset name" />
              <button aria-label="Remove asset" onClick={() => setDraft({ ...draft, assets: draft.assets.filter((y) => y.id !== a.id) })} className="grid w-11 place-items-center rounded-2xl text-muted hover:text-neg"><Trash2 className="h-4 w-4" strokeWidth={1.5} /></button>
              <Select value={a.type} onChange={(v) => { const x = [...draft.assets]; x[i] = { ...a, type: v }; setDraft({ ...draft, assets: x }); }} options={["Investments", "Property", "Vehicle", "Business", "Other"]} />
              <div className="col-span-2"><MoneyInput value={a.value} onChange={(v) => { const x = [...draft.assets]; x[i] = { ...a, value: v }; setDraft({ ...draft, assets: x }); }} currency={currency} /></div>
            </div>
          ))}
          <Button variant="secondary" icon={<Plus className="h-4 w-4" />} onClick={() => setDraft({ ...draft, assets: [...draft.assets, { id: uid(), name: "New asset", type: "Investments", value: 0 }] })}>Add asset</Button>
        </div>}
        {edit === "liabilities" && <div className="space-y-3">
          {draft.liabilities.map((l, i) => {
            const set = (p: Partial<typeof l>) => { const x = [...draft.liabilities]; x[i] = { ...l, ...p }; setDraft({ ...draft, liabilities: x }); };
            return (
              <div key={l.id} className="space-y-2 rounded-2xl bg-card2 p-3">
                <div className="flex gap-2"><TextInput value={l.name} onChange={(e) => set({ name: e.target.value })} aria-label="Debt name" /><button aria-label="Remove" onClick={() => setDraft({ ...draft, liabilities: draft.liabilities.filter((y) => y.id !== l.id) })} className="grid w-11 place-items-center text-muted hover:text-neg"><Trash2 className="h-4 w-4" strokeWidth={1.5} /></button></div>
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Balance"><MoneyInput value={l.balance} onChange={(v) => set({ balance: v })} currency={currency} /></Field>
                  <Field label="Monthly payment"><MoneyInput value={l.payment} onChange={(v) => set({ payment: v })} currency={currency} /></Field>
                  <Field label="Interest rate"><MoneyInput value={l.rate} onChange={(v) => set({ rate: v })} currency="" suffix="%" /></Field>
                  <Field label="Months left"><MoneyInput value={l.months} onChange={(v) => set({ months: v })} currency="" suffix="mo" /></Field>
                </div>
              </div>
            );
          })}
          <Button variant="secondary" icon={<Plus className="h-4 w-4" />} onClick={() => setDraft({ ...draft, liabilities: [...draft.liabilities, { id: uid(), name: "New loan", type: "Personal loan", balance: 0, payment: 0, rate: 0, months: 12 }] })}>Add liability</Button>
        </div>}
      </Drawer>
    </div>
  );
}
