import { SideNav } from "@/components/shared/SideNav";
import { ClientAuthGate } from "@/components/auth/ClientAuthGate";
import { LocalModeBanner } from "@/components/auth/LocalModeBanner";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { isLikelyProductionHost } from "@/lib/hostKind";

export default async function AppShellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const prodLike = await isLikelyProductionHost();
  const cloudConfigured = isSupabaseConfigured();
  const blockOpenPlannerWithoutCloud = prodLike && !cloudConfigured;

  return (
    <ClientAuthGate blockOpenPlannerWithoutCloud={blockOpenPlannerWithoutCloud}>
      <>
        <SideNav />
        <main className="min-h-screen bg-muted/30 pl-[240px] transition-[padding] max-xl:pl-[72px] max-md:pb-16 max-md:pl-0">
          <div className="mx-auto max-w-6xl p-4 md:p-6">
            <LocalModeBanner />
            {children}
          </div>
        </main>
      </>
    </ClientAuthGate>
  );
}
