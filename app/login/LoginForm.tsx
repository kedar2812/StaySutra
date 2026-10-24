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
      animate={state.error && !reduced ? { x: [0, -8, 7, -5, 3, 0] } : undefined}
      transition={{ duration: 0.4 }}
    >
      <input type="hidden" name="next" value={next} />
      <Field label="Email" htmlFor="email">
        <Input id="email" name="email" type="email" autoComplete="username" required defaultValue={state.email} autoFocus />
      </Field>
      <Field label="Password" htmlFor="password">
        <div className="relative">
          <Input id="password" name="password" type={show ? "text" : "password"} autoComplete="current-password" required className="pr-11" />
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            aria-label={show ? "Hide password" : "Show password"}
            className="absolute right-1.5 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-[8px] text-text-low hover:text-text-hi"
          >
            <AdminIcon name={show ? "eyeOff" : "eye"} size={17} />
          </button>
        </div>
      </Field>
      {state.error && (
        <p role="alert" className="flex items-center gap-2 text-[0.875rem] text-[#ff9b93]">
          <AdminIcon name="alert" size={15} />
          {state.error}
        </p>
      )}
      <Button type="submit" variant="primary" loading={pending} className="w-full">
        Sign in
      </Button>
    </motion.form>
  );
}
