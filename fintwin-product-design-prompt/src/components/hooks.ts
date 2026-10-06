"use client";
import { useEffect, useRef, useState } from "react";
import { type Goal, type ScenarioChanges, type SimResult, type Assumptions, emptyChanges } from "@/lib/model";
import { runSimulationAsync } from "@/lib/sim";
import { useStore } from "./store";

/** Reads URL query params after mount (avoids Suspense requirements for useSearchParams). */
export function useQuery() {
  const [q, setQ] = useState<URLSearchParams | null>(null);
  useEffect(() => { setQ(new URLSearchParams(window.location.search)); }, []);
  return q;
}

/** Runs a real (client-side) Monte Carlo simulation against the current Twin whenever inputs change. */
export function useSimulation(opts: { changes?: ScenarioChanges; paths?: number; horizonYears?: number; goal?: Goal | null; assumptions?: Assumptions; extraSavings?: number; debounce?: number; enabled?: boolean }) {
  const { twin, accounts } = useStore();
  const [result, setResult] = useState<SimResult | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const run = useRef(0);
  const key = JSON.stringify([opts.changes, opts.paths, opts.horizonYears, opts.goal?.id, opts.goal?.target, opts.goal?.targetDate, opts.goal?.current, opts.assumptions, opts.extraSavings, twin, accounts.map((a) => a.balance)]);
  useEffect(() => {
    if (opts.enabled === false) return;
    const id = ++run.current;
    setRunning(true);
    const t = setTimeout(async () => {
      try {
        const r = await runSimulationAsync({ twin, accounts, changes: opts.changes ?? emptyChanges(), paths: opts.paths ?? 300, horizonYears: opts.horizonYears ?? Math.min(twin.assumptions.horizonYears, 10), goal: opts.goal ?? null, assumptions: opts.assumptions, extraSavings: opts.extraSavings, seed: 11 });
        if (id === run.current) { setResult(r); setError(null); }
      } catch (e) { if (id === run.current) setError((e as Error).message); }
      finally { if (id === run.current) setRunning(false); }
    }, opts.debounce ?? 60);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, opts.enabled]);
  return { result, running, error };
}
