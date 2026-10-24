import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Image from "next/image";
import { getUser } from "@/lib/server/auth";
import { hasDatabase } from "@/lib/server/db";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Sign in", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  if (hasDatabase() && (await getUser())) redirect("/dashboard");
  const { next } = await searchParams;

  return (
    <div className="relative grid min-h-svh lg:grid-cols-[1.1fr_1fr]">
      {/* The client's own photograph — the reason the dashboard exists. */}
      <div className="relative hidden overflow-hidden lg:block">
        <Image
          src="/media/kashele/pavilion-evening.jpg"
          alt=""
          fill
          priority
          sizes="55vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-ink-900 via-ink-900/30 to-ink-900/10" />
        <div className="absolute inset-x-12 bottom-12">
          <p className="font-mark text-[1.25rem] tracking-[0.06em] text-text-hi">
            STAY<span className="text-gold-500">SUTRA</span>
          </p>
          <p className="mt-3 max-w-[30ch] text-[1.0625rem] leading-relaxed text-text-mid">
            Everything on the website, the calendars and every enquiry — in one place.
          </p>
        </div>
      </div>

      <div className="admin-canvas flex items-center justify-center px-5 py-12">
        <div className="w-full max-w-[22rem]">
          <span className="grid size-11 place-items-center rounded-[13px] bg-gold-500 font-mark text-[1.125rem] font-semibold text-gold-ink lg:hidden">
            S
          </span>
          <h1 className="mt-6 font-display text-[1.75rem] leading-tight tracking-[-0.02em] text-text-hi lg:mt-0" style={{ fontWeight: 800 }}>
            Welcome back
          </h1>
          <p className="mt-2 text-[0.9375rem] text-text-low">Sign in to manage StaySutra.</p>
          {hasDatabase() ? (
            <LoginForm next={next ?? ""} />
          ) : (
            <p className="mt-8 rounded-[14px] bg-warn/10 p-4 text-[0.875rem] leading-relaxed text-[#f5c46a] ring-1 ring-inset ring-warn/25">
              The dashboard needs the database. Set DATABASE_URL and run the migrations — see docs/HANDOVER.md.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
