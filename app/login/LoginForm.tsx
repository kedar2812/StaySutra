"use client";

import { useActionState, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Button, Field, Input } from "@/components/admin/ui";
import { AdminIcon } from "@/components/admin/icons";
import { login, type LoginState } from "./actions";

export function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, {});
  const [show, setShow] = useState(false);
  const reduced = useReducedMotion();

  return (
    <motion.form
      action={action}
      className="mt-8 space-y-4"
      // A wrong password shakes the form once, the way a lock screen does.
      key={state.error ? `err-${Date.now()}` : "form"}
      animate={state.error && !reduced ? { x: [0, -10, 9, -6, 4, 0] } : undefined}
      transition={{ duration: 0.45 }}
    >
      <input type="hidden" name="next" value={next} />
      <Field label="Email" htmlFor="email">
        <Input id="email" name="email" type="email" autoComplete="username" required defaultValue={state.email} autoFocus className="h-12" />
      </Field>
      <Field label="Password" htmlFor="password">
        <Input
          id="password"
          name="password"
          type={show ? "text" : "password"}
          autoComplete="current-password"
          required
          className="h-12"
          trailing={
            <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? "Hide password" : "Show password"} className="grid size-9 place-items-center rounded-full text-fg-3 hover:bg-fill hover:text-fg">
              <AdminIcon name={show ? "eyeOff" : "eye"} size={17} />
            </button>
          }
        />
      </Field>
      {state.error && (
        <p role="alert" className="flex items-center gap-2 rounded-[12px] bg-neg/10 px-3 py-2.5 text-callout font-medium text-neg-text">
          <AdminIcon name="alert" size={15} />
          {state.error}
        </p>
      )}
      <Button type="submit" variant="primary" size="lg" loading={pending} className="mt-2 w-full">
        {pending ? "Signing in" : "Sign in"}
      </Button>
    </motion.form>
  );
}
