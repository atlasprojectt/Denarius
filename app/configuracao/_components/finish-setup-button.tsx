"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { finishSetup, type FinishSetupState } from "@/lib/setup/actions";

import { setupCopy } from "../copy";

const initialState: FinishSetupState = {};

/** The last step's exit. Finishing and skipping it are the same server
 *  decision; only the label and emphasis change. */
export function FinishSetupButton({ skipping }: { skipping: boolean }) {
  const [state, formAction, pending] = useActionState(finishSetup, initialState);

  return (
    <form action={formAction} className="flex flex-col items-end gap-2">
      <Button
        type="submit"
        variant={skipping ? "ghost" : "primary"}
        loading={pending}
        loadingText={setupCopy.finishing}
      >
        {skipping ? setupCopy.finishSkipping : setupCopy.finish}
      </Button>
      {state.error && (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      )}
    </form>
  );
}
