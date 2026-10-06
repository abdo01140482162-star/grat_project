"use client";
import { AnimatePresence, motion } from "framer-motion";
import { Info, X, AlertCircle, Check, Loader2 } from "lucide-react";
import Link from "next/link";
import { createContext, type ReactNode, useCallback, useContext, useEffect, useId, useState, type InputHTMLAttributes, type ButtonHTMLAttributes } from "react";
import { CountUp, EASE, SPRING, Tooltip } from "./motion";

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

/* ---------------- Logo ---------------- */
export function Logo({ size = 28, animated = false, label = true }: { size?: number; animated?: boolean; label?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden>
        <rect width="32" height="32" rx="10" fill="var(--btn)" />
        <motion.circle cx="12.5" cy="16" r="5.2" fill="none" stroke="var(--btn-fg)" strokeWidth="1.8"
          initial={animated ? { x: 3.5 } : false} animate={{ x: 0 }} transition={{ duration: 0.9, ease: EASE, delay: 0.15 }} />
        <motion.circle cx="19.5" cy="16" r="5.2" fill="var(--accent)" fillOpacity="0.95"
          initial={animated ? { x: -3.5, scale: 0.6 } : false} animate={{ x: 0, scale: 1 }} transition={{ duration: 0.9, ease: EASE, delay: 0.15 }} style={{ mixBlendMode: "normal" }} />
      </svg>
      {label && <span className="text-[17px] font-extrabold tracking-tight">FinTwin</span>}
    </span>
  );
}

/* ---------------- Buttons ---------------- */
type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "accent" | "ghost" | "danger"; size?: "sm" | "md" | "lg"; href?: string; loading?: boolean; icon?: ReactNode };
const btnBase = "group press inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-[background-color,color,transform,box-shadow,opacity] duration-200 ease-[cubic-bezier(.22,1,.36,1)] disabled:opacity-45 disabled:pointer-events-none whitespace-nowrap select-none";
const variants = {
  primary: "bg-btn text-btnfg hover:opacity-90 shadow-soft",
  secondary: "bg-card text-fg border border-line2 hover:bg-card2",
  accent: "bg-accent text-accentfg hover:brightness-[1.04] shadow-soft",
  ghost: "text-fg hover:bg-card2",
  danger: "bg-neg text-white hover:opacity-90",
};
const sizes = { sm: "h-8 px-3.5 text-[12.5px]", md: "h-10 px-5 text-[13px]", lg: "h-12 px-6 text-[14px]" };
export function Button({ variant = "primary", size = "md", href, loading, icon, className, children, ...rest }: BtnProps) {
  const cls = cx(btnBase, variants[variant], sizes[size], className);
  const inner = (<>{loading ? <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.8} /> : icon}{children}</>);
  if (href) return <Link href={href} className={cls}>{inner}</Link>;
  return <button className={cls} disabled={loading || rest.disabled} {...rest}>{inner}</button>;
}
export function IconButton({ label, children, className, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return <button aria-label={label} title={label} className={cx("press grid h-9 w-9 place-items-center rounded-full text-fg transition-colors hover:bg-card2", className)} {...rest}>{children}</button>;
}

/* ---------------- Pills / badges ---------------- */
export function Pill({ active, children, onClick, className, icon }: { active?: boolean; children: ReactNode; onClick?: () => void; className?: string; icon?: ReactNode }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={active}
      className={cx("press inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-[12.5px] font-semibold transition-colors duration-200",
        active ? "bg-btn text-btnfg" : "bg-card text-fg border border-line hover:bg-card2", className)}>
      {icon}{children}
    </button>
  );
}
export function Badge({ tone = "neutral", children, dot = true }: { tone?: "neutral" | "pos" | "warn" | "neg" | "accent" | "ink"; children: ReactNode; dot?: boolean }) {
  const t = {
    neutral: "bg-card2 text-muted", pos: "bg-pos/12 text-pos", warn: "bg-warn/15 text-warn", neg: "bg-neg/12 text-neg",
    accent: "bg-accentsoft text-fg", ink: "bg-btn text-btnfg",
  }[tone];
  const d = { neutral: "bg-faint", pos: "bg-pos", warn: "bg-warn", neg: "bg-neg", accent: "bg-accent", ink: "bg-accent" }[tone];
  return <span className={cx("inline-flex h-6 items-center gap-1.5 rounded-full px-2.5 text-[11px] font-semibold", t)}>{dot && <span className={cx("h-1.5 w-1.5 rounded-full", d)} />}{children}</span>;
}
export function Avatar({ name, size = 36, tone = "card" }: { name: string; size?: number; tone?: "card" | "accent" | "ink" }) {
  const initials = name.split(/\s+/).map((p) => p[0]).filter(Boolean).slice(0, 2).join("").toUpperCase() || "·";
  const t = { card: "bg-card2 text-fg border border-line", accent: "bg-accent text-accentfg", ink: "bg-btn text-btnfg" }[tone];
  return <span className={cx("inline-grid shrink-0 place-items-center rounded-full font-bold", t)} style={{ width: size, height: size, fontSize: size * 0.36 }}>{initials}</span>;
}
export function IconCircle({ children, tone = "card", size = 36 }: { children: ReactNode; tone?: "card" | "accent" | "ink" | "solid"; size?: number }) {
  const t = { card: "bg-card2 text-fg", accent: "bg-accent text-accentfg", ink: "bg-btn text-btnfg", solid: "bg-white/10 text-solidfg" }[tone];
  return <span className={cx("inline-grid shrink-0 place-items-center rounded-full", t)} style={{ width: size, height: size }}>{children}</span>;
}

