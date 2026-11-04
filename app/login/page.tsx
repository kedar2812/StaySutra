import type { Metadata, Viewport } from "next";
import { redirect } from "next/navigation";
import Image from "next/image";
import { getUser } from "@/lib/server/auth";
import { hasDatabase } from "@/lib/server/db";
import { ThemeRoot } from "@/components/admin/theme";
import { dashboardPrefs } from "@/components/admin/theme-server";
import { BrandMark } from "@/components/admin/brand";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Sign in", robots: { index: false, follow: false } };
export const viewport: Viewport = {
  colorScheme: "light dark",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f5f7" },
    { media: "(prefers-color-scheme: dark)", color: "#0e0e10" },
  ],
};
export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  if (hasDatabase() && (await getUser())) redirect("/dashboard");
  const { next } = await searchParams;
  const { theme } = await dashboardPrefs();

  return (
    <ThemeRoot initial={theme} className="relative grid min-h-svh bg-pane lg:grid-cols-[1.15fr_1fr] lg:bg-desk lg:p-2.5">
      {/* The client's own photograph — the reason the dashboard exists. */}
      <div className="relative hidden overflow-hidden rounded-[24px] lg:block">
        <Image src="/media/kashele/pavilion-evening.jpg" alt="" fill priority sizes="55vw" className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-black/5" />
        <div className="absolute inset-x-12 bottom-12 text-white">
          <BrandMark size={44} />
          <p className="mt-6 max-w-[22ch] text-[2rem] font-bold leading-[1.1] tracking-[-0.025em]">Every stay, every calendar, every enquiry.</p>
          <p className="mt-3 max-w-[38ch] text-body leading-relaxed text-white/75">The website, the bookings from every platform and the guests who ask — in one place.</p>
        </div>
      </div>

      <div className="flex items-center justify-center px-5 py-12">
        <div className="w-full max-w-[22rem]">
          <div className="lg:hidden">
            <BrandMark size={48} />
          </div>
          <h1 className="mt-7 text-large text-fg lg:mt-0">Welcome back</h1>
          <p className="mt-1.5 text-body text-fg-3">Sign in to the StaySutra dashboard.</p>
          {hasDatabase() ? (
            <LoginForm next={next ?? ""} />
          ) : (
            <p className="mt-8 rounded-[16px] bg-caution/12 p-4 text-callout leading-relaxed text-caution-text">
              The dashboard needs the database. Set DATABASE_URL and run the migrations — see docs/HANDOVER.md.
            </p>
          )}
        </div>
      </div>
    </ThemeRoot>
  );
}
