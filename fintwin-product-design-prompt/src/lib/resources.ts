import { accounts, goals, reports, scenarios, simulations, transactions, notifications } from "@/db/schema";
import { db } from "@/db";

/* eslint-disable @typescript-eslint/no-explicit-any */
export const TABLES: Record<string, any> = { accounts, transactions, goals, scenarios, simulations, reports, notifications };
export const anyDb = db as any;
const FIELDS: Record<string, string[]> = {
  accounts: ["name", "type", "balance", "currency"],
  transactions: ["accountId", "description", "category", "kind", "amount", "date"],
  goals: ["name", "kind", "target", "current", "monthly", "targetDate", "probability", "accountId"],
  scenarios: ["name", "category", "description", "changes"],
  simulations: ["scenarioId", "scenarioName", "goalId", "horizonYears", "paths", "status", "result"],
  reports: ["title", "type", "config"],
  notifications: ["read"],
};
export function pick(resource: string, body: Record<string, unknown>): Record<string, any> {
  const out: Record<string, any> = {};
  for (const f of FIELDS[resource] ?? []) if (body[f] !== undefined) out[f] = body[f];
  return out;
}
