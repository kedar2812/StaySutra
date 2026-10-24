import { NextResponse } from "next/server";
import { getContent } from "@/lib/content";
import { WHATSAPP_NUMBER, waMeUrl } from "@/lib/site";

export const runtime = "nodejs";

/**
 * Every "message us" link on the site lands here and leaves for wa.me with the
 * number currently set in the dashboard. See lib/site.ts → whatsappLink.
 */
export async function GET(request: Request) {
  const text = new URL(request.url).searchParams.get("text")?.slice(0, 1500) ?? "";
  const { site } = await getContent();
  const number = site.settings.whatsappNumber || WHATSAPP_NUMBER;
  return NextResponse.redirect(waMeUrl(number, text), 302);
}
