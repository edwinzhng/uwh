import assert from "node:assert/strict";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";
import { signInVerified } from "./test-auth";

const url = process.env.EXPO_PUBLIC_CONVEX_URL;
if (url !== "http://127.0.0.1:3210") throw new Error("Local backend only.");
const fixtures: { client: ConvexHttpClient; password: string }[] = [];
const fixture = async (name: string): Promise<ConvexHttpClient> => {
	const client = new ConvexHttpClient(url, { logger: false });
	const password = `${crypto.randomUUID()}Aa1!`;
	const signed = await signInVerified(client, {
		provider: "password",
		params: {
			flow: "signUp",
			email: `report-${crypto.randomUUID()}@example.test`,
			password,
			name,
		},
	});
	assert(signed.tokens);
	client.setAuth(signed.tokens.token);
	fixtures.push({ client, password });
	return client;
};
try {
	const owner = await fixture("Report coach");
	const clubId = await owner.mutation(api.club.create, {
		name: "Report test",
		samples: true,
	});
	const player = await fixture("Report parent");
	await player.mutation(api.club.requestToJoin, { clubCode: clubId });
	const state = await owner.query(api.club.current, { screen: "settings" });
	const request = state?.requests.at(0);
	assert(request);
	assert(state);
	await owner.mutation(api.club.approveRequest, {
		requestId: request.id,
		personId: "jamie",
		children: ["sam"],
		coachPrograms: [],
		admin: false,
	});
	const external = await fixture("Foreign coach");
	await external.mutation(api.club.create, {
		name: "Foreign report",
		samples: true,
	});
	await owner.mutation(api.club.apply, {
		action: {
			type: "create-event",
			id: "report-event",
			draft: {
				title: "Report practice",
				date: "2026-09-01",
				start: "18:00",
				end: "19:00",
				venue: "Pool",
				program: "club",
				kind: "training",
				capacity: 50,
				repeat: "once",
				description: "",
				seasonId: "2026-2027",
			},
		},
	});
	const eventId = "report-event-0";
	await owner.mutation(api.club.apply, {
		action: {
			type: "attendance",
			eventId,
			personId: "sam",
			attendance: "late",
		},
	});
	await owner.mutation(api.attendance_reports.setFlag, {
		eventId,
		personId: "sam",
		kind: "addition",
	});
	await owner.mutation(api.attendance_reports.setFlag, {
		eventId,
		personId: "sam",
		kind: "addition",
	});
	assert.equal(
		(await owner.query(api.attendance_reports.eventFlags, { eventId })).length,
		1,
	);
	const args = {
		seasonId: "2026-2027",
		month: "2026-09",
		search: "Sam",
		paginationOpts: { cursor: null, numItems: 10 },
	};
	const timings: number[] = [];
	for (const _ of [1, 2, 3]) {
		const start = performance.now();
		const report = await owner.query(api.attendance_reports.roster, args);
		timings.push(Math.round(performance.now() - start));
		const row = report.page.find((entry) => entry.id === "sam");
		assert(row);
		assert.equal(row.attended, 100);
		assert.equal(row.onTime, 0);
		assert.equal(row.additions, 1);
	}
	const compare = await owner.query(api.attendance_reports.comparison, {
		seasonId: "2026-2027",
		personIds: ["sam", "mila"],
	});
	assert.equal(compare.rows.length, 2);
	assert.equal(compare.rows.at(0)?.points.at(0)?.value, 100);
	await assert.rejects(player.query(api.attendance_reports.roster, args));
	await assert.rejects(
		player.query(api.attendance_reports.eventFlags, { eventId }),
	);
	await assert.rejects(
		player.mutation(api.attendance_reports.setFlag, {
			eventId,
			personId: "sam",
			kind: "cancellation",
		}),
	);
	await assert.rejects(
		external.mutation(api.attendance_reports.setFlag, {
			eventId,
			personId: "sam",
			kind: "addition",
		}),
	);
	await assert.rejects(
		owner.query(api.attendance_reports.comparison, {
			seasonId: "2026-2027",
			personIds: ["jamie", "sam", "mila", "alex", "riley"],
		}),
	);
	await owner.mutation(api.attendance_reports.setFlag, {
		eventId,
		personId: "sam",
	});
	assert.equal(
		(await owner.query(api.attendance_reports.eventFlags, { eventId })).length,
		0,
	);
	await owner.mutation(api.club.setAccess, {
		accountId: state.account.id,
		children: [],
		coachPrograms: [],
		admin: true,
	});
	await assert.rejects(owner.query(api.attendance_reports.roster, args));
	console.log(
		`Attendance reports verified: recorded denominators, flags, comparisons, pagination and coach/club boundaries. Local query timings ${timings.join("/")}ms.`,
	);
} finally {
	for (const entry of fixtures.toReversed())
		await entry.client.action(api.account_actions.deleteAccount, {
			password: entry.password,
		});
}