/* ---------------- Segmented control with shared pill ---------------- */
export function Segmented<T extends string>({ options, value, onChange, size = "md", className }: { options: { value: T; label: ReactNode }[]; value: T; onChange: (v: T) => void; size?: "sm" | "md"; className?: string }) {
  const id = useId();
  return (
    <div role="tablist" className={cx("inline-flex max-w-full overflow-x-auto no-scrollbar rounded-full border border-line bg-card p-1", className)}>
      {options.map((o) => (
        <button key={o.value} role="tab" aria-selected={value === o.value} onClick={() => onChange(o.value)}
          className={cx("relative shrink-0 rounded-full font-semibold transition-colors", size === "sm" ? "h-7 px-3 text-[12px]" : "h-8 px-4 text-[12.5px]", value === o.value ? "text-btnfg" : "text-muted hover:text-fg")}>
          {value === o.value && <motion.span layoutId={`seg-${id}`} className="absolute inset-0 rounded-full bg-btn" transition={SPRING} />}
          <span className="relative z-10">{o.label}</span>
        </button>
      ))}
    </div>
  );
}

/* ---------------- Cards ---------------- */
export function Card({ children, className, solid, as = "div", ...rest }: { children: ReactNode; className?: string; solid?: boolean; as?: "div" | "section" | "article"; onClick?: () => void }) {
  const C = as;
  return <C className={cx(solid ? "card-solid" : "card", "p-5", className)} {...rest}>{children}</C>;
}
export function CardHeader({ title, sub, action, info }: { title: ReactNode; sub?: ReactNode; action?: ReactNode; info?: string }) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h3 className="flex items-center gap-1.5 text-[14.5px] font-bold tracking-tight">{title}{info && <InfoTip text={info} />}</h3>
        {sub && <p className="mt-0.5 text-[12px] text-muted">{sub}</p>}
      </div>
      {action}
    </div>
  );
}
export function InfoTip({ text }: { text: string }) {
  return <Tooltip content={text}><button type="button" aria-label={text} className="grid h-4 w-4 place-items-center rounded-full text-faint hover:text-fg"><Info className="h-3.5 w-3.5" strokeWidth={1.6} /></button></Tooltip>;
}

export function MetricCard({ label, value, format, delta, deltaTone, sub, solid, icon, info, className }: {
  label: string; value: number; format: (v: number) => string; delta?: string; deltaTone?: "pos" | "neg" | "warn" | "neutral"; sub?: string; solid?: boolean; icon?: ReactNode; info?: string; className?: string;
}) {
  return (
    <div className={cx(solid ? "card-solid" : "card", "lift flex flex-col justify-between gap-3 p-5", className)}>
      <div className="flex items-center justify-between">
        <span className={cx("flex items-center gap-1.5 text-[12.5px] font-semibold", solid ? "text-solidmuted" : "text-muted")}>{label}{info && <InfoTip text={info} />}</span>
        {icon}
      </div>
      <div>
        <div className="text-[28px] font-bold leading-none tracking-tight md:text-[30px]"><CountUp value={value} format={format} /></div>
        <div className="mt-2 flex items-center gap-2 text-[11.5px]">
          {delta && <span className={cx("rounded-full px-2 py-0.5 font-semibold", solid ? "bg-accent text-accentfg" : deltaTone === "neg" ? "bg-neg/12 text-neg" : deltaTone === "warn" ? "bg-warn/15 text-warn" : deltaTone === "neutral" ? "bg-card2 text-muted" : "bg-pos/12 text-pos")}>{delta}</span>}
          {sub && <span className={solid ? "text-solidmuted" : "text-muted"}>{sub}</span>}
        </div>
      </div>
    </div>
  );
}

