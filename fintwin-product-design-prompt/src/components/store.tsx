"use client";
import { createContext, type ReactNode, useCallback, useContext, useMemo, useState } from "react";
import type { Account, Goal, Notification, Report, Scenario, Simulation, Transaction, Twin, UserInfo } from "@/lib/model";
import { metrics } from "@/lib/model";

export type AppData = {
  user: UserInfo; twin: Twin; accounts: Account[]; transactions: Transaction[]; goals: Goal[];
  scenarios: Scenario[]; simulations: Simulation[]; reports: Report[]; notifications: Notification[];
};
type ResourceKey = "accounts" | "transactions" | "goals" | "scenarios" | "simulations" | "reports" | "notifications";

export async function api<T = unknown>(path: string, method = "GET", body?: unknown): Promise<T> {
  const res = await fetch(path, { method, headers: body !== undefined ? { "Content-Type": "application/json" } : undefined, body: body !== undefined ? JSON.stringify(body) : undefined });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || "Something went wrong. Please try again.");
  return json as T;
}

function useStoreValue(initial: AppData) {
  const [data, setData] = useState<AppData>(initial);
  const [fresh, setFresh] = useState<Set<string>>(new Set());
  const mark = (key: string) => { setFresh((s) => new Set(s).add(key)); setTimeout(() => setFresh((s) => { const n = new Set(s); n.delete(key); return n; }), 1400); };

  const create = useCallback(async <T,>(resource: ResourceKey, body: unknown): Promise<T[]> => {
    const r = await api<{ items: T[]; accounts?: Account[] }>(`/api/r/${resource}`, "POST", body);
    setData((d) => {
      const list = d[resource] as unknown as T[];
      const next = resource === "accounts" || resource === "goals" ? [...list, ...r.items] : [...r.items, ...list];
      const nd = { ...d, [resource]: next } as AppData;
      if (resource === "transactions") nd.transactions = [...nd.transactions].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : b.id - a.id));
      if (r.accounts) nd.accounts = r.accounts;
      return nd;
    });
    for (const it of r.items) mark(`${resource}:${(it as { id: number }).id}`);
    if (resource === "simulations" || resource === "goals" || resource === "transactions") refreshNotifications();
    return r.items;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const update = useCallback(async <T,>(resource: ResourceKey, id: number, patch: Partial<T>) => {
    setData((d) => ({ ...d, [resource]: (d[resource] as unknown as { id: number }[]).map((x) => (x.id === id ? { ...x, ...patch } : x)) }) as AppData);
    const r = await api<{ item: T; accounts?: Account[] }>(`/api/r/${resource}/${id}`, "PATCH", patch);
    setData((d) => ({ ...d, ...(r.accounts ? { accounts: r.accounts } : {}), [resource]: (d[resource] as unknown as { id: number }[]).map((x) => (x.id === id && r.item ? r.item : x)) }) as AppData);
    return r.item;
  }, []);

  const remove = useCallback(async (resource: ResourceKey, id: number) => {
    setData((d) => ({ ...d, [resource]: (d[resource] as unknown as { id: number }[]).filter((x) => x.id !== id) }) as AppData);
    const r = await api<{ accounts?: Account[] }>(`/api/r/${resource}/${id}`, "DELETE");
    if (r.accounts) setData((d) => ({ ...d, accounts: r.accounts! }));
  }, []);

  const saveTwin = useCallback(async (twin: Twin) => {
    setData((d) => ({ ...d, twin }));
    await api("/api/twin", "PUT", { twin });
  }, []);

  const refreshNotifications = useCallback(async () => {
    try { const r = await api<AppData>("/api/manage"); setData((d) => ({ ...d, notifications: r.notifications, scenarios: r.scenarios, goals: r.goals })); } catch { /* ignore */ }
  }, []);
  const reload = useCallback(async () => {
    const r = await api<AppData>("/api/manage");
    setData((d) => ({ ...d, ...r, user: d.user }));
  }, []);
  const setUser = useCallback((u: Partial<UserInfo>) => setData((d) => ({ ...d, user: { ...d.user, ...u } })), []);

  const m = useMemo(() => metrics(data.twin, data.accounts), [data.twin, data.accounts]);
  const currency = data.twin.profile.currency || "EGP";
  return { ...data, data, m, currency, create, update, remove, saveTwin, reload, refreshNotifications, setUser, fresh, setData };
}

type Store = ReturnType<typeof useStoreValue>;
const Ctx = createContext<Store | null>(null);
export function StoreProvider({ initial, children }: { initial: AppData; children: ReactNode }) {
  const v = useStoreValue(initial);
  return <Ctx.Provider value={v}>{children}</Ctx.Provider>;
}
export function useStore() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useStore outside provider");
  return v;
}
