import assert from "node:assert/strict";
import { ConvexHttpClient } from "convex/browser";
import ICAL from "ical.js";
import { api } from "../convex/_generated/api";
import type { ImportInput } from "../convex/import_plan";
import { signInVerified } from "./test-auth";

const url = process.env.EXPO_PUBLIC_CONVEX_URL;
if (url !== "http://127.0.0.1:3210") throw new Error("Local backend only.");
const fixtures: { client: ConvexHttpClient; password: string }[] = [];
const fixture = async (name: string): Promise<ConvexHttpClient> => {
	const client = new ConvexHttpClient(url, { logger: false });
	const password = `${crypto.randomUUID()}Aa1!`;
	const result = await signInVerified(client, {
		provider: "password",
		params: {
			flow: "signUp",
			email: `product-${crypto.randomUUID()}@example.test`,
			password,
			name,
		},
	});
	assert(result.tokens);
	client.setAuth(result.tokens.token);
	fixtures.push({ client, password });
	return client;
};
try {
	const owner = await fixture("Product owner");
	const clubId = await owner.mutation(api.club.create, {
		name: "Product test club",
		samples: true,
	});
	const outsider = await fixture("Outside admin");
	await outsider.mutation(api.club.create, {
		name: "Other product club",
		samples: false,
	});
	const player = await fixture("Player parent");
	await player.mutation(api.club.requestToJoin, { clubCode: clubId });
	const workspace = await owner.query(api.club.current, { screen: "settings" });
	const request = workspace?.requests.at(0);
	assert(request);
	await owner.mutation(api.club.approveRequest, {
		requestId: request.id,
		personId: "jamie",
		children: ["sam"],
		coachPrograms: ["club"],
		admin: false,
	});
	const seasonId = "next-season";
	await owner.mutation(api.club.apply, {
		action: {
			type: "add-season",
			season: {
				id: seasonId,
				name: "2027–2028",
				start: "2027-09-01",
				end: "2028-08-31",
			},
		},
	});
	const old = await owner.query(api.season_records.record, {
		personId: "sam",
		seasonId: "2026-2027",
	});
	const blank = await owner.query(api.season_records.record, {
		personId: "sam",
		seasonId,
	});
	assert.equal(blank.paid, 0);
	assert.equal(blank.due, 0);
	assert.equal(blank.registration, "missing");
	const dues = {
		personId: "sam",
		seasonId,
		key: crypto.randomUUID(),
		revision: 0,
		change: {
			kind: "dues" as const,
			amount: 20000,
			note: "Season fee",
			date: "2027-09-01",
		},
	};
	await owner.mutation(api.season_records.change, dues);
	await owner.mutation(api.season_records.change, dues);
	await assert.rejects(
		owner.mutation(api.season_records.change, {
			...dues,
			key: crypto.randomUUID(),
		}),
	);
	await assert.rejects(
		player.mutation(api.season_records.change, {
			...dues,
			key: crypto.randomUUID(),
			revision: 1,
		}),
	);
	const key = crypto.randomUUID();
	await owner.mutation(api.season_records.change, {
		personId: "sam",
		seasonId,
		key,
		revision: 1,
		change: {
			kind: "payment",
			amount: 15000,
			note: "Transfer",
			date: "2027-09-01",
		},
	});
	await owner.mutation(api.season_records.change, {
		personId: "sam",
		seasonId,
		key,
		revision: 1,
		change: {
			kind: "payment",
			amount: 15000,
			note: "Transfer",
			date: "2027-09-01",
		},
	});
	await assert.rejects(
		owner.mutation(api.season_records.change, {
			personId: "sam",
			seasonId,
			key: crypto.randomUUID(),
			revision: 2,
			change: {
				kind: "payment",
				amount: 5001,
				note: "Overpay",
				date: "2027-09-01",
			},
		}),
	);
	await owner.mutation(api.season_records.change, {
		personId: "sam",
		seasonId,
		key: crypto.randomUUID(),
		revision: 2,
		change: {
			kind: "refund",
			amount: 3000,
			note: "Correction",
			date: "2027-09-02",
		},
	});
	await owner.mutation(api.season_records.change, {
		personId: "sam",
		seasonId,
		key: crypto.randomUUID(),
		revision: 3,
		change: { kind: "registration", status: "approved", cuga: true },
	});
	const record = await player.query(api.season_records.record, {
		personId: "sam",
		seasonId,
	});
	assert.equal(record.paid, 12000);
	assert.equal(record.cuga, true);
	assert.deepEqual(
		await owner.query(api.season_records.record, {
			personId: "sam",
			seasonId: "2026-2027",
		}),
		old,
	);
	await assert.rejects(
		player.query(api.season_records.record, { personId: "mila", seasonId }),
	);
	await assert.rejects(
		player.query(api.season_records.summary, { seasonId, personIds: ["mila"] }),
	);
	const history = await player.query(api.season_records.history, {
		personId: "sam",
		seasonId,
		paginationOpts: { cursor: null, numItems: 30 },
	});
	assert.equal(history.page.length, 4);
	const source = `test-${crypto.randomUUID()}`;
	const input: ImportInput = {
		source,
		kind: "members",
		seasonId,
		rows: [{ source_id: "one", name: "Imported Person" }],
	};
	const preview = await owner.query(api.imports.preview, input);
	assert.equal(preview.plans.at(0)?.status, "create");
	await assert.rejects(player.query(api.imports.preview, input));
	const commit = {
		...input,
		expected: preview.signature,
		key: crypto.randomUUID(),
	};
	const [a, b] = await Promise.all([
		owner.mutation(api.imports.commit, commit),
		owner.mutation(api.imports.commit, commit),
	]);
	assert.deepEqual(a, b);
	assert.equal(a.created, 1);
	assert.equal(
		(await owner.query(api.imports.preview, input)).plans.at(0)?.status,
		"skip",
	);
	assert.equal(
		(
			await owner.query(api.imports.preview, {
				...input,
				rows: [{ source_id: "one", name: "Changed Person" }],
			})
		).plans.at(0)?.status,
		"error",
	);
	const stale: ImportInput = {
		...input,
		rows: [{ source_id: "two", name: "Concurrent Person" }],
	};
	const stalePreview = await owner.query(api.imports.preview, stale);
	await owner.mutation(api.club.apply, {
		action: {
			type: "add-member",
			member: {
				id: "concurrent",
				name: "Concurrent Person",
				programs: ["club"],
				position: "",
				rating: 3,
				registration: "missing",
				goal: "",
				steps: 0,
			},
			charge: 0,
		},
	});
	await assert.rejects(
		owner.mutation(api.imports.commit, {
			...stale,
			expected: stalePreview.signature,
			key: crypto.randomUUID(),
		}),
	);
	const importRows = async (input: ImportInput): Promise<void> => {
		const preview = await owner.query(api.imports.preview, input);
		assert.equal(
			preview.plans.filter((plan) => plan.status === "error").length,
			0,
			JSON.stringify(preview.plans),
		);
		await owner.mutation(api.imports.commit, {
			...input,
			key: crypto.randomUUID(),
			expected: preview.signature,
		});
	};
	await importRows({
		...input,
		kind: "registration",
		rows: [
			{
				source_id: "registration-one",
				member_id: "one",
				status: "approved",
				cuga: "yes",
				dues: "150",
			},
		],
	});
	await importRows({
		...input,
		kind: "payments",
		rows: [
			{
				source_id: "payment-one",
				member_id: "one",
				amount: "100",
				note: "Old transfer",
				date: "2027-09-01",
			},
		],
	});
	const imported = await owner.query(api.season_records.record, {
		personId: `import:${source}:one`,
		seasonId,
	});
	assert.equal(imported.due, 15000);
	assert.equal(imported.paid, 10000);
	const paymentBatches = [0, 1].map((batch) => ({
		...input,
		kind: "payments" as const,
		rows: Array.from({ length: 15 }, (_, index) => ({
			source_id: `batch-${batch}-${index}`,
			member_id: "one",
			amount: "1",
			note: "Historic transfer",
			date: "2027-09-01",
		})),
	}));
	const previews = await Promise.all(
		paymentBatches.map((batch) => owner.query(api.imports.preview, batch)),
	);
	for (const [index, batch] of paymentBatches.entries()) {
		const preview = previews.at(index);
		assert(preview);
		await owner.mutation(api.imports.commit, {
			...batch,
			expected: preview.signature,
			key: crypto.randomUUID(),
		});
	}
	assert.equal(
		(
			await owner.query(api.season_records.record, {
				personId: `import:${source}:one`,
				seasonId,
			})
		).paid,
		13000,
	);
	const eventRows = {
		...input,
		kind: "events" as const,
		rows: [
			{
				source_id: "event-one",
				title: "Imported practice",
				date: "2027-10-05",
				start: "19:00",
				end: "20:00",
				venue: "Pool",
			},
		],
	};
	await importRows(eventRows);
	await importRows({
		...input,
		kind: "attendance",
		rows: [
			{
				source_id: "attendance-one",
				member_id: "one",
				event_id: "event-one",
				response: "going",
				attendance: "present",
			},
		],
	});
	const overwrite = await owner.query(api.imports.preview, {
		...input,
		kind: "attendance",
		rows: [
			{
				source_id: "attendance-two",
				member_id: "one",
				event_id: "event-one",
				response: "going",
				attendance: "late",
			},
		],
	});
	assert.equal(overwrite.plans.at(0)?.status, "error");
	const outsiderAttempt = await outsider.query(api.imports.preview, {
		...input,
		seasonId: "2026-2027",
		kind: "payments",
		rows: [
			{
				source_id: "steal",
				member_id: `import:${source}:one`,
				amount: "1",
				note: "Wrong club",
				date: "2027-09-01",
			},
		],
	});
	assert.equal(outsiderAttempt.plans.at(0)?.status, "error");
	const slug = `test-${crypto.randomUUID()}`;
	await owner.mutation(api.public_schedule.configure, { slug, enabled: true });
	await assert.rejects(
		outsider.mutation(api.public_schedule.configure, { slug, enabled: true }),
	);
	await assert.rejects(
		player.mutation(api.public_schedule.configure, {
			slug: "no-access",
			enabled: true,
		}),
	);
	const seriesDraft = {
		seasonId,
		title: "Public practice",
		date: "2027-10-05",
		start: "19:00",
		end: "20:00",
		venue: "Public pool",
		program: "club",
		kind: "training" as const,
		capacity: 24,
		repeat: "weekly" as const,
		occurrences: 4,
		description: "Private staff text",
		eligiblePersonIds: ["sam"],
		public: true,
	};
	await owner.mutation(api.club.apply, {
		action: { type: "create-event", id: "public-series", draft: seriesDraft },
	});
	const anon = new ConvexHttpClient(url, { logger: false });
	const calendarArgs = {
		slug,
		from: "2027-10-01",
		to: "2027-10-31",
		paginationOpts: { cursor: null, numItems: 30 },
	};
	const publicEvents = await anon.query(
		api.public_schedule.events,
		calendarArgs,
	);
	assert.equal(publicEvents.page.length, 4);
	const feedUrl = `http://127.0.0.1:3211/public-calendar.ics?club=${slug}`;
	const feed = await fetch(feedUrl);
	assert.equal(feed.status, 200);
	const feedText = await feed.text();
	const feedEvents = new ICAL.Component(
		ICAL.parse(feedText),
	).getAllSubcomponents("vevent");
	assert.equal(feedEvents.length, 4);
	assert(!feedText.includes("Private staff"));
	assert(feedText.includes("CLASS:PUBLIC"));
	assert(!JSON.stringify(publicEvents).includes("Private staff"));
	assert(!JSON.stringify(publicEvents).includes("eligiblePersonIds"));
	assert(!JSON.stringify(publicEvents).includes("Imported practice"));
	assert.equal(
		(await anon.query(api.public_schedule.info, { slug }))?.name,
		"Product test club",
	);
	await assert.rejects(
		anon.query(api.season_records.record, { personId: "sam", seasonId }),
	);
	const edit = {
		type: "edit-event" as const,
		eventId: "public-series-1",
		scope: "following" as const,
		editId: "first-split",
		draft: {
			...seriesDraft,
			date: "2027-10-12",
			repeat: "fortnightly" as const,
			occurrences: 2,
			rebuild: true,
		},
	};
	await owner.mutation(api.club.apply, { action: edit });
	await owner.mutation(api.club.apply, { action: edit });
	const edited = await owner.query(api.club.current, {
		screen: "session",
		id: "public-series-1",
	});
	assert(
		edited?.data.events.some(
			(event) =>
				event.id === "public-series-1" && event.seriesId !== "public-series",
		),
	);
	const publicAfter = await anon.query(
		api.public_schedule.events,
		calendarArgs,
	);
	assert(publicAfter.page.some((event) => event.cancelled));
	const changedFeed = await (await fetch(feedUrl)).text();
	assert(changedFeed.includes("STATUS:CANCELLED"));
	const changedEntries = new ICAL.Component(
		ICAL.parse(changedFeed),
	).getAllSubcomponents("vevent");
	assert.equal(changedEntries.length, 4);
	assert.deepEqual(
		new Set(changedEntries.map((entry) => entry.getFirstPropertyValue("uid"))),
		new Set(feedEvents.map((entry) => entry.getFirstPropertyValue("uid"))),
	);
	assert.equal(await (await fetch(feedUrl)).text(), changedFeed);
	await owner.mutation(api.public_schedule.configure, { slug, enabled: false });
	assert.equal((await fetch(feedUrl)).status, 404);
	assert.equal(await anon.query(api.public_schedule.info, { slug }), null);
	assert.equal(
		(await anon.query(api.public_schedule.events, calendarArgs)).page.length,
		0,
	);
	console.log(
		"Product checks passed: season isolation, guardian privacy, ledger retries/refunds, stale-write protection, CSV migration, duplicate/overwrite protection, club isolation, public projection and recurring-series splitting.",
	);
} finally {
	for (const entry of fixtures.toReversed())
		await entry.client.action(api.account_actions.deleteAccount, {
			password: entry.password,
		});
}
