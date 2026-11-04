"use client";

import { createContext, useContext, useMemo, useState } from "react";

/**
 * The page tells the top bar its title; the top bar shows it, small, once
 * the large title has scrolled away — the iOS navigation-bar handoff.
 */
interface TopbarCtx {
  title: string | null;
  collapsed: boolean;
  setTitle: (t: string | null) => void;
  setCollapsed: (c: boolean) => void;
}

const Ctx = createContext<TopbarCtx>({ title: null, collapsed: false, setTitle: () => {}, setCollapsed: () => {} });
export const useTopbar = () => useContext(Ctx);

export function TopbarProvider({ children }: { children: React.ReactNode }) {
  const [title, setTitle] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const value = useMemo(() => ({ title, collapsed, setTitle, setCollapsed }), [title, collapsed]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
