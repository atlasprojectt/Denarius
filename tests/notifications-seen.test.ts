import { describe, expect, it } from "vitest";

import {
  parseSeenNotificationIds,
  serializeSeenNotificationIds,
  unseenNotificationIds,
} from "@/lib/home/notifications-seen";

describe("parseSeenNotificationIds", () => {
  it("returns an empty list for missing or broken storage", () => {
    expect(parseSeenNotificationIds(null)).toEqual([]);
    expect(parseSeenNotificationIds("")).toEqual([]);
    expect(parseSeenNotificationIds("not-json")).toEqual([]);
    expect(parseSeenNotificationIds('{"a":true}')).toEqual([]);
  });

  it("keeps only string entries", () => {
    expect(parseSeenNotificationIds('["budget:org:breach",42,null]')).toEqual([
      "budget:org:breach",
    ]);
  });
});

describe("serializeSeenNotificationIds", () => {
  it("round-trips through parse", () => {
    const raw = serializeSeenNotificationIds(["budget:org:warning", "budget:t1:breach"]);
    expect(parseSeenNotificationIds(raw)).toEqual([
      "budget:org:warning",
      "budget:t1:breach",
    ]);
  });
});

describe("unseenNotificationIds", () => {
  it("reports every active id until it is opened", () => {
    expect(unseenNotificationIds(["budget:org:breach"], [])).toEqual([
      "budget:org:breach",
    ]);
    expect(
      unseenNotificationIds(["budget:org:breach"], ["budget:org:warning"]),
    ).toEqual(["budget:org:breach"]);
    expect(
      unseenNotificationIds(["budget:org:breach"], ["budget:org:breach"]),
    ).toEqual([]);
  });

  it("surfaces only the new alert after one was seen", () => {
    expect(
      unseenNotificationIds(
        ["budget:org:warning", "budget:t1:breach"],
        ["budget:org:warning"],
      ),
    ).toEqual(["budget:t1:breach"]);
  });
});
