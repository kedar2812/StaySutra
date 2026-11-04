/**
 * Every screen arrives the same way: its top-level blocks rise into place in
 * order (`.d-page` in app/admin.css). A skeleton, when there is one, only
 * fades — so a page that replaces its skeleton never jumps twice.
 *
 * CSS rather than a motion component: no transform is left on an ancestor,
 * so anything `position: fixed` inside a page stays pinned to the viewport.
 */
export default function DashboardTemplate({ children }: { children: React.ReactNode }) {
  return <div className="d-page">{children}</div>;
}
