import type { Metadata } from "next";
import { SetPasswordForm } from "./SetPasswordForm";

export const metadata: Metadata = { title: "Set your password", robots: { index: false, follow: false } };

export default async function SetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return (
    <div className="admin-canvas flex min-h-svh items-center justify-center px-5 py-12">
      <div className="w-full max-w-[22rem]">
        <span className="grid size-11 place-items-center rounded-[13px] bg-gold-500 font-mark text-[1.125rem] font-semibold text-gold-ink">S</span>
        <h1 className="mt-6 font-display text-[1.75rem] leading-tight tracking-[-0.02em] text-text-hi" style={{ fontWeight: 800 }}>Set your password</h1>
        <p className="mt-2 text-[0.9375rem] text-text-low">Then you’re straight into the StaySutra dashboard.</p>
        <SetPasswordForm token={token ?? ""} />
      </div>
    </div>
  );
}
