import { SideNav } from "@/components/shared/SideNav";
import { FirstAdminBanner } from "@/components/admin/FirstAdminBanner";
import { ClientAuthGate } from "@/components/auth/ClientAuthGate";
import { LocalModeBanner } from "@/components/auth/LocalModeBanner";

export default function AppShellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClientAuthGate>
      <>
        <SideNav />
        <main className="min-h-screen bg-muted/30 pl-[240px] transition-[padding] max-xl:pl-[72px] max-md:pb-16 max-md:pl-0">
          <div className="mx-auto max-w-6xl p-4 md:p-6">
            <LocalModeBanner />
            <FirstAdminBanner />
            {children}
          </div>
        </main>
      </>
    </ClientAuthGate>
  );
}
