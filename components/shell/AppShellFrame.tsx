import { SideNav } from "@/components/shared/SideNav";
import { LocalModeBanner } from "@/components/auth/LocalModeBanner";
import { KeyboardShortcutsHint } from "@/components/shared/KeyboardShortcutsHint";
import { AppTopbar } from "@/components/shell/AppTopbar";

/**
 * โครงหลักของแอปหลังเข้าสู่ระบบ — รวมจุดเดียวเพื่อ UX/a11y (skip link, landmark เดียว)
 */
export function AppShellFrame({ children }: { children: React.ReactNode }) {
  return (
    <>
      <a
        href="#main-content"
        className="fixed left-4 top-4 z-[100] -translate-y-[180%] rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-lg outline-none transition-transform duration-200 focus-visible:translate-y-0 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        ข้ามไปยังเนื้อหาหลัก
      </a>
      <div className="min-h-screen bg-muted/30 md:grid md:grid-cols-[240px_minmax(0,1fr)] xl:grid-cols-[240px_minmax(0,1fr)]">
        <SideNav />
        <div className="min-w-0 transition-[padding] max-md:pb-16 motion-reduce:transition-none">
          <AppTopbar />
          <main id="main-content" tabIndex={-1}>
            <div className="mx-auto max-w-6xl space-y-4 p-4 md:p-6">
              <LocalModeBanner />
              {children}
            </div>
          </main>
        </div>
      </div>
      <KeyboardShortcutsHint />
    </>
  );
}