export function PageHeader({ eyebrow, title, sub, actions }: { eyebrow?: string; title: ReactNode; sub?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div>
        {eyebrow && <div className="label mb-2">{eyebrow}</div>}
        <h1 className="text-[26px] font-bold leading-tight tracking-tight md:text-[30px]">{title}</h1>
        {sub && <p className="mt-1.5 max-w-2xl text-[13.5px] text-muted">{sub}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

/* ---------------- Inputs ---------------- */
export function Field({ label, hint, error, children, unit }: { label: string; hint?: ReactNode; error?: string; children: ReactNode; unit?: string }) {
  return (
    <label className="group block">
      <span className="mb-1.5 flex items-center justify-between text-[12.5px] font-semibold text-fg/80 transition-colors group-focus-within:text-fg">
        <span>{label}</span>{unit && <span className="label !text-[10px]">{unit}</span>}
      </span>
      {children}
      <AnimatePresence>
        {error ? <motion.span initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-1.5 flex items-center gap-1 text-[11.5px] text-neg"><AlertCircle className="h-3.5 w-3.5" strokeWidth={1.6} />{error}</motion.span>
          : hint ? <span className="mt-1.5 block text-[11.5px] text-muted">{hint}</span> : null}
      </AnimatePresence>
    </label>
  );
}
export const inputCls = "h-11 w-full rounded-2xl border border-line2 bg-card px-4 text-[14px] text-fg outline-none transition-[border-color,box-shadow] duration-200 placeholder:text-faint focus:border-accent focus:shadow-[0_0_0_4px_color-mix(in_srgb,var(--accent)_22%,transparent)]";
export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cx(inputCls, props.className)} />;
}
export function MoneyInput({ value, onChange, currency = "EGP", placeholder = "0", suffix, ...rest }: { value: number; onChange: (v: number) => void; currency?: string; placeholder?: string; suffix?: string; "aria-label"?: string }) {
  const [txt, setTxt] = useState(value ? value.toLocaleString("en-US") : "");
  useEffect(() => { const n = parseFloat(txt.replace(/,/g, "")) || 0; if (n !== value) setTxt(value ? value.toLocaleString("en-US") : ""); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  return (
    <div className="relative">
      {currency && <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[12px] font-semibold text-muted">{currency}</span>}
      <input inputMode="decimal" value={txt} placeholder={placeholder} aria-label={rest["aria-label"]}
        onChange={(e) => { const raw = e.target.value.replace(/[^\d.\-]/g, ""); const n = parseFloat(raw) || 0; setTxt(raw === "" ? "" : raw.includes(".") ? raw : n.toLocaleString("en-US")); onChange(n); }}
        className={cx(inputCls, "num", currency ? "pl-[52px]" : "", suffix ? "pr-14" : "")} />
      {suffix && <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[12px] font-semibold text-muted">{suffix}</span>}
    </div>
  );
}
export function Select({ value, onChange, options, className, ...rest }: { value: string; onChange: (v: string) => void; options: (string | { value: string; label: string })[]; className?: string; "aria-label"?: string }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} aria-label={rest["aria-label"]} className={cx(inputCls, "appearance-none bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2212%22 height=%2212%22 fill=%22none%22 stroke=%22%23888%22 stroke-width=%221.6%22><path d=%22M3 4.5l3 3 3-3%22/></svg>')] bg-[length:12px] bg-[right_14px_center] bg-no-repeat pr-9", className)}>
      {options.map((o) => typeof o === "string" ? <option key={o} value={o}>{o}</option> : <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}
export function Slider({ value, onChange, min, max, step = 1, label }: { value: number; onChange: (v: number) => void; min: number; max: number; step?: number; label: string }) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <input type="range" aria-label={label} min={min} max={max} step={step} value={value} onChange={(e) => onChange(parseFloat(e.target.value))}
      className="h-2 w-full cursor-pointer appearance-none rounded-full [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-[3px] [&::-webkit-slider-thumb]:border-[var(--card)] [&::-webkit-slider-thumb]:bg-[var(--btn)] [&::-webkit-slider-thumb]:shadow-md"
      style={{ background: `linear-gradient(90deg, var(--accent) ${pct}%, var(--line2) ${pct}%)` }} />
  );
}
export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)}
      className={cx("relative inline-flex h-6 w-11 shrink-0 items-center rounded-full p-0.5 transition-colors duration-200", checked ? "bg-btn" : "bg-line2")}>
      <motion.span layout transition={SPRING} className={cx("h-5 w-5 rounded-full shadow-sm", checked ? "ml-auto bg-accent" : "bg-card")} />
    </button>
  );
}
export function Checkbox({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: ReactNode }) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-2.5 text-[13px]">
      <button type="button" role="checkbox" aria-checked={checked} onClick={() => onChange(!checked)} className={cx("grid h-5 w-5 place-items-center rounded-md border transition-colors", checked ? "border-btn bg-btn" : "border-line2 bg-card")}>
        <svg viewBox="0 0 16 16" className="h-3.5 w-3.5"><motion.path d="M3.5 8.5l3 3 6-7" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" initial={false} animate={{ pathLength: checked ? 1 : 0 }} transition={{ duration: 0.25, ease: EASE }} /></svg>
      </button>
      {label}
    </label>
  );
}

