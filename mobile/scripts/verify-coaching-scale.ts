import assert from "node:assert/strict";
import { ConvexHttpClient } from "convex/browser";
import type { FunctionReturnType } from "convex/server";
import { api } from "../convex/_generated/api";
import type { EventDraft } from "../src/domain/app-types";
import { signInVerified } from "./test-auth";

const url = process.env.EXPO_PUBLIC_CONVEX_URL;
if (url !== "http://127.0.0.1:3210") throw new Error("Local backend only.");
const client = new ConvexHttpClient(url, { logger: false });
const password = `${crypto.randomUUID()}Aa1!`;
const signed = await signInVerified(client, {
	provider: "password",
	params: {
		flow: "signUp",
		email: `coaching-scale-${crypto.randomUUID()}@example.test`,
		password,
		name: "Scale coach",
	},
});
assert(signed.tokens);
client.setAuth(signed.tokens.token);
const measurements: { label: string; milliseconds: number }[] = [];
const measure = async <T>(
	label: string,
	operation: () => Promise<T>,
): Promise<T> => {
	const started = performance.now();
	const result = await operation();
	measurements.push({
		label,
		milliseconds: Math.round(performance.now() - started),
	});
	return result;
};
const seasonId = "scale-2025-2026";
const draft: EventDraft = {
	title: "Scale practice",
	seasonId,
	date: "2025-09-01",
	start: "19:00",
	end: "20:30",
	venue: "Test pool",
	program: "club",
	kind: "training",
	capacity: 50,
	description: "",
	repeat: "weekly",
	occurrences: 52,
};
const paginationOpts = { cursor: null, numItems: 10 };
type Roster = FunctionReturnType<typeof api.attendance_reports.roster>;
const monthlyPages = async (
	cursor: string | null = null,
): Promise<Roster[]> => {
	const page = await client.query(api.attendance_reports.roster, {
		seasonId,
		month: "2025-09",
		paginationOpts: { ...paginationOpts, cursor },
	});
	return page.isDone
		? [page]
		: [page, ...(await monthlyPages(page.continueCursor))];
};
try {
	await client.mutation(api.club.create, {
		name: "Coaching scale verification",
		samples: false,
	});
	await client.mutation(api.club.apply, {
		action: {
			type: "add-season",
			season: {
				id: seasonId,
				name: "2025–2026",
				start: "2025-09-01",
				end: "2026-08-31",
			},
		},
	});
	for (const index of Array.from({ length: 49 }, (_, index) => index)) {
		await client.mutation(api.club.apply, {
			action: {
				type: "add-member",
				member: {
					id: `scale-${index}`,
					name: `Player ${String(index).padStart(2, "0")}`,
					programs: ["club"],
					position: "",
					rating: 0,
					registration: "approved",
					goal: "",
					steps: 0,
				},
				charge: 0,
			},
		});
	}
	for (const index of Array.from({ length: 9 }, (_, index) => index)) {
		await client.mutation(api.club.apply, {
			action: { type: "create-event", id: `scale-series-${index}`, draft },
		});
	}
	await client.mutation(api.club.apply, {
		action: {
			type: "create-event",
			id: "scale-series-boundary",
			draft: { ...draft, occurrences: 32 },
		},
	});
	await client.mutation(api.club.apply, {
		action: {
			type: "attendance",
			eventId: "scale-series-0-0",
			personId: "scale-0",
			attendance: "present",
		},
	});
	await client.mutation(api.club.apply, {
		action: {
			type: "attendance",
			eventId: "scale-series-1-0",
			personId: "scale-0",
			attendance: "late",
		},
	});
	await client.mutation(api.club.apply, {
		action: {
			type: "attendance",
			eventId: "scale-series-2-0",
			personId: "scale-0",
			attendance: "absent",
		},
	});
	const boundary = await measure("500-practice season / first 3 players", () =>
		client.query(api.attendance_reports.roster, { seasonId, paginationOpts }),
	);
	assert.equal(boundary.limited, false);
	assert.equal(boundary.events.length, 500);
	assert.equal(boundary.page.length, 3);
	const recorded = boundary.page.find((row) => row.id === "scale-0");
	assert(recorded);
	assert.equal(recorded.attended, 67);
	assert.equal(recorded.onTime, 50);
	assert.equal(recorded.recorded, 3);
	const largeComparison = await measure(
		"500-practice comparison / 4-player recoverable limit",
		() =>
			client.query(api.attendance_reports.comparison, {
				seasonId,
				personIds: ["scale-0", "scale-1", "scale-2", "scale-3"],
			}),
	);
	assert.equal(largeComparison.limited, true);
	assert.equal(largeComparison.rows.length, 0);
	await client.mutation(api.club.apply, {
		action: {
			type: "create-event",
			id: "scale-over-limit",
			draft: { ...draft, occurrences: 20 },
		},
	});
	const limited = await measure("520-practice season / recoverable limit", () =>
		client.query(api.attendance_reports.roster, { seasonId, paginationOpts }),
	);
	assert.equal(limited.limited, true);
	assert.equal(limited.page.length, 0);
	const comparisonLimit = await measure(
		"520-practice comparison / recoverable limit",
		() =>
			client.query(api.attendance_reports.comparison, {
				seasonId,
				personIds: ["scale-0", "scale-1"],
			}),
	);
	assert.equal(comparisonLimit.limited, true);
	assert.equal(comparisonLimit.rows.length, 0);
	const monthPages = await measure(
		"September report / all 50 players with pagination",
		() => monthlyPages(),
	);
	assert.equal(monthPages.filter((page) => page.page.length > 0).length, 5);
	assert(monthPages.length <= 6);
	assert.equal(
		new Set(monthPages.flatMap((page) => page.page.map((row) => row.id))).size,
		50,
	);
	assert(
		monthPages.every((page) => !page.limited && page.events.length === 55),
	);
	const monthlyComparison = await measure(
		"September comparison / 4 players",
		() =>
			client.query(api.attendance_reports.comparison, {
				seasonId,
				month: "2025-09",
				personIds: ["scale-0", "scale-1", "scale-2", "scale-3"],
			}),
	);
	assert.equal(monthlyComparison.limited, false);
	assert.equal(monthlyComparison.rows.length, 4);
	assert.equal(monthlyComparison.rows.at(0)?.attended, 67);
	assert.equal(monthlyComparison.rows.at(0)?.onTime, 50);
	const outsideSeasonId = "scale-other-season";
	await client.mutation(api.club.apply, {
		action: {
			type: "add-season",
			season: {
				id: outsideSeasonId,
				name: "Other season",
				start: "2024-09-01",
				end: "2025-08-31",
			},
		},
	});
	await client.mutation(api.club.apply, {
		action: {
			type: "edit-event",
			eventId: "scale-series-0-0",
			scope: "single",
			draft: { ...draft, repeat: "once", seasonId: outsideSeasonId },
		},
	});
	const moved = await client.query(api.attendance_reports.roster, {
		seasonId: outsideSeasonId,
		paginationOpts,
	});
	assert.equal(moved.limited, false);
	assert.equal(moved.events.length, 1);
	assert.equal(moved.events.at(0)?.id, "scale-series-0-0");
	console.log(
		JSON.stringify(
			{
				members: 50,
				completedPractices: 520,
				checks:
					"500 boundary, 520 recoverable limit, monthly reports and comparison, paging, linked season outside dates",
				measurements,
			},
			null,
			2,
		),
	);
} finally {
	await client.action(api.account_actions.deleteAccount, { password });
}
