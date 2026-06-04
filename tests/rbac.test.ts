import { describe, expect, it } from "vitest";
import {
  ticketScope,
  canCreateTicket,
  canRoute,
  canAdminister,
  type SessionUser,
  type SessionRole,
} from "@/lib/access";
import { TicketScope } from "@prisma/client";

const role = (over: Partial<SessionRole> = {}): SessionRole => ({
  id: "r",
  name: "R",
  scope: TicketScope.OWN,
  canCreateTickets: false,
  canRoute: false,
  canViewDashboard: false,
  canAdminister: false,
  isEscalationAssignee: false,
  ...over,
});

const mk = (r: SessionRole | null, departmentId: string | null = null): SessionUser => ({
  id: "u1",
  role: r,
  departmentId,
});

describe("ticketScope", () => {
  it("ALL scope sees everything (empty filter)", () => {
    expect(ticketScope(mk(role({ scope: TicketScope.ALL })))).toEqual({});
  });

  it("OWN scope sees only tickets they created", () => {
    expect(ticketScope(mk(role({ scope: TicketScope.OWN })))).toEqual({
      createdById: "u1",
    });
  });

  it("DEPARTMENT scope is bound to the user's department", () => {
    expect(
      ticketScope(mk(role({ scope: TicketScope.DEPARTMENT }), "dept-fin")),
    ).toEqual({ assignedDepartmentId: "dept-fin" });
  });

  it("DEPARTMENT scope with no department sees nothing", () => {
    expect(ticketScope(mk(role({ scope: TicketScope.DEPARTMENT }), null))).toEqual({
      id: "__none__",
    });
  });

  it("CS_CREATED scope sees CS-created tickets and own assignments", () => {
    expect(ticketScope(mk(role({ scope: TicketScope.CS_CREATED })))).toEqual({
      OR: [
        { createdBy: { department: { isCustomerSupport: true } } },
        { assigneeId: "u1" },
      ],
    });
  });

  it("a user with no role sees nothing", () => {
    expect(ticketScope(mk(null))).toEqual({ id: "__none__" });
  });
});

describe("permission flags", () => {
  it("derive from the role's booleans", () => {
    expect(canCreateTicket(mk(role({ canCreateTickets: true })))).toBe(true);
    expect(canRoute(mk(role({ canRoute: true })))).toBe(true);
    expect(canAdminister(mk(role({ canAdminister: true })))).toBe(true);
    expect(canCreateTicket(mk(role()))).toBe(false);
    expect(canAdminister(mk(null))).toBe(false);
  });
});
