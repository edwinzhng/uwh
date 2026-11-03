import assert from "node:assert/strict";
import type { ConvexHttpClient } from "convex/browser";
import type { PaginationResult } from "convex/server";
import { api, internal } from "../convex/_generated/api";
import { balance } from "../src/domain/app-rules";
import { attendanceSummary } from "../src/domain/attendance-summary";
import { localRun } from "./local-checks";
import { createVerificationRun } from "./verification-fixtures";

const url = process.env.EXPO_PUBLIC_CONVEX_URL;
if (url !== "http://127.0.0.1:3210") throw new Error("Local backend only.");
const run = createVerificationRun("performance-cleanup");
const fixture = async (name: string): Promise<ConvexHttpClient> =>
	(await run.fixture(name)).client;
try {
	const owner = await fixture("Performance Owner");
	const clubId = await owner.mutation(api.club.create, {
		name: "Performance fixture",
		samples: true,
	});
	const identity = await owner.query(api.account.current, {});
	assert(identity);
	const parent = await fixture("Performance Parent");
	const club = await owner.query(api.club.current, {});
	assert(club);
	await parent.mutation(api.club.requestToJoin, { clubCode: club.inviteCode });
	const parentAccount = await parent.query(api.account.current, {});
	assert(parentAccount);
	for (const personId of ["jamie", "sam"])
		await owner.mutation(api.household.invite, {
			accountId: parentAccount.id,
			personId,
			key: crypto.randomUUID(),
		});
	const household = await parent.query(api.household.state, {});
	for (const link of household.available)
		await parent.mutation(api.household.accept, { id: link.id });

	await localRun(
		"local_checks:seedClubHistory",
		internal.local_checks.seedClubHistory,
		{ clubId, userId: identity.id },
	);
	const full = await owner.query(api.club.current, {});
	assert(full);
	const scopedStart = performance.now();
	const compact = await owner.query(api.club.current, { screen: "schedule" });
	const scopedMs = Math.round(performance.now() - scopedStart);
	assert(compact);
	assert.equal(compact.data.events.length, 0);
	assert.equal(compact.data.responses.length, 0);
	assert.equal(compact.data.feedback.length, 0);
	assert.equal(compact.data.payments.length, 0);
	assert.equal(compact.data.loans.length, 0);
	assert(compact.data.notices.length <= 20);
	const fullBytes = new TextEncoder().encode(JSON.stringify(full)).byteLength;
	const compactBytes = new TextEncoder().encode(
		JSON.stringify(compact),
	).byteLength;
	assert(compactBytes < fullBytes * 0.15);
	const allPages = async <T>(
		get: (cursor: string | null) => Promise<PaginationResult<T>>,
	): Promise<T[]> => {
		const items: T[] = [];
		const next = async (cursor: string | null): Promise<void> => {
			const result = await get(cursor);
			assert(result.page.length <= 40);
			items.push(...result.page);
			if (!result.isDone) await next(result.continueCursor);
		};
		await next(null);
		return items;
	};
	const now = Date.parse("2026-09-08T18:00:00Z");
	const events = await allPages((cursor) =>
		owner.query(api.pages.schedule, {
			view: "past",
			date: "2026-09-08",
			season: "archive",
			now,
			paginationOpts: { cursor, numItems: 30 },
		}),
	);
	assert.equal(events.length, 400);
	assert.equal(new Set(events.map((row) => row.event.id)).size, 400);
	assert.equal(events.at(0)?.event.id, "archive-399");
	assert(events.every((row) => row.responses.length === 5));
	const calendar = await parent.query(api.pages.calendar, {
		from: "2024-02-01",
		to: "2024-02-29",
		season: "archive",
	});
	assert.equal(Object.keys(calendar).length, 29);
	await assert.rejects(
		parent.query(api.pages.calendar, {
			from: "2024-01-01",
			to: "2025-12-31",
			season: "archive",
		}),
	);
	const sam = full.data.members.find((member) => member.id === "sam");
	assert(sam);
	const summary = await parent.query(api.attendance.summary, {
		personId: "sam",
		seasonId: "archive",
		now,
	});
	assert(summary);
	assert.deepEqual(summary, attendanceSummary(full.data, sam, "archive", now));
	assert.equal(summary.total, 400);
	assert.equal(summary.attended, 75);
	assert.equal(summary.onTime, 67);
	assert.equal(
		await parent.query(api.attendance.summary, {
			personId: "casey",
			seasonId: "archive",
			now,
		}),
		null,
	);
	const feedback = await allPages((cursor) =>
		parent.query(api.pages.feedback, {
			personId: "sam",
			visibility: "published",
			paginationOpts: { cursor, numItems: 30 },
		}),
	);
	assert(feedback.length >= 200);
	assert(feedback.every((entry) => entry.visibility === "published"));
	assert.equal(
		(
			await parent.query(api.pages.feedback, {
				personId: "sam",
				visibility: "private",
				paginationOpts: { cursor: null, numItems: 30 },
			})
		).page.length,
		0,
	);
	const members = await allPages((cursor) =>
		parent.query(api.pages.members, {
			search: "Fixture",
			paginationOpts: { cursor, numItems: 30 },
		}),
	);
	assert.equal(members.length, 120);
	assert(
		members.every((row) => row.member.rating === 0 && row.member.goal === ""),
	);
	const returns = await allPages((cursor) =>
		owner.query(api.pages.returns, {
			paginationOpts: { cursor, numItems: 30 },
		}),
	);
	assert(returns.length >= 120);
	assert.equal(
		(
			await parent.query(api.pages.returns, {
				paginationOpts: { cursor: null, numItems: 30 },
			})
		).page.length,
		0,
	);
	const payments = await allPages((cursor) =>
		parent.query(api.pages.payments, {
			personId: "jamie",
			paginationOpts: { cursor, numItems: 30 },
		}),
	);
	assert(payments.length >= 120);
	assert.equal(
		(
			await parent.query(api.pages.payments, {
				personId: "alex",
				paginationOpts: { cursor: null, numItems: 30 },
			})
		).page.length,
		0,
	);
	const personal = await parent.query(api.club.current, {
		screen: "member",
		id: "jamie",
	});
	assert(personal);
	assert.equal(personal.data.payments.length, 0);
	assert.equal(balance(personal.data, "jamie"), balance(full.data, "jamie"));
	const before = balance(personal.data, "jamie");
	assert(before > 2);
	await Promise.all([
		owner.mutation(api.club.apply, {
			action: {
				type: "payment",
				payment: {
					id: "concurrent-a",
					personId: "jamie",
					amount: 1,
					note: "A",
				},
			},
		}),
		owner.mutation(api.club.apply, {
			action: {
				type: "payment",
				payment: {
					id: "concurrent-b",
					personId: "jamie",
					amount: 1,
					note: "B",
				},
			},
		}),
	]);
	await owner.mutation(api.club.apply, {
		action: {
			type: "payment",
			payment: { id: "concurrent-a", personId: "jamie", amount: 1, note: "A" },
		},
	});
	const after = await parent.query(api.club.current, {
		screen: "member",
		id: "jamie",
	});
	assert(after);
	assert.equal(balance(after.data, "jamie"), before - 2);
	const reports = await allPages((cursor) =>
		owner.query(api.moderation.reportsPage, {
			view: "reviewed",
			paginationOpts: { cursor, numItems: 30 },
		}),
	);
	assert.equal(reports.length, 120);
	assert.equal(
		(
			await parent.query(api.moderation.reportsPage, {
				view: "reviewed",
				paginationOpts: { cursor: null, numItems: 30 },
			})
		).page.length,
		0,
	);
	const notices = await allPages((cursor) =>
		parent.query(api.pages.notices, {
			paginationOpts: { cursor, numItems: 30 },
		}),
	);
	assert(notices.length >= 120);
	const oldest = notices.at(-1);
	assert(oldest);
	await parent.mutation(api.club.apply, {
		action: { type: "dismiss-notice", noticeId: oldest.id },
	});
	const eventBefore = full.data.events.find(
		(event) => event.id === "archive-0",
	);
	assert(eventBefore);
	await owner.mutation(api.club.apply, {
		action: {
			type: "save-plan",
			eventId: "archive-0",
			body: "Single event plan",
		},
	});
	const session = await owner.query(api.club.current, {
		screen: "session",
		id: "archive-0",
	});
	assert(session);
	assert.equal(session.data.events.length, 1);
	assert.equal(session.data.responses.length, 5);
	assert.equal(session.data.plans["archive-0"], "Single event plan");
	const preserved = await owner.query(api.club.current, {});
	assert(preserved);
	assert.equal(preserved.data.events.length, full.data.events.length);
	assert.equal(preserved.data.feedback.length, full.data.feedback.length);
	assert.deepEqual(
		preserved.data.events.find((event) => event.id === "archive-1"),
		full.data.events.find((event) => event.id === "archive-1"),
	);
	console.log(
		`Performance checks passed: 400 events, 2,000 attendance records, 400 feedback entries, and 120-item directories/payment/return/report/notice histories. Schedule workspace ${fullBytes} → ${compactBytes} bytes (${Math.round((1 - compactBytes / fullBytes) * 100)}% less), scoped request ${scopedMs} ms. Permissions, paging, season totals, concurrent payments and unrelated history preserved.`,
	);
} finally {
	await run.close();
}
