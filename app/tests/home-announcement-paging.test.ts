import { expect, test } from "bun:test";
import type { PaginationResult } from "convex/server";
import { homeAnnouncementPage } from "../convex/home_announcement";
import type { Notice } from "../src/domain/app-types";

const today = "2026-11-02";
const accountId = "fixture-account";
const notice = (id: string, extra: Partial<Notice> = {}): Notice => ({
	id,
	title: id,
	body: id,
	date: "2026-11-01",
	expiresAt: "2026-11-10",
	program: "all",
	acknowledgedBy: [],
	...extra,
});
const page = (
	notices: Notice[],
	extra: Partial<PaginationResult<Notice>> = {},
): PaginationResult<Notice> => ({
	page: notices,
	isDone: false,
	continueCursor: "next-page",
	...extra,
});

test("an empty filtered announcement page retains its continuation and split metadata", (): void => {
	const result = homeAnnouncementPage(
		page(
			[
				notice("expired", { expiresAt: today }),
				notice("dismissed", { dismissedBy: [accountId] }),
				notice("future", { date: "2026-12-01" }),
			],
			{ splitCursor: "split-point", pageStatus: "SplitRecommended" },
		),
		accountId,
		today,
	);
	expect(result).toEqual({
		page: [],
		isDone: false,
		continueCursor: "next-page",
		splitCursor: "split-point",
		pageStatus: "SplitRecommended",
	});
});

test("an older live announcement remains reachable beyond expired and dismissed pages", (): void => {
	const notices = [
		...Array.from({ length: 45 }, (_, index) =>
			notice(`expired-${index}`, { expiresAt: today }),
		),
		...Array.from({ length: 45 }, (_, index) =>
			notice(`dismissed-${index}`, { dismissedBy: [accountId] }),
		),
		notice("older-live"),
	];
	const read = (cursor: number): PaginationResult<Notice> => {
		const end = Math.min(cursor + 40, notices.length);
		return homeAnnouncementPage(
			page(notices.slice(cursor, end), {
				continueCursor: String(end),
				isDone: end === notices.length,
			}),
			accountId,
			today,
		);
	};
	const first = read(0);
	const second = read(Number(first.continueCursor));
	const third = read(Number(second.continueCursor));
	expect(first.page).toEqual([]);
	expect(second.page).toEqual([]);
	expect(first.isDone).toBe(false);
	expect(second.isDone).toBe(false);
	expect(third.page.map((entry) => entry.id)).toEqual(["older-live"]);
	expect(third.isDone).toBe(true);
});

test("one highlight is returned without exposing other accounts' dismissal or acknowledgement state", (): void => {
	const result = homeAnnouncementPage(
		page([
			notice("latest", {
				dismissedBy: ["someone-else"],
				acknowledgedBy: ["someone-else"],
			}),
			notice("older"),
		]),
		accountId,
		today,
	);
	expect(result.page).toHaveLength(1);
	expect(result.page.at(0)?.id).toBe("latest");
	expect(result.page.at(0)?.dismissedBy).toEqual([]);
	expect(result.page.at(0)?.acknowledgedBy).toEqual([]);
});

test("exhaustion stays terminal and does not invent a live announcement", (): void => {
	expect(
		homeAnnouncementPage(
			page([], { isDone: true, continueCursor: "" }),
			accountId,
			today,
		),
	).toEqual({ page: [], isDone: true, continueCursor: "" });
});
