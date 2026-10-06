import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { currentUser, loadAll } from "@/lib/server";
import { StoreProvider, type AppData } from "@/components/store";
import { AppShell } from "@/components/shell";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await currentUser();
  if (!user) redirect("/login");
  if (!user.onboarded) redirect("/onboarding");
  const data = await loadAll(user.id);
  const initial = {
    ...data,
    user: { id: user.id, name: user.name, email: user.email, verified: user.verified, createdAt: user.createdAt.toISOString(), settings: (user.settings ?? {}) as Record<string, unknown> },
  } as unknown as AppData;
  return (
    <StoreProvider initial={initial}>
      <AppShell>{children}</AppShell>
    </StoreProvider>
  );
}
