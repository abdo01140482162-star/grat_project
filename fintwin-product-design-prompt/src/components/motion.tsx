"use client";
import { AnimatePresence, motion, useInView, useReducedMotion, type Variants } from "framer-motion";
import { type ReactNode, useEffect, useRef, useState } from "react";

export const EASE = [0.22, 1, 0.36, 1] as const;
export const SPRING = { type: "spring" as const, stiffness: 400, damping: 32 };

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

/** Count-up number. Animates on first view and on meaningful value changes. */
export function CountUp({ value, format = (v) => Math.round(v).toLocaleString("en-US"), duration = 1100, className = "", from }: {
  value: number; format?: (v: number) => string; duration?: number; className?: string; from?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-20px" });
  const reduced = useReducedMotion();
  const [display, setDisplay] = useState(from ?? 0);
  const prev = useRef(from ?? 0);
  useEffect(() => {
    if (!inView) return;
    if (reduced) { setDisplay(value); prev.current = value; return; }
    const start = prev.current, delta = value - start;
    if (delta === 0) { setDisplay(value); return; }
    const t0 = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - t0) / duration);
      setDisplay(start + delta * easeOutCubic(t));
      if (t < 1) raf = requestAnimationFrame(tick); else prev.current = value;
    };
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); prev.current = value; };
  }, [value, inView, duration, reduced]);
  return <span ref={ref} className={`num ${className}`}>{format(display)}</span>;
}

const itemV: Variants = {
  hidden: { opacity: 0, y: 12, scale: 0.98 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.45, ease: EASE } },
};

/** Staggered reveal container. */
export function Stagger({ children, gap = 0.07, delay = 0, className = "", as = "div" }: { children: ReactNode; gap?: number; delay?: number; className?: string; as?: "div" | "ul" | "section" }) {
  const reduced = useReducedMotion();
  const C = as === "ul" ? motion.ul : as === "section" ? motion.section : motion.div;
  return (
    <C className={className} initial="hidden" animate="show" variants={{ hidden: {}, show: { transition: { staggerChildren: reduced ? 0.01 : gap, delayChildren: delay } } }}>
      {children}
    </C>
  );
}
export function Item({ children, className = "", as = "div", ...rest }: { children: ReactNode; className?: string; as?: "div" | "li"; onClick?: () => void }) {
  const C = as === "li" ? motion.li : motion.div;
  return <C variants={itemV} className={className} {...rest}>{children}</C>;
}

/** Reveal when scrolled into view. */
export function InView({ children, className = "", delay = 0, y = 16 }: { children: ReactNode; className?: string; delay?: number; y?: number }) {
  return (
    <motion.div className={className} initial={{ opacity: 0, y }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-60px" }} transition={{ duration: 0.6, ease: EASE, delay }}>
      {children}
    </motion.div>
  );
}

/** Soft warm dissolve page transition. */
export function PageTransition({ children, id }: { children: ReactNode; id: string }) {
  const reduced = useReducedMotion();
  return (
    <motion.div key={id} initial={reduced ? { opacity: 0 } : { opacity: 0, y: 14, filter: "blur(4px)" }} animate={{ opacity: 1, y: 0, filter: "blur(0px)" }} transition={{ duration: 0.34, ease: EASE }}>
      {children}
    </motion.div>
  );
}

/** Animated progress pill. */
export function ProgressPill({ value, className = "", tone = "accent", height = 8, marker }: { value: number; className?: string; tone?: "accent" | "ink" | "pos" | "warn" | "neg"; height?: number; marker?: number }) {
  const bg = { accent: "bg-accent", ink: "bg-fg", pos: "bg-pos", warn: "bg-warn", neg: "bg-neg" }[tone];
  const v = Math.max(0, Math.min(1, value));
  return (
    <div className={`relative w-full overflow-hidden rounded-full bg-line2/60 ${className}`} style={{ height, background: "var(--line)" }} role="progressbar" aria-valuenow={Math.round(v * 100)} aria-valuemin={0} aria-valuemax={100}>
      <motion.div className={`h-full rounded-full ${bg}`} initial={{ width: 0 }} animate={{ width: `${v * 100}%` }} transition={{ duration: 0.7, ease: EASE }} />
      {marker !== undefined && (
        <motion.div className="absolute top-0 h-full w-[2px] bg-fg" initial={{ left: "0%", opacity: 0 }} animate={{ left: `${Math.min(100, marker * 100)}%`, opacity: 1 }} transition={{ duration: 0.8, ease: EASE, delay: 0.2 }} />
      )}
    </div>
  );
}

/** SVG circular progress (stroke-dashoffset). */
export function CircularProgress({ value, size = 64, stroke = 6, children, tone = "var(--accent)", track = "var(--line2)" }: { value: number; size?: number; stroke?: number; children?: ReactNode; tone?: string; track?: string }) {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(1, value));
  return (
    <div className="relative inline-grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} stroke={track} strokeWidth={stroke} fill="none" />
        <motion.circle cx={size / 2} cy={size / 2} r={r} stroke={tone} strokeWidth={stroke} fill="none" strokeLinecap="round" strokeDasharray={c}
          initial={{ strokeDashoffset: c }} animate={{ strokeDashoffset: c * (1 - v) }} transition={{ duration: 0.9, ease: EASE }} />
      </svg>
      <div className="absolute inset-0 grid place-items-center">{children}</div>
    </div>
  );
}

/** Slow cinematic camera movement for showcase/marketing scenes only. */
export function KenBurns({ children, active = true, scale = 1.12, x = 0, y = 0, duration = 3.6, className = "" }: { children: ReactNode; active?: boolean; scale?: number; x?: number; y?: number; duration?: number; className?: string }) {
  const reduced = useReducedMotion();
  return (
    <motion.div className={className} animate={active && !reduced ? { scale, x, y } : { scale: 1, x: 0, y: 0 }} transition={{ duration, ease: [0.45, 0, 0.2, 1] }} style={{ transformOrigin: "center" }}>
      {children}
    </motion.div>
  );
}

/** Small dark tooltip with amber highlight. */
export function Tooltip({ children, content, side = "top" }: { children: ReactNode; content: ReactNode; side?: "top" | "bottom" }) {
  const [open, setOpen] = useState(false);
  return (
    <span className="relative inline-flex" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)} onFocus={() => setOpen(true)} onBlur={() => setOpen(false)}>
      {children}
      <AnimatePresence>
        {open && (
          <motion.span role="tooltip" initial={{ opacity: 0, y: side === "top" ? 4 : -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: side === "top" ? 4 : -4 }} transition={{ duration: 0.2, ease: EASE }}
            className={`pointer-events-none absolute left-1/2 z-50 w-max max-w-[240px] -translate-x-1/2 rounded-2xl bg-[#151310] px-3 py-2 text-[11.5px] font-medium leading-snug text-[#F9F7EF] shadow-lift ${side === "top" ? "bottom-full mb-2" : "top-full mt-2"}`}>
            {content}
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  );
}

export function Collapse({ open, children }: { open: boolean; children: ReactNode }) {
  return (
    <AnimatePresence initial={false}>
      {open && (
        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.32, ease: EASE }} className="overflow-hidden">
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
