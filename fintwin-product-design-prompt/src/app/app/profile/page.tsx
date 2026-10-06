"use client";
import { BadgeCheck, Pencil } from "lucide-react";
import { useState } from "react";
import { api, useStore } from "@/components/store";
import { Item, Stagger } from "@/components/motion";
import { Avatar, Badge, Button, Card, CardHeader, Drawer, Field, MoneyInput, PageHeader, Select, TextInput, useToast } from "@/components/ui";
import { PREFERENCE_ADJ, fmtDate, type Twin } from "@/lib/model";

export default function ProfilePage() {
  const { user, twin, saveTwin, setUser } = useStore();
  const toast = useToast();
  const [edit, setEdit] = useState(false);
  const [d, setD] = useState<Twin["profile"]>(twin.profile);
  const [pref, setPref] = useState(twin.preference);
  const [pw, setPw] = useState({ current: "", password: "" }); const [pwErr, setPwErr] = useState<string>(); const [pwBusy, setPwBusy] = useState(false);
  const save = async () => {
    await saveTwin({ ...twin, profile: d, preference: pref });
    if (d.name && d.name !== user.name) { await api("/api/manage", "POST", { action: "settings", name: d.name, settings: {} }); setUser({ name: d.name }); }
    setEdit(false); toast("Profile updated");
  };
  const changePw = async () => {
    setPwBusy(true); setPwErr(undefined);
    try { await api("/api/auth/password", "POST", pw); setPw({ current: "", password: "" }); toast("Password changed"); } catch (e) { setPwErr((e as Error).message); } finally { setPwBusy(false); }
  };
  const Row = ({ l, v }: { l: string; v: React.ReactNode }) => <div className="flex justify-between border-b border-line py-2.5 text-[13px] last:border-0"><span className="text-muted">{l}</span><span className="font-semibold">{v}</span></div>;
  return (
    <div>
      <PageHeader eyebrow="Account" title="Profile" />
      <Stagger className="grid gap-4 lg:grid-cols-3">
        <Item className="lg:col-span-3"><div className="card-solid flex flex-col gap-5 p-6 md:flex-row md:items-center">
          <Avatar name={user.name} size={72} tone="accent" />
          <div className="flex-1"><h2 className="text-[24px] font-bold">{user.name}</h2><div className="flex items-center gap-2 text-[13px] text-solidmuted">{user.email}{user.verified && <BadgeCheck className="h-4 w-4 text-accent" strokeWidth={1.6} />}</div></div>
          <div className="grid grid-cols-2 gap-6 text-[12.5px]"><div><div className="text-solidmuted">Currency</div><div className="font-bold">{twin.profile.currency}</div></div><div><div className="text-solidmuted">Member since</div><div className="font-bold">{fmtDate(user.createdAt)}</div></div></div>
          <Button variant="accent" icon={<Pencil className="h-4 w-4" />} onClick={() => { setD(twin.profile); setPref(twin.preference); setEdit(true); }}>Edit profile</Button>
        </div></Item>
        <Item><Card className="h-full"><CardHeader title="Personal information" /><Row l="Name" v={twin.profile.name || user.name} /><Row l="Age" v={twin.profile.age} /><Row l="Country" v={twin.profile.country} /><Row l="City" v={twin.profile.city} /></Card></Item>
        <Item><Card className="h-full"><CardHeader title="Financial preferences" /><Row l="Currency" v={twin.profile.currency} /><Row l="Planning style" v={PREFERENCE_ADJ[twin.preference].label} /><Row l="Default horizon" v={`${twin.assumptions.horizonYears} years`} /><Row l="Default paths" v={String(user.settings.defaultPaths ?? 600)} /></Card></Item>
        <Item><Card className="h-full"><CardHeader title="Account security" /><Row l="Email" v={user.email} /><Row l="Verification" v={user.verified ? <Badge tone="pos">Verified</Badge> : <Badge tone="warn">Unverified</Badge>} />
          <div className="mt-4 space-y-3"><Field label="Current password" error={pwErr}><TextInput type="password" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} autoComplete="current-password" /></Field><Field label="New password"><TextInput type="password" value={pw.password} onChange={(e) => setPw({ ...pw, password: e.target.value })} autoComplete="new-password" /></Field><Button size="sm" loading={pwBusy} disabled={!pw.current || pw.password.length < 8} onClick={changePw}>Change password</Button></div>
        </Card></Item>
      </Stagger>
      <Drawer open={edit} onClose={() => setEdit(false)} title="Edit profile" footer={<div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setEdit(false)}>Cancel</Button><Button onClick={save}>Save</Button></div>}>
        <div className="space-y-4">
          <Field label="Name"><TextInput value={d.name} onChange={(e) => setD({ ...d, name: e.target.value })} /></Field>
          <Field label="Age"><MoneyInput value={d.age} onChange={(v) => setD({ ...d, age: v })} currency="" suffix="yrs" /></Field>
          <div className="grid grid-cols-2 gap-3"><Field label="Country"><TextInput value={d.country} onChange={(e) => setD({ ...d, country: e.target.value })} /></Field><Field label="City"><TextInput value={d.city} onChange={(e) => setD({ ...d, city: e.target.value })} /></Field></div>
          <Field label="Currency"><Select value={d.currency} onChange={(v) => setD({ ...d, currency: v })} options={["EGP", "USD", "EUR", "GBP", "SAR", "AED"]} /></Field>
          <Field label="Planning style"><Select value={pref} onChange={(v) => setPref(v as Twin["preference"])} options={Object.entries(PREFERENCE_ADJ).map(([k, v]) => ({ value: k, label: v.label }))} /></Field>
        </div>
      </Drawer>
    </div>
  );
}
