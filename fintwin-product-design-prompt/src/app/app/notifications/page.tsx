"use client";
import { AnimatePresence, motion } from "framer-motion";
import { Bell, CheckCheck, FlaskConical, Settings2, Target, Wallet, Cpu, X } from "lucide-react";
import { useMemo, useState } from "react";
import { api, useStore } from "@/components/store";
import { Button, Card, EmptyState, PageHeader, Pill, cx } from "@/components/ui";

const ICON: Record<string, React.ReactNode> = { financial: <Wallet className="h-4 w-4" strokeWidth={1.5} />, goals: <Target className="h-4 w-4" strokeWidth={1.5} />, simulation: <FlaskConical className="h-4 w-4" strokeWidth={1.5} />, system: <Cpu className="h-4 w-4" strokeWidth={1.5} /> };
function ago(d: string) { const s = (Date.now() - new Date(d).getTime()) / 1000; if (s < 60) return "just now"; if (s < 3600) return `${Math.floor(s / 60)}m ago`; if (s < 86400) return `${Math.floor(s / 3600)}h ago`; return `${Math.floor(s / 86400)}d ago`; }

export default function NotificationsPage() {
  const { notifications, update, remove, setData } = useStore();
  const [type, setType] = useState("all");
  const list = useMemo(() => notifications.filter((n) => type === "all" || n.type === type), [notifications, type]);
  const markAll = async () => { setData((d) => ({ ...d, notifications: d.notifications.map((n) => ({ ...n, read: true })) })); await api("/api/manage", "POST", { action: "markAllRead" }); };
  return (
    <div>
      <PageHeader eyebrow="Account" title="Notifications" sub="Meaningful changes across your financial life, goals and simulations." actions={<><Button variant="secondary" href="/app/settings#notifications" icon={<Settings2 className="h-4 w-4" strokeWidth={1.5} />}>Settings</Button><Button onClick={markAll} icon={<CheckCheck className="h-4 w-4" strokeWidth={1.6} />}>Mark all read</Button></>} />
      <div className="no-scrollbar mb-4 flex gap-2 overflow-x-auto">{[["all", "All"], ["financial", "Financial"], ["goals", "Goals"], ["simulation", "Simulation"], ["system", "System"]].map(([v, l]) => <Pill key={v} active={type === v} onClick={() => setType(v)}>{l}</Pill>)}</div>
      {list.length === 0 ? <Card><EmptyState icon={<Bell className="h-5 w-5" strokeWidth={1.5} />} title="You're all caught up" body="New simulation results, goal milestones and spending changes will appear here." /></Card> : (
        <motion.ul layout className="space-y-2">
          <AnimatePresence initial={false}>
            {list.map((n, i) => (
              <motion.li key={n.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0, transition: { delay: Math.min(i, 10) * 0.04 } }} exit={{ opacity: 0, height: 0, marginTop: 0 }}
                className={cx("card group flex items-center gap-3 !rounded-[20px] p-3.5 transition-colors", !n.read && "!bg-glow")} onClick={() => !n.read && update("notifications", n.id, { read: true })}>
                <span className={cx("grid h-9 w-9 shrink-0 place-items-center rounded-full", n.read ? "bg-card2" : "bg-accent text-accentfg")}>{ICON[n.type] ?? <Bell className="h-4 w-4" />}</span>
                <div className="min-w-0 flex-1"><div className="flex items-center gap-2 text-[13.5px] font-semibold">{n.title}{!n.read && <span className="h-1.5 w-1.5 rounded-full bg-accent" />}</div>{n.body && <div className="truncate text-[12px] text-muted">{n.body}</div>}</div>
                <span className="shrink-0 text-[11px] text-faint">{ago(n.createdAt)}</span>
                <button aria-label="Dismiss" onClick={(e) => { e.stopPropagation(); remove("notifications", n.id); }} className="grid h-7 w-7 place-items-center rounded-full text-muted opacity-0 transition hover:bg-card2 group-hover:opacity-100 focus:opacity-100"><X className="h-3.5 w-3.5" /></button>
              </motion.li>
            ))}
          </AnimatePresence>
        </motion.ul>
      )}
    </div>
  );
}
