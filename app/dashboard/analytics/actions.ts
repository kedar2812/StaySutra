"use server";

import { authorize } from "@/lib/server/auth";
import { liveNow } from "./data";

/** Polled by the "right now" badge on Dashboard → Analytics. */
export async function liveVisitors() {
  await authorize("analytics.view");
  return liveNow();
}
