/**
 * Shared by the server (reading the cookies) and the client (writing them).
 * Kept out of theme.tsx: values exported from a "use client" module reach
 * server code as client references, not as the strings themselves.
 */
export type ThemeChoice = "system" | "light" | "dark";
export const THEME_COOKIE = "ss_theme";
export const SIDEBAR_COOKIE = "ss_sidebar";
