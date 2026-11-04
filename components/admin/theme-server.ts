import { cookies } from "next/headers";
import { SIDEBAR_COOKIE, THEME_COOKIE, type ThemeChoice } from "./theme-keys";

/** The appearance and sidebar state this browser chose, read before the first paint. */
export async function dashboardPrefs(): Promise<{ theme: ThemeChoice; collapsed: boolean }> {
  const jar = await cookies();
  const t = jar.get(THEME_COOKIE)?.value;
  return {
    theme: t === "light" || t === "dark" ? t : "system",
    collapsed: jar.get(SIDEBAR_COOKIE)?.value === "1",
  };
}
