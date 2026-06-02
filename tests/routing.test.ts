import { describe, expect, it } from "vitest";
import { CATEGORY_DEPARTMENT } from "@/lib/domain";
import { DepartmentKey, TicketCategory } from "@prisma/client";

describe("category → department routing", () => {
  it("routes each category to the correct department", () => {
    expect(CATEGORY_DEPARTMENT[TicketCategory.RETURN_REPLACE]).toBe(DepartmentKey.OPS);
    expect(CATEGORY_DEPARTMENT[TicketCategory.REFUND_COMPENSATE]).toBe(DepartmentKey.FINANCE);
    expect(CATEGORY_DEPARTMENT[TicketCategory.TECHNICAL_ISSUE]).toBe(DepartmentKey.TECH);
    expect(CATEGORY_DEPARTMENT[TicketCategory.FOLLOW_UP]).toBe(DepartmentKey.SALES);
    expect(CATEGORY_DEPARTMENT[TicketCategory.ESCALATION]).toBe(DepartmentKey.MANAGEMENT);
  });

  it("covers every category", () => {
    for (const c of Object.values(TicketCategory)) {
      expect(CATEGORY_DEPARTMENT[c]).toBeDefined();
    }
  });
});
