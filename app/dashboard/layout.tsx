import type { Metadata, Viewport } from "next";
import { AdminShell, type NavItem, type PaletteItem } from "@/components/admin/shell";
import { ThemeRoot } from "@/components/admin/theme";
import { dashboardPrefs } from "@/components/admin/theme-server";
import { can, requireUser } from "@/lib/server/auth";
import { db } from "@/lib/server/db";

export const metadata: Metadata = {
  title: { default: "Dashboard", template: "%s · StaySutra Dashboard" },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  colorScheme: "light dark",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f5f7" },
    { media: "(prefers-color-scheme: dark)", color: "#0e0e10" },
  ],
};

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const prefs = await dashboardPrefs();

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
    ...(can(user.role, "analytics.view") ? [{ href: "/dashboard/analytics", label: "Analytics", icon: "chart" } satisfies NavItem] : []),
    { href: "/dashboard/calendar", label: "Calendar", icon: "calendar", primary: true, badge: brokenFeeds || undefined, alert: true, group: "Bookings" },
    ...(can(user.role, "enquiry.manage")
      ? [{ href: "/dashboard/enquiries", label: "Enquiries", icon: "inbox", primary: true, badge: newEnquiries || undefined, group: "Bookings" } satisfies NavItem]
      : []),
    { href: "/dashboard/properties", label: "Properties", icon: "properties", primary: true, group: "Listings" },
    { href: "/dashboard/media", label: "Media", icon: "media", group: "Listings" },
    ...(can(user.role, "content.edit") ? [{ href: "/dashboard/content", label: "Site content", icon: "content", group: "Website" } satisfies NavItem] : []),
    ...(can(user.role, "taxonomy.edit") ? [{ href: "/dashboard/destinations", label: "Destinations", icon: "map", group: "Website" } satisfies NavItem] : []),
    { href: "/dashboard/stories", label: "Stories", icon: "stories", group: "Website" },
    ...(can(user.role, "users.manage") ? [{ href: "/dashboard/users", label: "Team", icon: "users", group: "Admin" } satisfies NavItem] : []),
  ];

  const palette: PaletteItem[] = [
    ...nav.map((n) => ({ label: n.label, href: n.href, icon: n.icon, group: "Go to" })),
    ...(can(user.role, "property.edit") ? [{ label: "New property", href: "/dashboard/properties?new=1", icon: "plus" as const, group: "Create" }] : []),
    ...(can(user.role, "calendar.edit") ? [{ label: "Block dates", href: "/dashboard/calendar", icon: "calendar" as const, group: "Create" }] : []),
    ...(can(user.role, "media.edit") ? [{ label: "Upload photos", href: "/dashboard/media", icon: "imagePlus" as const, group: "Create" }] : []),
    ...properties.map((p) => ({ label: p.name, hint: p.city, href: `/dashboard/properties/${p.id}`, icon: "properties" as const, group: "Properties" })),
    ...recent.map((e) => ({ label: e.name, hint: `${e.refCode} · ${e.phone}`, href: `/dashboard/enquiries?open=${e.id}`, icon: "inbox" as const, group: "Enquiries" })),
  ];

  return (
    <ThemeRoot initial={prefs.theme}>
      <AdminShell
        user={{ name: user.name, email: user.email, role: user.role }}
        nav={nav}
        palette={palette}
        initialCollapsed={prefs.collapsed}
        perms={{
          property: can(user.role, "property.edit"),
          story: can(user.role, "story.edit"),
          media: can(user.role, "media.edit"),
          calendar: can(user.role, "calendar.edit"),
        }}
      >
        {children}
      </AdminShell>
    </ThemeRoot>
  );
}
