import { requireUser } from "@/lib/server/auth";
import { db } from "@/lib/server/db";
import { TeamBoard } from "./TeamBoard";

export const metadata = { title: "Team" };

export default async function UsersPage() {
  const me = await requireUser("users.manage");
  const [users, activity] = await Promise.all([
    db.user.findMany({ orderBy: [{ isActive: "desc" }, { createdAt: "asc" }], include: { _count: { select: { sessions: true } } } }),
    db.activityLog.findMany({ orderBy: { createdAt: "desc" }, take: 60, include: { user: { select: { name: true } } } }),
  ]);
  return (
    <TeamBoard
      meId={me.id}
      users={users.map((u) => ({ id: u.id, name: u.name, email: u.email, role: u.role, isActive: u.isActive, lastLoginAt: u.lastLoginAt?.toISOString() ?? null, sessions: u._count.sessions }))}
      activity={activity.map((a) => ({ id: a.id, summary: a.summary, entity: a.entity, at: a.createdAt.toISOString() }))}
    />
  );
}
