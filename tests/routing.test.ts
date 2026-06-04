import { describe, expect, it } from "vitest";
import { PRIORITY_ORDER, PRIORITY_LABEL } from "@/lib/domain";
import { Priority } from "@prisma/client";

// Category → department routing is now data-driven (Category.defaultDepartmentId,
// configurable in /admin), so it is covered by the service/seed rather than a
// pure unit test. These cover the remaining fixed Priority enum.

describe("priority constants", () => {
  it("orders priorities low → urgent", () => {
    expect(PRIORITY_ORDER).toEqual([
      Priority.LOW,
      Priority.NORMAL,
      Priority.HIGH,
      Priority.URGENT,
    ]);
  });

  it("labels every priority", () => {
    for (const p of Object.values(Priority)) {
      expect(PRIORITY_LABEL[p]).toBeTruthy();
    }
  });
});
