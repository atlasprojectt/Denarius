import { describe, expect, it } from "vitest";

import {
  greetingForHour,
  statusIndicatorClasses,
} from "@/app/(app)/_components/home-greeting";
import { profileLabel } from "@/lib/settings/account";

describe("greetingForHour", () => {
  it("uses morning, afternoon and evening ranges", () => {
    expect(greetingForHour(5)).toBe("Bom dia");
    expect(greetingForHour(11)).toBe("Bom dia");
    expect(greetingForHour(12)).toBe("Boa tarde");
    expect(greetingForHour(17)).toBe("Boa tarde");
    expect(greetingForHour(18)).toBe("Boa noite");
    expect(greetingForHour(4)).toBe("Boa noite");
  });

  it("keeps the profile display name and falls back to email", () => {
    expect(profileLabel({ displayName: "  Jo Stewart ", email: "jo@example.com" })).toBe(
      "Jo Stewart",
    );
    expect(profileLabel({ displayName: " ", email: "jo@example.com" })).toBe(
      "jo@example.com",
    );
  });

  it("uses the existing pulse animations for active budget statuses", () => {
    for (const status of ["green", "amber", "red"] as const) {
      expect(statusIndicatorClasses(status).ping).toBe("denarius-ping");
      expect(statusIndicatorClasses(status).dot).toContain("denarius-breathe");
    }
  });

  it("keeps collecting neutral and still", () => {
    const classes = statusIndicatorClasses("collecting");
    expect(classes.ping).toBe("");
    expect(classes.dot).not.toContain("denarius-breathe");
  });
});
