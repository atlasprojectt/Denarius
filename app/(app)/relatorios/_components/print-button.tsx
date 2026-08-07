"use client";

import { RiPrinterLine } from "@remixicon/react";

import { Button } from "@/components/ui/button";
import { copy } from "../copy";

export function PrintButton() {
  return (
    <Button
      type="button"
      variant="secondary"
      size="sm"
      shape="compact"
      data-print-control
      onClick={() => window.print()}
    >
      <RiPrinterLine aria-hidden />
      {copy.print}
    </Button>
  );
}

