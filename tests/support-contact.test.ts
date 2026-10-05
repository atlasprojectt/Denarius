import { describe, expect, it } from "vitest";

import { GET } from "@/app/(app)/suporte/route";
import { SUPPORT_EMAIL, supportComposeUrl } from "@/lib/support/contact";

describe("support contact", () => {
  it("opens Gmail's compose window addressed to support", () => {
    const url = new URL(supportComposeUrl());

    expect(url.origin).toBe("https://mail.google.com");
    expect(url.searchParams.get("view")).toBe("cm");
    expect(url.searchParams.get("to")).toBe(SUPPORT_EMAIL);
    expect(url.searchParams.get("su")).toBe("Denarius: ajuda e suporte");
    expect(url.searchParams.get("body")).toContain("O que aconteceu?");
  });

  it("redirects /suporte to the compose window", () => {
    const response = GET();

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(supportComposeUrl());
  });
});
