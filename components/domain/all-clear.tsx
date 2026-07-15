"use client";

import { useEffect, useState } from "react";
import { RiCheckboxCircleLine } from "@remixicon/react";

import { SidebarNotice } from "@/components/domain/sidebar-notice";

// The all-clear state (frontend §3): affirmative, not a blank screen — shown
// when nothing needs attention and the verdict is green. It lives in the
// SIDEBAR since 2026-07-15 (founder-directed): it is chrome, not cockpit — a
// standing "nothing to do" that shouldn't push the Home grid down. Green is
// legitimate here (unlike the reconnect notice): this IS a budget statement.
// Dismissal stays local to the render — it changes no finding or notification
// state (invariant #6).

const copy = {
  title: "Tudo sob controle",
  body: "Nenhum time fora do orçamento no ritmo atual. Próximo resumo na sexta.",
  dismiss: "Fechar aviso",
};

export function AllClear() {
  const [state, setState] = useState<"open" | "closing" | "closed">("open");

  useEffect(() => {
    if (state !== "closing") return;
    const timeout = window.setTimeout(() => setState("closed"), 180);
    return () => window.clearTimeout(timeout);
  }, [state]);

  if (state === "closed") return null;

  return (
    <SidebarNotice
      icon={<RiCheckboxCircleLine />}
      title={copy.title}
      description={copy.body}
      tone="green"
      closing={state === "closing"}
      onDismiss={() => setState("closing")}
      dismissLabel={copy.dismiss}
    />
  );
}
