import "server-only";

// Somewhere for a failure to land (issue #79). The I/O edge of the logging
// seam: one JSON line per event on the platform's own stream.
//
// The destination is a WRITTEN DECISION, not a default. Vercel's runtime logs
// are it for now. An external error tracker is a dependency, and every
// dependency is due-diligence surface (§8); worse, shipping tenant data to a
// third party puts that party on the sub-processor list in the privacy policy
// (#57). Neither is a thing to acquire by reflex while adding logging. When the
// volume justifies one, this module is the only place that changes.
//
// What a line may carry is decided in lib/logging/redact.ts, not here and not
// at the call sites — "everybody remembers" is not a control.

import { describeError, redactLogDetail, type LogDetail } from "./redact";
import { referenceId } from "./reference";

// One import surface for the call sites: the emitters below plus the safe
// description of a thrown value.
export { describeError };
export type { LogDetail };

export type LogOutcome = "ok" | "failed" | "skipped";
export type LogLevel = "info" | "warn" | "error";

export type LogEvent = {
  /** Dotted operation name — `cron.sync`, `provider.sync`, `budget.upsert`.
   *  Stable, so a search finds every occurrence of the same failure. */
  op: string;
  outcome: LogOutcome;
  /** The tenant the operation belonged to. A uuid, never a name or an address. */
  tenantId?: string | null;
  /** Next's error digest, when the failure came through an error boundary —
   *  the same string the user is shown as "Referência". */
  digest?: string | null;
  detail?: LogDetail;
};

/** The line's shape. `evt` marks Denarius' own lines in a stream full of
 *  platform noise. */
type Line = {
  evt: "denarius";
  ts: string;
  level: LogLevel;
  op: string;
  outcome: LogOutcome;
  tenant?: string;
  ref?: string;
} & LogDetail;

const LEVEL_OF: Record<LogOutcome, LogLevel> = {
  ok: "info",
  skipped: "info",
  failed: "error",
};

/** Builds the line without emitting it — exported so a test can assert what
 *  would be written without capturing console output. */
export function buildLine(event: LogEvent, now: Date = new Date()): Line {
  const level = LEVEL_OF[event.outcome];
  const detail = redactLogDetail(event.detail ?? {});
  const reference = referenceId(event.digest);
  const {
    evt: _evt,
    ts: _ts,
    level: _level,
    op: _op,
    outcome: _outcome,
    tenant: _tenant,
    ref: _ref,
    ...safeDetail
  } = detail;
  return {
    ...safeDetail,
    evt: "denarius",
    ts: now.toISOString(),
    level,
    op: event.op,
    outcome: event.outcome,
    ...(event.tenantId ? { tenant: event.tenantId } : {}),
    ...(reference ? { ref: reference } : {}),
  };
}

/**
 * Emits one event. Never throws: a logger that can break the operation it is
 * observing gets removed the first time it does.
 */
export function logEvent(event: LogEvent): void {
  try {
    const line = buildLine(event);
    const serialized = JSON.stringify(line);
    if (line.level === "error") console.error(serialized);
    else console.info(serialized);
  } catch {
    // Nothing useful left to do — reporting a logging failure through the
    // logger is a loop, and the caller's work matters more than this line.
  }
}

/** The operation did what it was asked to. */
export function logOk(op: string, tenantId?: string | null, detail?: LogDetail): void {
  logEvent({ op, outcome: "ok", tenantId, detail });
}

/** The operation was deliberately not performed (no key configured, nothing to
 *  do) — recorded, because silence and success look identical in a log. */
export function logSkipped(op: string, tenantId?: string | null, detail?: LogDetail): void {
  logEvent({ op, outcome: "skipped", tenantId, detail });
}

/** The operation failed. This is the line that turns "não funcionou" into
 *  something reproducible. */
export function logFailure(op: string, tenantId?: string | null, detail?: LogDetail): void {
  logEvent({ op, outcome: "failed", tenantId, detail });
}

/** A thrown value, described safely (class + redacted message, never a stack). */
export function logThrown(op: string, tenantId: string | null | undefined, error: unknown): void {
  logFailure(op, tenantId, describeError(error));
}

/** The shape Supabase returns on a failed query. Only the CODE is recorded: a
 *  Postgres message quotes the offending value, and for `app_user` or
 *  `employee` that value is a person's e-mail address. */
export function dbFailure(error: { code?: string | null } | null): LogDetail {
  return { code: error?.code ?? "unknown" };
}