/* ---------------- Drawer / Modal ---------------- */
function useEsc(open: boolean, onClose: () => void) {
  useEffect(() => { if (!open) return; const h = (e: KeyboardEvent) => e.key === "Escape" && onClose(); window.addEventListener("keydown", h); return () => window.removeEventListener("keydown", h); }, [open, onClose]);
}
export function Drawer({ open, onClose, title, children, width = 460, footer }: { open: boolean; onClose: () => void; title: ReactNode; children: ReactNode; width?: number; footer?: ReactNode }) {
  useEsc(open, onClose);
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[70]" role="dialog" aria-modal="true">
          <motion.div className="absolute inset-0 bg-black/25 backdrop-blur-[2px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
          <motion.aside initial={{ x: 30, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 30, opacity: 0 }} transition={{ duration: 0.32, ease: EASE }}
            className="absolute bottom-0 right-0 top-0 flex w-full flex-col border-l border-line bg-canvas shadow-lift max-md:top-auto max-md:max-h-[90vh] max-md:rounded-t-[28px] md:m-3 md:rounded-[26px] md:border" style={{ maxWidth: width }}>
            <div className="flex items-center justify-between px-6 pb-3 pt-5">
              <h2 className="text-[17px] font-bold tracking-tight">{title}</h2>
              <IconButton label="Close" onClick={onClose}><X className="h-4 w-4" strokeWidth={1.6} /></IconButton>
            </div>
            <div className="flex-1 overflow-y-auto px-6 pb-6">{children}</div>
            {footer && <div className="border-t border-line px-6 py-4">{footer}</div>}
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}
export function Modal({ open, onClose, title, children, footer, width = 440 }: { open: boolean; onClose: () => void; title: ReactNode; children: ReactNode; footer?: ReactNode; width?: number }) {
  useEsc(open, onClose);
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[80] grid place-items-center p-4" role="alertdialog" aria-modal="true">
          <motion.div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
          <motion.div initial={{ opacity: 0, y: 12, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, scale: 0.98 }} transition={{ duration: 0.28, ease: EASE }}
            className="relative w-full rounded-[26px] border border-line bg-canvas p-6 shadow-lift" style={{ maxWidth: width }}>
            <h2 className="mb-2 text-[18px] font-bold tracking-tight">{title}</h2>
            <div className="text-[13.5px] text-muted">{children}</div>
            {footer && <div className="mt-6 flex justify-end gap-2">{footer}</div>}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
export function ConfirmDialog({ open, onClose, onConfirm, title, body, confirmWord, confirmLabel = "Delete", loading }: { open: boolean; onClose: () => void; onConfirm: () => void; title: string; body: ReactNode; confirmWord?: string; confirmLabel?: string; loading?: boolean }) {
  const [typed, setTyped] = useState("");
  useEffect(() => { if (!open) setTyped(""); }, [open]);
  return (
    <Modal open={open} onClose={onClose} title={title} footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button variant="danger" loading={loading} disabled={!!confirmWord && typed !== confirmWord} onClick={onConfirm}>{confirmLabel}</Button></>}>
      <div className="space-y-4">
        <div>{body}</div>
        {confirmWord && <Field label={`Type "${confirmWord}" to confirm`}><TextInput value={typed} onChange={(e) => setTyped(e.target.value)} autoFocus /></Field>}
      </div>
    </Modal>
  );
}

