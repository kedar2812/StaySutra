import type { Metadata } from "next";
import { ThemeRoot } from "@/components/admin/theme";
import { dashboardPrefs } from "@/components/admin/theme-server";
import { BrandMark } from "@/components/admin/brand";
import { SetPasswordForm } from "./SetPasswordForm";

export const metadata: Metadata = { title: "Set your password", robots: { index: false, follow: false } };

export default async function SetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  const { theme } = await dashboardPrefs();
  return (
    <ThemeRoot initial={theme} className="flex min-h-svh items-center justify-center bg-pane px-5 py-12">
      <div className="w-full max-w-[22rem]">
        <BrandMark size={48} />
        <h1 className="mt-7 text-large text-fg">Set your password</h1>
        <p className="mt-1.5 text-body text-fg-3">Then you’re straight into the StaySutra dashboard.</p>
        <SetPasswordForm token={token ?? ""} />
      </div>
    </ThemeRoot>
  );
}
