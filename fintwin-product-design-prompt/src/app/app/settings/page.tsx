"use client";
import { Download, RotateCcw, Trash2, Upload, Shield, Database } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { api, useStore } from "@/components/store";
import { useTheme } from "@/components/shell";
import { Item, Stagger } from "@/components/motion";
import { Badge, Button, Card, CardHeader, ConfirmDialog, PageHeader, Segmented, Select, Toggle, useToast } from "@/components/ui";
import { PREFERENCE_ADJ, type Twin } from "@/lib/model";

export default function SettingsPage() {
  const { user, setUser, twin, saveTwin, reload } = useStore();
  const toast = useToast();
  const router = useRouter();
  const { theme, toggle } = useTheme();
  const s = user.settings as Record<string, unknown>;
  const [confirm, setConfirm] = useState<null | "deleteTransactions" | "deleteProfile" | "deleteAccount" | "resetDemo">(null);
  const [busy, setBusy] = useState(false);
  const [motionPref, setMotionPref] = useState<string>(typeof window !== "undefined" ? localStorage.getItem("fintwin-motion") ?? "full" : "full");
  const fileRef = useRef<HTMLInputElement>(null);
  const setS = async (patch: Record<string, unknown>) => { setUser({ settings: { ...s, ...patch } }); await api("/api/manage", "POST", { action: "settings", settings: patch }); toast("Setting saved"); };
  const exportAll = async () => { const d = await api("/api/manage"); const b = new Blob([JSON.stringify(d, null, 2)], { type: "application/json" }); const a = document.createElement("a"); a.href = URL.createObjectURL(b); a.download = `fintwin-backup-${new Date().toISOString().slice(0, 10)}.json`; a.click(); toast("Backup downloaded"); };
  const restore = async (f?: File) => { if (!f) return; try { const data = JSON.parse(await f.text()); await api("/api/manage", "POST", { action: "restore", data }); await reload(); toast("Data restored from backup"); } catch (e) { toast((e as Error).message || "That file couldn't be restored"); } };
  const run = async () => {
    if (!confirm) return; setBusy(true);
    try { const r = await api<{ next?: string }>("/api/manage", "POST", { action: confirm }); setConfirm(null); if (r.next) { router.push(r.next); router.refresh(); } else { await reload(); toast(confirm === "resetDemo" ? "Demo data restored" : "Transactions deleted"); } }
    finally { setBusy(false); }
  };
  const Row = ({ t, d, c }: { t: string; d?: string; c: React.ReactNode }) => <div className="flex items-center justify-between gap-4 border-b border-line py-3.5 last:border-0"><div><div className="text-[13.5px] font-semibold">{t}</div>{d && <div className="text-[12px] text-muted">{d}</div>}</div><div className="shrink-0">{c}</div></div>;
  const DIALOG = {
    deleteTransactions: { t: "Delete all transactions?", b: "Your accounts, goals and Twin stay. Analytics and AI month comparisons will be empty.", w: undefined, l: "Delete transactions" },
    deleteProfile: { t: "Delete your financial profile?", b: "This removes your Twin, accounts, transactions, goals, scenarios, simulations and reports. You'll rebuild your Twin from onboarding.", w: "DELETE", l: "Delete profile" },
    deleteAccount: { t: "Delete your FinTwin account?", b: "Your account and every piece of data will be permanently erased. This cannot be undone.", w: user.email, l: "Delete account" },
    resetDemo: { t: "Replace data with demo data?", b: "Your current financial profile will be replaced with the sample Twin.", w: undefined, l: "Reset to demo" },
  };
  return (
    <div>
      <PageHeader eyebrow="Account" title="Settings" />
      <Stagger className="grid gap-4 lg:grid-cols-2">
        <Item><Card><CardHeader title="Appearance" />
          <Row t="Theme" c={<Segmented size="sm" value={theme} onChange={(v) => v !== theme && toggle()} options={[{ value: "light", label: "Light" }, { value: "dark", label: "Dark" }]} />} />
          <Row t="Motion" d="Reduced motion keeps state changes but removes large movement." c={<Segmented size="sm" value={motionPref} onChange={(v) => { setMotionPref(v); localStorage.setItem("fintwin-motion", v); document.documentElement.dataset.motion = v; }} options={[{ value: "full", label: "Full" }, { value: "reduced", label: "Reduced" }]} />} />
          <Row t="Currency" c={<Select className="!h-9 !w-28" value={twin.profile.currency} onChange={(v) => saveTwin({ ...twin, profile: { ...twin.profile, currency: v } })} options={["EGP", "USD", "EUR", "GBP", "SAR", "AED"]} />} />
        </Card></Item>
        <Item><Card><div id="notifications" /><CardHeader title="Notifications" />
          {[["notifyFinancial", "Financial changes", "Spending changes, low balances, income changes"], ["notifyGoals", "Goals", "Progress, milestones and risk"], ["notifySimulation", "Simulations", "Finished runs and scenario updates"], ["notifySystem", "System", "Imports and data validation"]].map(([k, t, d]) => <Row key={k} t={t} d={d} c={<Toggle label={t} checked={s[k] !== false} onChange={(v) => setS({ [k]: v })} />} />)}
        </Card></Item>
        <Item><Card><CardHeader title="Simulation" />
          <Row t="Default paths" c={<Select className="!h-9 !w-28" value={String(s.defaultPaths ?? 600)} onChange={(v) => setS({ defaultPaths: Number(v) })} options={["100", "300", "600", "1000", "5000"]} />} />
          <Row t="Default horizon" c={<Select className="!h-9 !w-28" value={String(twin.assumptions.horizonYears)} onChange={(v) => saveTwin({ ...twin, assumptions: { ...twin.assumptions, horizonYears: Number(v) } })} options={["5", "10", "15", "20", "30"]} />} />
          <Row t="Uncertainty style" c={<Select className="!h-9 !w-48" value={twin.preference} onChange={(v) => saveTwin({ ...twin, preference: v as Twin["preference"] })} options={Object.entries(PREFERENCE_ADJ).map(([k, v]) => ({ value: k, label: v.label }))} />} />
        </Card></Item>
        <Item><Card><CardHeader title="AI" />
          <Row t="AI analysis" d="Grounded explanations based on your Twin and simulations." c={<Toggle label="AI analysis" checked={s.aiEnabled !== false} onChange={(v) => setS({ aiEnabled: v })} />} />
          <Row t="Show model context by default" c={<Toggle label="Model context" checked={s.aiContext === true} onChange={(v) => setS({ aiContext: v })} />} />
          <Row t="Analysis engine" d="Runs on FinTwin's own model. No data leaves the app." c={<Badge tone="neutral" dot={false}>Local</Badge>} />
        </Card></Item>
        <Item><Card><CardHeader title="Privacy & security" action={<Shield className="h-4 w-4 text-muted" strokeWidth={1.5} />} />
          <Row t="Password" d="Change it from your profile" c={<Button size="sm" variant="secondary" href="/app/profile">Manage</Button>} />
          <Row t="Session" d="Signed in on this device" c={<Button size="sm" variant="secondary" onClick={async () => { await api("/api/auth/logout", "POST"); router.push("/login"); }}>Log out</Button>} />
          <Row t="Data use" d="Your data is used only to model your finances. It is never sold or shared." c={<Badge tone="pos">Private</Badge>} />
        </Card></Item>
        <Item><Card><CardHeader title="Data management" action={<Database className="h-4 w-4 text-muted" strokeWidth={1.5} />} />
          <Row t="Export all data" d="Download a complete JSON backup" c={<Button size="sm" variant="secondary" icon={<Download className="h-3.5 w-3.5" />} onClick={exportAll}>Export</Button>} />
          <Row t="Restore from backup" d="Replace your data with a FinTwin backup file" c={<><Button size="sm" variant="secondary" icon={<Upload className="h-3.5 w-3.5" />} onClick={() => fileRef.current?.click()}>Restore</Button><input ref={fileRef} type="file" accept="application/json" className="hidden" onChange={(e) => restore(e.target.files?.[0])} /></>} />
          <Row t="Import transactions" d="CSV import with validation" c={<Button size="sm" variant="secondary" href="/app/transactions?import=1">Import</Button>} />
          <Row t="Reset to demo data" c={<Button size="sm" variant="secondary" icon={<RotateCcw className="h-3.5 w-3.5" />} onClick={() => setConfirm("resetDemo")}>Reset</Button>} />
          <Row t="Delete transactions" c={<Button size="sm" variant="secondary" onClick={() => setConfirm("deleteTransactions")}>Delete</Button>} />
          <Row t="Delete financial profile" c={<Button size="sm" variant="secondary" onClick={() => setConfirm("deleteProfile")}>Delete</Button>} />
          <Row t="Delete account" c={<Button size="sm" variant="danger" icon={<Trash2 className="h-3.5 w-3.5" />} onClick={() => setConfirm("deleteAccount")}>Delete</Button>} />
        </Card></Item>
      </Stagger>
      {confirm && <ConfirmDialog open onClose={() => setConfirm(null)} onConfirm={run} loading={busy} title={DIALOG[confirm].t} body={DIALOG[confirm].b} confirmWord={DIALOG[confirm].w} confirmLabel={DIALOG[confirm].l} />}
    </div>
  );
}
