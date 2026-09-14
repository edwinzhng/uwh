import { describe, expect, test } from "bun:test";
import { ConvexError } from "convex/values";
import { shouldRestartPagination } from "../src/backend/pagination-recovery";

describe("pagination cursor recovery", () => {
	test("discards a stale continuation after a query definition changes", () => {
		expect(
			shouldRestartPagination(
				new Error("InvalidCursor: query changed"),
				"old-page",
			),
		).toBe(true);
	});
	test("recognizes structured Convex pagination errors", () => {
		expect(
			shouldRestartPagination(
				new ConvexError({
					isConvexSystemError: true,
					paginationError: "InvalidCursor",
				}),
				"old-page",
			),
		).toBe(true);
	});
	test("does not repeatedly retry a failed first page", () => {
		expect(shouldRestartPagination(new Error("InvalidCursor"), null)).toBe(
			false,
		);
	});
	test("does not hide permission failures, loading, or successful pages", () => {
		expect(shouldRestartPagination(new Error("Sign in required"), "page")).toBe(
			false,
		);
		expect(shouldRestartPagination(undefined, "page")).toBe(false);
		expect(
			shouldRestartPagination(
				{ page: [], isDone: true, continueCursor: "" },
				"page",
			),
		).toBe(false);
	});
});
