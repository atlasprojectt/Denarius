"use client";

import { useState } from "react";
import { RiPrinterLine } from "@remixicon/react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { copy } from "../copy";

export function PrintButton() {
  const [open, setOpen] = useState(false);

  function printReport() {
    setOpen(false);
    window.requestAnimationFrame(() => window.print());
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          shape="compact"
          data-print-control
        >
          <RiPrinterLine aria-hidden />
          {copy.print}
        </Button>
      </DialogTrigger>
      <DialogContent data-print-control showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>{copy.printPrepTitle}</DialogTitle>
          <DialogDescription>{copy.printPrepDescription}</DialogDescription>
        </DialogHeader>
        <ul className="list-disc space-y-1 pl-4 text-muted-foreground">
          {copy.printPrepItems.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            {copy.printCancel}
          </Button>
          <Button type="button" onClick={printReport}>
            <RiPrinterLine aria-hidden />
            {copy.printContinue}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
