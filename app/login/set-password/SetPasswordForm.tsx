"use client";

import { useActionState, useState } from "react";
import { Button, Field, Input, Meter } from "@/components/admin/ui";
import { AdminIcon } from "@/components/admin/icons";
import { setPassword, type SetState } from "./actions";

/** A password with a live sense of its strength, and a check that the two copies match. */
export function SetPasswordForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState<SetState, FormData>(setPassword, {});
  const [pw, setPw] = useState("");
  const [again, setAgain] = useState("");
  const strength = Math.min(1, pw.length / 16 + (/[^a-zA-Z0-9]/.test(pw) ? 0.15 : 0) + (/\d/.test(pw) ? 0.1 : 0));
  const long = pw.length >= 10;
  const match = again.length > 0 && again === pw;

  return (
    <form action={action} className="mt-8 space-y-4">
      <input type="hidden" name="token" value={token} />
      <Field label="New password" hint={long ? "Long enough." : `At least 10 characters — ${Math.max(0, 10 - pw.length)} to go.`} htmlFor="password">
        <Input id="password" name="password" type="password" autoComplete="new-password" required minLength={10} autoFocus value={pw} onChange={(e) => setPw(e.target.value)} className="h-12" />
      </Field>
      <Meter value={pw ? strength : 0} barClassName={strength < 0.6 ? "bg-caution" : "bg-pos"} />
      <Field label="Once more" htmlFor="confirm" error={again && !match && again.length >= pw.length ? "The two don’t match yet." : null}>
        <Input
          id="confirm"
          name="confirm"
          type="password"
          autoComplete="new-password"
          required
          value={again}
          onChange={(e) => setAgain(e.target.value)}
          className="h-12"
          trailing={match ? <AdminIcon name="checkCircle" size={18} className="mr-1.5 text-pos-text" aria-label="Matches" /> : null}
        />
      </Field>
      {state.error && (
        <p role="alert" className="flex items-center gap-2 rounded-[12px] bg-neg/10 px-3 py-2.5 text-callout font-medium text-neg-text">
          <AdminIcon name="alert" size={15} />
          {state.error}
        </p>
      )}
      <Button type="submit" variant="primary" size="lg" loading={pending} disabled={!long || !match} className="mt-2 w-full">
        Save and sign in
      </Button>
    </form>
  );
}
