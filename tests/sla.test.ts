import { describe, expect, it } from "vitest";
import { computeDueDates, deriveSlaState } from "@/lib/sla";
import { SlaState, TicketStatus } from "@prisma/client";

describe("computeDueDates", () => {
  it("adds the configured minutes to the start time", () => {
    const from = new Date("2026-01-01T00:00:00Z");
    const { slaFirstResponseDueAt, slaResolutionDueAt } = computeDueDates(
      { firstResponseMins: 30, resolutionMins: 120 },
      from,
    );
    expect(slaFirstResponseDueAt.toISOString()).toBe("2026-01-01T00:30:00.000Z");
    expect(slaResolutionDueAt.toISOString()).toBe("2026-01-01T02:00:00.000Z");
  });
});

describe("deriveSlaState", () => {
  const now = new Date("2026-01-01T12:00:00Z");

  it("is ON_TRACK when deadlines are comfortably ahead", () => {
    expect(
      deriveSlaState({
        status: TicketStatus.OPEN,
        firstRespondedAt: null,
        slaFirstResponseDueAt: new Date("2026-01-01T18:00:00Z"),
        slaResolutionDueAt: new Date("2026-01-02T12:00:00Z"),
        now,
      }),
    ).toBe(SlaState.ON_TRACK);
  });

  it("is AT_RISK within an hour of a deadline", () => {
    expect(
      deriveSlaState({
        status: TicketStatus.OPEN,
        firstRespondedAt: null,
        slaFirstResponseDueAt: new Date("2026-01-01T12:30:00Z"),
        slaResolutionDueAt: new Date("2026-01-02T12:00:00Z"),
        now,
      }),
    ).toBe(SlaState.AT_RISK);
  });

  it("is BREACHED once a deadline passes unmet", () => {
    expect(
      deriveSlaState({
        status: TicketStatus.OPEN,
        firstRespondedAt: null,
        slaFirstResponseDueAt: new Date("2026-01-01T11:00:00Z"),
        slaResolutionDueAt: new Date("2026-01-02T12:00:00Z"),
        now,
      }),
    ).toBe(SlaState.BREACHED);
  });

  it("ignores the first-response deadline once a response exists", () => {
    expect(
      deriveSlaState({
        status: TicketStatus.OPEN,
        firstRespondedAt: new Date("2026-01-01T10:00:00Z"),
        slaFirstResponseDueAt: new Date("2026-01-01T11:00:00Z"), // passed but met
        slaResolutionDueAt: new Date("2026-01-02T12:00:00Z"),
        now,
      }),
    ).toBe(SlaState.ON_TRACK);
  });

  it("is always ON_TRACK for resolved/closed tickets", () => {
    expect(
      deriveSlaState({
        status: TicketStatus.RESOLVED,
        firstRespondedAt: null,
        slaFirstResponseDueAt: new Date("2026-01-01T01:00:00Z"),
        slaResolutionDueAt: new Date("2026-01-01T02:00:00Z"),
        now,
      }),
    ).toBe(SlaState.ON_TRACK);
  });
});
