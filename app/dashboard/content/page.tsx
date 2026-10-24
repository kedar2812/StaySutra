import { requireUser } from "@/lib/server/auth";
import { db } from "@/lib/server/db";
import { getContent } from "@/lib/content";
import { getAt, IMAGE_SLOTS, SECTIONS } from "@/lib/cms/sections";
import { mediaUrl } from "@/lib/media";
import { ContentEditor } from "./ContentEditor";

export const metadata = { title: "Website" };

export default async function ContentPage() {
  await requireUser("content.edit");
  const [{ site }, edited, slotRow] = await Promise.all([
    getContent(),
    db.siteSection.findMany({ select: { key: true, updatedAt: true } }),
    db.siteSetting.findUnique({ where: { key: "imageSlots" } }),
  ]);
  const slotIds = (slotRow?.value as Record<string, string>) ?? {};
  const media = await db.media.findMany({ where: { id: { in: Object.values(slotIds) } } });
  const byId = new Map(media.map((m) => [m.id, m]));

  return (
    <ContentEditor
      sections={SECTIONS.map((s) => ({
        def: s,
        values: getAt(site, s.key) as Record<string, unknown>,
        editedAt: edited.find((e) => e.key === s.key)?.updatedAt.toISOString() ?? null,
      }))}
      slots={IMAGE_SLOTS.map((s) => {
        const m = slotIds[s.key] ? byId.get(slotIds[s.key]!) : undefined;
        return { ...s, media: m ? { id: m.id, src: mediaUrl(m.storageKey), alt: m.alt } : null };
      })}
      settings={{
        whatsappNumber: site.settings.whatsappNumber,
        phone: site.settings.phone,
        email: site.settings.email,
        instagram: site.settings.instagram,
        instagramHandle: site.settings.instagramHandle,
        officeLocality: site.settings.officeLocality,
        responseTime: site.settings.responseTime,
        announcement: site.settings.announcement,
        cancellation: site.settings.policies.cancellation,
      }}
    />
  );
}
