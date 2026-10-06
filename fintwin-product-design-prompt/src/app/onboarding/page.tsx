import { redirect } from "next/navigation";
import { currentUser } from "@/lib/server";
import { Onboarding } from "@/components/onboarding";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const user = await currentUser();
  if (!user) redirect("/signup");
  if (user.onboarded) redirect("/app");
  return <Onboarding userName={user.name} />;
}
