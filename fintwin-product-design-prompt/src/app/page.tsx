import { Landing } from "@/components/landing";
import { currentUser } from "@/lib/server";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await currentUser().catch(() => null);
  return <Landing signedIn={!!user} />;
}
