import { expect, it } from "vitest";
import {
  adminCategory,
  categoryFromAdmin,
  adminDate,
  adminLabel,
  adminMessage,
} from "../lib/admin-language";
import { taxonomy } from "../lib/normalize";
import { providerDiagnostic } from "../lib/providers/diagnostics";

it("round-trips Chinese category edits without changing stored taxonomy keys", () => {
  for (const category of taxonomy)
    expect(categoryFromAdmin(adminCategory(category))).toBe(category);
  expect(categoryFromAdmin("益智")).toBe("Puzzle");
  expect(adminLabel("category:2-player")).toBe("分类：双人");
});
it("uses Chinese states and Beijing time", () => {
  expect(adminLabel("partial")).toBe("部分目录已同步");
  expect(adminLabel("noindex")).toBe("不允许收录");
  expect(adminDate("2026-09-20T00:00:00Z")).toContain("08:00");
  expect(adminDate(null)).toBe("暂无记录");
});
it("localizes operator messages and never reflects unrecognized raw errors", () => {
  expect(adminMessage("Incorrect password.")).toBe(
    "管理员密码错误，请重新输入。",
  );
  expect(
    adminMessage(
      "Background sync queued (job-123). Refresh this page for progress.",
    ),
  ).toContain("后台同步已排队（job-123）");
  expect(adminMessage("Provider returned HTTP 403")).toContain("403");
  const raw = new Error("https://example.invalid/feed?secret=private");
  expect(providerDiagnostic(raw)).not.toContain("private");
  expect(adminMessage(raw.message)).not.toContain("private");
});
