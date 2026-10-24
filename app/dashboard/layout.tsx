import type { Metadata } from "next";
import { AdminShell, type NavItem, type PaletteItem } from "@/components/admin/shell";
import { can, requireUser } from "@/lib/server/auth";
import { db } from "@/lib/server/db";

export const metadata: Metadata = {
  title: { default: "Dashboard", template: "%s · StaySutra Dashboard" },
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();

  const [newEnquiries, brokenFeeds, properties, recent] = await Promise.all([
    db.enquiry.count({ where: { status: "NEW", deletedAt: null } }),
    db.calendarFeed.count({ where: { isActive: true, lastStatus: "ERROR" } }),
    db.property.findMany({ where: { deletedAt: null }, select: { id: true, name: true, city: true }, orderBy: { name: "asc" } }),
    can(user.role, "enquiry.manage")
      ? db.enquiry.findMany({
          where: { deletedAt: null },
          orderBy: { createdAt: "desc" },
          take: 25,
          select: { id: true, name: true, refCode: true, phone: true },
        })
      : [],
  ]);

  const nav: NavItem[] = [
    { href: "/dashboard", label: "Overview", icon: "overview", primary: true },
    { href: "/dashboard/properties", label: "Properties", icon: "properties", primary: true },
    { href: "/dashboard/calendar", label: "Calendar", icon: "calendar", primary: true, badge: brokenFeeds || undefined, alert: true },
    ...(can(user.role, "enquiry.manage")
      ? [{ href: "/dashboard/enquiries", label: "Enquiries", icon: "inbox", primary: true, badge: newEnquiries || undefined } satisfies NavItem]
      : []),
    { href: "/dashboard/media", label: "Media", icon: "media" },
    ...(can(user.role, "content.edit") ? [{ href: "/dashboard/content", label: "Website", icon: "content" } satisfies NavItem] : []),
    ...(can(user.role, "taxonomy.edit") ? [{ href: "/dashboard/destinations", label: "Destinations", icon: "map" } satisfies NavItem] : []),
    { href: "/dashboard/stories", label: "Stories", icon: "stories" },
    ...(can(user.role, "users.manage") ? [{ href: "/dashboard/users", label: "Team", icon: "users" } satisfies NavItem] : []),
  ];

  const palette: PaletteItem[] = [
    ...nav.map((n) => ({ label: n.label, href: n.href, icon: n.icon, group: "Go to" })),
    { label: "New property", href: "/dashboard/properties/new", icon: "plus", group: "Create" },
    { label: "Block dates", href: "/dashboard/calendar", icon: "calendar", group: "Create" },
    { label: "Write a story", href: "/dashboard/stories", icon: "stories", group: "Create" },
    ...properties.map((p) => ({ label: p.name, hint: p.city, href: `/dashboard/properties/${p.id}`, icon: "properties" as const, group: "Properties" })),
    ...recent.map((e) => ({ label: e.name, hint: `${e.refCode} · ${e.phone}`, href: `/dashboard/enquiries?open=${e.id}`, icon: "inbox" as const, group: "Enquiries" })),
  ];

  return (
    <AdminShell user={{ name: user.name, email: user.email, role: user.role }} nav={nav} palette={palette}>
      {children}
    </AdminShell>
  );
}
