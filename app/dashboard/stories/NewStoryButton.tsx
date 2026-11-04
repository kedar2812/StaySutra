"use client";

import { useFormStatus } from "react-dom";
import { Button } from "@/components/admin/ui";
import { createStory } from "./actions";

/** Starts a draft and opens it. The spinner covers the round trip. */
export function NewStoryButton() {
  return (
    <form action={createStory}>
      <Submit />
    </form>
  );
}

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="primary" icon="plus" loading={pending}>
      New story
    </Button>
  );
}
