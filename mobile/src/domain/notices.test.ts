import { describe, expect, setSystemTime, test } from "bun:test";
import { initialAppData, primaryAccount } from "../demo/app-data";
import { reduceApp } from "./app-reducer";
import { visibleNotices } from "./app-rules";
import type { AppData, Notice } from "./app-types";
import { bannerNotices } from "./notices";

const notice: Notice = {
	id: "notice-test",
	title: "Pool",
	body: "East entrance",
	date: "2026-09-01",
	program: "all",
	acknowledgedBy: [],
};
describe("persistent notices", () => {
	test("dismissal hides the banner without acknowledgment or removing archive content", () => {
		const data: AppData = { ...initialAppData, notices: [notice] };
		const next = reduceApp(data, primaryAccount, {
			type: "dismiss-notice",
			noticeId: notice.id,
		});
		expect(
			bannerNotices(next.notices, primaryAccount.id, "2026-09-13"),
		).toHaveLength(0);
		expect(next.notices).toHaveLength(1);
		expect(next.notices.at(0)?.acknowledgedBy).toEqual([]);
		expect(
			bannerNotices(next.notices, "another-account", "2026-09-13"),
		).toHaveLength(1);
		expect(
			reduceApp(next, primaryAccount, {
				type: "dismiss-notice",
				noticeId: notice.id,
			}).notices.at(0)?.dismissedBy,
		).toEqual([primaryAccount.id]);
	});
	test("expired and future notices stay out of banners", () => {
		expect(
			bannerNotices(
				[
					{ ...notice, expiresAt: "2026-09-13" },
					{ ...notice, date: "2026-09-14" },
				],
				primaryAccount.id,
				"2026-09-13",
			),
		).toEqual([]);
	});
	test("targeting includes household programs and rejects unrelated programs", () => {
		const account = {
			...primaryAccount,
			admin: false,
			coachPrograms: [],
			children: ["child"],
		};
		const data: AppData = {
			...initialAppData,
			members: [
				{
					id: "child",
					name: "Child",
					programs: ["junior"],
					position: "",
					rating: 0,
					registration: "approved",
					goal: "",
					steps: 0,
				},
			],
			notices: [
				{ ...notice, program: "junior" },
				{ ...notice, id: "other", program: "senior" },
			],
		};
		expect(visibleNotices(data, account).map((entry) => entry.id)).toEqual([
			notice.id,
		]);
		expect(() =>
			reduceApp(data, account, { type: "dismiss-notice", noticeId: "other" }),
		).toThrow();
	});
	test("coaches cannot publish to unrelated programs", () => {
		expect(() =>
			reduceApp(
				initialAppData,
				{ ...primaryAccount, admin: false, coachPrograms: ["junior"] },
				{ type: "create-notice", notice },
			),
		).toThrow();
	});
});

test("expire-now uses the club date when UTC has crossed midnight", () => {
	setSystemTime(new Date("2026-09-14T01:00:00Z"));
	try {
		const data = {
			...initialAppData,
			timeZone: "America/Edmonton",
			notices: [notice],
		};
		const next = reduceApp(
			data,
			{ ...primaryAccount, admin: true },
			{ type: "expire-notice", noticeId: notice.id },
		);
		expect(next.notices.at(0)?.expiresAt).toBe("2026-09-13");
	} finally {
		setSystemTime();
	}
});
