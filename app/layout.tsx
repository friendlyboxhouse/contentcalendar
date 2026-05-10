import type { Metadata } from "next";
import { Inter, Noto_Sans_Thai } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import {
  getSupabaseAnonKey,
  getSupabaseUrl,
  type SupabasePublicEnv,
} from "@/lib/supabase/config";

/** ให้ layout อ่าน env ตอนคำขอจริง (รองรับ Hostinger ที่ใส่ตัวแปรตอนรัน) */
export const dynamic = "force-dynamic";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const notoSansThai = Noto_Sans_Thai({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin", "thai"],
  variable: "--font-noto-thai",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Content Planner — DINKR",
  description:
    "เครื่องมือวางแผนคอนเทนต์ภายในองค์กร — เฉพาะผู้ใช้ในรายการอีเมลที่อนุญาต",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabasePublic: SupabasePublicEnv = {
    url: getSupabaseUrl() ?? "",
    anon: getSupabaseAnonKey() ?? "",
  };

  return (
    <html lang="th" suppressHydrationWarning>
      <head />
      <body
        className={`${inter.variable} ${notoSansThai.variable} font-sans antialiased`}
      >
        <Providers supabasePublic={supabasePublic}>{children}</Providers>
      </body>
    </html>
  );
}
