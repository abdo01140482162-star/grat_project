"use client";
import { AnimatePresence, motion } from "framer-motion";
import { Plus, Wallet } from "lucide-react";
import { useStore } from "@/components/store";
import { AccountCard, useComposer } from "@/components/domain";
import { Item, Stagger } from "@/components/motion";
import { Button, Card, EmptyState, MetricCard, PageHeader } from "@/components/ui";
import { fmtMoney } from "@/lib/model";

export default function AccountsPage() {
  const { accounts, currency, fresh, m } = useStore();
  const compose = useComposer();
  const money = (v: number) => fmtMoney(v, currency);
  return (
    <div>
      <PageHeader eyebrow="Financial life" title="Accounts" sub="Where your money lives today. Balances flow straight into your Twin's liquidity and emergency coverage." actions={<Button icon={<Plus className="h-4 w-4" strokeWidth={1.8} />} onClick={() => compose("account")}>Add account</Button>} />
      <Stagger className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Item className="col-span-2 md:col-span-1"><MetricCard solid label="Liquid balance" value={m.liquid} format={money} sub="cash & bank" /></Item>
        <Item><MetricCard label="Credit owed" value={m.creditCards} format={money} deltaTone="neutral" delta={m.creditCards > 0 ? "revolving" : "clear"} /></Item>
        <Item><MetricCard label="Accounts" value={accounts.length} format={(v) => String(Math.round(v))} sub="connected to Twin" /></Item>
        <Item className="col-span-2 md:col-span-1"><MetricCard label="Coverage" value={m.coverage} format={(v) => `${v.toFixed(1)} mo`} sub="of essentials" /></Item>
      </Stagger>
      {accounts.length === 0 ? (
        <Card><EmptyState icon={<Wallet className="h-5 w-5" strokeWidth={1.5} />} title="No accounts yet" body="Add your first account to start modeling your financial life." action={<Button onClick={() => compose("account")}>Add account</Button>} /></Card>
      ) : (
        <motion.div layout className="grid gap-3 md:grid-cols-2">
          <AnimatePresence initial={false}>
            {accounts.map((a, i) => (
              <motion.div key={a.id} layout layoutId={`account-${a.id}`} initial={{ opacity: 0, y: -12, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1, transition: { delay: i * 0.05 } }} exit={{ opacity: 0, scale: 0.97 }}>
                <AccountCard a={a} currency={currency} fresh={fresh.has(`accounts:${a.id}`)} />
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  );
}
