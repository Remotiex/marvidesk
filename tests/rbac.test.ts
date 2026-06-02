import { describe, expect, it } from "vitest";
import { ticketScope, canCreateTicket, canRoute, type SessionUser } from "@/lib/access";
import { DepartmentKey, Role } from "@prisma/client";

const mk = (role: Role, departmentId: string | null = null): SessionUser => ({
  id: "u1",
  role,
  departmentId,
});

describe("ticketScope", () => {
  it("admin sees everything (empty filter)", () => {
    expect(ticketScope(mk(Role.SYSTEM_ADMIN))).toEqual({});
  });

  it("CS agent sees only tickets they created", () => {
    expect(ticketScope(mk(Role.CS_AGENT))).toEqual({ createdById: "u1" });
  });

  it("resolving role is scoped to its department", () => {
    expect(ticketScope(mk(Role.FINANCE, "dept-fin"))).toEqual({
      assignedDepartmentId: "dept-fin",
    });
  });

  it("resolving role with no department sees nothing", () => {
    expect(ticketScope(mk(Role.TECH, null))).toEqual({ id: "__none__" });
  });

  it("CS manager sees CS-created tickets and their own assignments", () => {
    const scope = ticketScope(mk(Role.CS_MANAGER));
    expect(scope).toEqual({
      OR: [
        { createdBy: { department: { key: DepartmentKey.CS } } },
        { assigneeId: "u1" },
      ],
    });
  });
});

describe("permissions", () => {
  it("only CS roles and admin can create / route", () => {
    for (const r of [Role.CS_AGENT, Role.CS_MANAGER, Role.SYSTEM_ADMIN]) {
      expect(canCreateTicket(mk(r))).toBe(true);
      expect(canRoute(mk(r))).toBe(true);
    }
    for (const r of [Role.OPS, Role.FINANCE, Role.TECH, Role.SALES]) {
      expect(canCreateTicket(mk(r))).toBe(false);
      expect(canRoute(mk(r))).toBe(false);
    }
  });
});
