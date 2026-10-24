"use client";

import { useActionState } from "react";
import { Button, Field, Input } from "@/components/admin/ui";
import { AdminIcon } from "@/components/admin/icons";
import { setPassword, type SetState } from "./actions";

export function SetPasswordForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState<SetState, FormData>(setPassword, {});
  return (
    <form action={action} className="mt-8 space-y-4">
      <input type="hidden" name="token" value={token} />
      <Field label="New password" hint="At least 10 characters." htmlFor="password">
        <Input id="password" name="password" type="password" autoComplete="new-password" required minLength={10} autoFocus />
      </Field>
      <Field label="Once more" htmlFor="confirm">
        <Input id="confirm" name="confirm" type="password" autoComplete="new-password" required />
      </Field>
      {state.error && (
        <p role="alert" className="flex items-center gap-2 text-[0.875rem] text-[#ff9b93]"><AdminIcon name="alert" size={15} />{state.error}</p>
      )}
      <Button type="submit" variant="primary" loading={pending} className="w-full">Save and sign in</Button>
    </form>
  );
}