/* ---------------- Toasts ---------------- */
type ToastT = { id: number; text: string; action?: { label: string; onClick: () => void } };
const ToastCtx = createContext<(text: string, action?: ToastT["action"]) => void>(() => {});
export const useToast = () => useContext(ToastCtx);
export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastT[]>([]);
  const push = useCallback((text: string, action?: ToastT["action"]) => {
    const id = Date.now() + Math.random();
    setItems((s) => [...s.slice(-2), { id, text, action }]);
    setTimeout(() => setItems((s) => s.filter((t) => t.id !== id)), 4200);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed bottom-24 left-4 z-[90] flex flex-col gap-2 md:bottom-6 md:left-6" aria-live="polite">
        <AnimatePresence>
          {items.map((t) => (
            <motion.div key={t.id} layout initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20, transition: { duration: 0.2 } }} transition={{ duration: 0.32, ease: EASE }}
              className="pointer-events-auto flex items-center gap-3 rounded-full bg-[#151310] py-2.5 pl-4 pr-2.5 text-[13px] font-medium text-[#F9F7EF] shadow-lift">
              <span className="h-2 w-2 rounded-full bg-[#F3C142]" />
              <span className="pr-1">{t.text}</span>
              {t.action && <button onClick={t.action.onClick} className="rounded-full bg-white/10 px-3 py-1 text-[12px] font-semibold hover:bg-white/20">{t.action.label}</button>}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastCtx.Provider>
  );
}

/* ---------------- States ---------------- */
export function EmptyState({ icon, title, body, action }: { icon: ReactNode; title: string; body?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
      <div className="relative mb-4"><div className="hatch absolute -inset-3 rounded-full opacity-60" /><IconCircle size={52} tone="card">{icon}</IconCircle></div>
      <h3 className="text-[15px] font-bold tracking-tight">{title}</h3>
      {body && <p className="mt-1 max-w-sm text-[13px] text-muted">{body}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
export function ErrorState({ title, what, why, next, actions }: { title: string; what?: string; why?: string; next?: string; actions?: ReactNode }) {
  return (
    <div className="rounded-[22px] border border-neg/25 bg-neg/5 p-5">
      <div className="flex items-start gap-3">
        <IconCircle size={34}><AlertCircle className="h-4 w-4 text-neg" strokeWidth={1.6} /></IconCircle>
        <div className="flex-1 text-[13px]">
          <h3 className="text-[14.5px] font-bold">{title}</h3>
          {what && <p className="mt-1 text-muted"><b className="text-fg">What happened:</b> {what}</p>}
          {why && <p className="mt-0.5 text-muted"><b className="text-fg">Why:</b> {why}</p>}
          {next && <p className="mt-0.5 text-muted"><b className="text-fg">What to do:</b> {next}</p>}
          {actions && <div className="mt-3 flex gap-2">{actions}</div>}
        </div>
      </div>
    </div>
  );
}
export function Skel({ className }: { className?: string }) { return <div className={cx("shimmer rounded-xl", className)} />; }
export function KpiSkeleton() { return <div className="card space-y-4 p-5"><Skel className="h-3 w-24" /><Skel className="h-8 w-36" /><Skel className="h-3 w-20" /></div>; }
export function ChartSkeleton({ h = 260 }: { h?: number }) {
  return <div className="card p-5"><Skel className="mb-5 h-3 w-40" /><div className="flex items-end gap-2" style={{ height: h }}>{Array.from({ length: 16 }, (_, i) => <Skel key={i} className="flex-1" />)}</div></div>;
}
export function RowsSkeleton({ rows = 6 }: { rows?: number }) {
  return <div className="card divide-y divide-[var(--line)] p-2">{Array.from({ length: rows }, (_, i) => <div key={i} className="flex items-center gap-3 p-3"><Skel className="h-9 w-9 !rounded-full" /><div className="flex-1 space-y-2"><Skel className="h-3 w-1/3" /><Skel className="h-2.5 w-1/5" /></div><Skel className="h-3 w-20" /></div>)}</div>;
}
export function Done({ text }: { text: string }) {
  return <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-pos"><Check className="h-3.5 w-3.5" strokeWidth={2} />{text}</span>;
}
