import Link from "next/link";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { WhatsAppFloat } from "@/components/site/WhatsAppFloat";
import { Icon } from "@/components/primitives/Icon";
import { SmoothScroll } from "@/components/motion/SmoothScroll";
import { JsonLd } from "@/components/site/JsonLd";
import { organizationSchema, websiteSchema } from "@/lib/seo";
import { getContent } from "@/lib/content";
import { waMessage } from "@/lib/site";

/**
 * Rendered per request. The data under it is cached and tagged (lib/content.ts),
 * so this costs a render, not a database round trip — and a publish from the
 * dashboard shows up on the very next page view instead of after a rebuild.
 */
export const dynamic = "force-dynamic";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const { site } = await getContent();
  const announcement = site.settings.announcement;

  return (
    <>
      <SmoothScroll />
      {announcement.enabled && announcement.text && (
        <AnnouncementBar text={announcement.text} href={announcement.href} />
      )}
      <Header />
      <main id="main">{children}</main>
      <Footer />
      <WhatsAppFloat message={waMessage.general()} source="global" scope="global" />
      {/* Film grain sits above everything and receives no pointer events. */}
      <div className="grain-fixed" aria-hidden />
      <JsonLd data={[organizationSchema(site.settings), websiteSchema()]} />
    </>
  );
}

/** Off by default; switched on from Dashboard → Content → Announcement. DPR §7.1 */
function AnnouncementBar({ text, href }: { text: string; href: string }) {
  const body = (
    <span className="inline-flex items-center gap-2">
      {text}
      {href && <Icon name="arrowRight" size={14} className="shrink-0" />}
    </span>
  );
  return (
    <div className="relative z-[60] bg-gold-500 text-center text-[0.8125rem] font-medium text-gold-ink">
      <div className="shell py-2">
        {href ? (
          <Link href={href} className="press-sm underline-offset-4 hover:underline">
            {body}
          </Link>
        ) : (
          body
        )}
      </div>
    </div>
  );
}
