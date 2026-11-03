import { describe, expect, setSystemTime, test } from "bun:test";
import { initialAppData, primaryAccount } from "../src/demo/app-data";
import { reduceApp } from "../src/domain/app-reducer";
import type { Account, AppAction, Notice } from "../src/domain/app-types";
import {
	canManageNotice,
	editNotice,
	validateNoticeDraft,
} from "../src/domain/notices";

const today = "2026-10-26";
const notice: Notice = {
	id: "management-notice",
	title: "Announcement",
	body: "Bring fins",
	program: "youth",
	date: "2026-10-25",
	postedAt: Date.parse("2026-10-25T18:00:00.000Z"),
	expiresAt: "2026-11-09",
	dismissedBy: ["dismissed-account"],
	acknowledgedBy: ["historical-account"],
};
const coach: Account = {
	...primaryAccount,
	id: "coach",
	admin: false,
	coachPrograms: ["youth"],
};
const viewer: Account = { ...coach, coachPrograms: [] };
const change: Extract<AppAction, { type: "edit-notice" }> = {
	type: "edit-notice",
	noticeId: notice.id,
	body: "Bring two fins",
	expiresAt: "2026-11-10",
	expectedBody: notice.body,
	expectedExpiresAt: notice.expiresAt,
};

describe("announcement management", () => {
	test("administrators and exactly scoped coaches can manage, without granting household or unrelated coaching authority", (): void => {
		expect(canManageNotice(primaryAccount, notice)).toBe(true);
		expect(canManageNotice(coach, notice)).toBe(true);
		expect(canManageNotice(viewer, notice)).toBe(false);
		expect(canManageNotice(coach, { program: "all" })).toBe(false);
		expect(canManageNotice(coach, { program: "club" })).toBe(false);
		expect(() => editNotice(notice, viewer, change, today)).toThrow("access");
	});

	test("an edit changes only body and expiry, retaining original publication, audience and private dismissal history", (): void => {
		const updated = editNotice(notice, coach, change, today);
		expect(updated).toEqual({
			...notice,
			body: change.body,
			expiresAt: change.expiresAt,
		});
		expect(updated.date).toBe(notice.date);
		expect(updated.postedAt).toBe(notice.postedAt);
		expect(updated.program).toBe(notice.program);
		expect(updated.dismissedBy).toEqual(notice.dismissedBy);
		expect(updated.acknowledgedBy).toEqual(notice.acknowledgedBy);
	});

	test("stale body and expiry cannot overwrite a concurrent edit, but exact successful-response retries are no-ops", (): void => {
		const updated = editNotice(notice, coach, change, today);
		expect(editNotice(updated, coach, change, today)).toBe(updated);
		expect(() =>
			editNotice(updated, coach, { ...change, body: "Stale overwrite" }, today),
		).toThrow("changed");
		expect(() =>
			editNotice({ ...notice, expiresAt: "2026-11-20" }, coach, change, today),
		).toThrow("changed");
	});

	test("ended or future announcements and invalid content cannot be edited", (): void => {
		for (const inactive of [
			{ ...notice, expiresAt: today },
			{ ...notice, date: "2026-10-27" },
		])
			expect(() => editNotice(inactive, coach, change, today)).toThrow(
				"Only live",
			);
		for (const body of [" ", "x".repeat(501)])
			expect(() =>
				editNotice(notice, coach, { ...change, body }, today),
			).toThrow();
		for (const expiresAt of [undefined, today, "invalid"])
			expect(() =>
				editNotice(notice, coach, { ...change, expiresAt }, today),
			).toThrow("end date");
		expect(
			validateNoticeDraft(
				{ body: "x".repeat(500), expiresAt: "2026-10-27" },
				today,
			),
		).toBeUndefined();
	});

	test("editing a legacy no-expiry announcement preserves its missing expiry instead of inventing a new end date", (): void => {
		const legacy = { ...notice, expiresAt: undefined };
		const updated = editNotice(
			legacy,
			coach,
			{ ...change, expectedExpiresAt: undefined, expiresAt: undefined },
			today,
		);
		expect(updated.expiresAt).toBeUndefined();
		expect(updated.body).toBe(change.body);
	});

	test("the shared reducer enforces permissions, stale edits and body limits before persisting", (): void => {
		setSystemTime(new Date("2026-10-26T18:00:00Z"));
		try {
			const data = { ...initialAppData, notices: [notice] };
			const updated = reduceApp(data, coach, change);
			expect(updated.notices.at(0)?.body).toBe(change.body);
			expect(updated.notices).toHaveLength(1);
			expect(() =>
				reduceApp(updated, coach, { ...change, body: "Other" }),
			).toThrow("changed");
			expect(() => reduceApp(data, viewer, change)).toThrow("access");
			expect(() =>
				reduceApp(data, primaryAccount, {
					type: "create-notice",
					notice: { ...notice, id: "oversized", body: "x".repeat(501) },
				}),
			).toThrow("500 characters");
			const ended = reduceApp(data, coach, {
				type: "expire-notice",
				noticeId: notice.id,
			});
			expect(ended.notices.at(0)?.expiresAt).toBe(today);
			expect(() => reduceApp(ended, coach, change)).toThrow("Only live");
			expect(() =>
				reduceApp(data, viewer, {
					type: "expire-notice",
					noticeId: notice.id,
				}),
			).toThrow();
		} finally {
			setSystemTime();
		}
	});
});
