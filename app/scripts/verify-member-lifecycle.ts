import assert from "node:assert/strict";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";
import { addDays } from "../src/domain/app-rules";
import type { Account, EventDraft } from "../src/domain/app-types";
import { clubDate } from "../src/domain/event-time";
import { lineupPeople, lineupSnapshot } from "../src/domain/lineup";
import { createVerificationRun } from "./verification-fixtures";

const endpoint = process.env.EXPO_PUBLIC_CONVEX_URL;
if (endpoint !== "http://127.0.0.1:3210")
	throw new Error(
		"Archive and energy verification requires the local backend.",
	);
const run = createVerificationRun("archive-energy");
type Actor = { client: ConvexHttpClient; account: Account };

const verify = async (): Promise<void> => {
	const { client: owner } = await run.fixture("Archive verification owner");
	await owner.mutation(api.club.create, {
		name: "Archive and energy verification",
		samples: false,
	});
	const workspace = await owner.query(api.club.current, {});
	assert(workspace);
	const join = async (
		name: string,
		access: { admin?: boolean; coach?: boolean; children?: string[] } = {},
	): Promise<Actor> => {
		const { client } = await run.fixture(name);
		await client.mutation(api.club.requestToJoin, {
			clubCode: workspace.inviteCode,
		});
		const account = (await client.query(api.club.current, {}))?.account;
		assert(account);
		await owner.mutation(api.club.setAccess, {
			accountId: account.id,
			admin: access.admin ?? false,
			coachPrograms: access.coach ? ["club"] : [],
			children: access.children ?? [],
		});
		return { client, account };
	};
	const player = await join("Archive verification player");
	const personId = player.account.personId;
	const guardian = await join("Archive verification guardian", {
		children: [personId],
	});
	const coach = await join("Archive verification assigned coach", {
		coach: true,
	});
	const otherCoach = await join("Archive verification unassigned coach", {
		coach: true,
	});
	const admin = await join("Archive verification administrator", {
		admin: true,
	});
	const otherPlayer = await join("Archive verification unrelated player");
	const { client: outsider } = await run.fixture(
		"Archive verification outsider",
	);
	await outsider.mutation(api.club.create, {
		name: "Other archive verification club",
		samples: false,
	});
	const signedOut = new ConvexHttpClient(endpoint, { logger: false });
	const today = clubDate();
	const future = addDays(today, 7);
	const seasonId = `verification-${crypto.randomUUID()}`;
	await owner.mutation(api.club.apply, {
		action: {
			type: "add-season",
			season: {
				id: seasonId,
				name: "Lifecycle verification season",
				start: addDays(today, -30),
				end: addDays(today, 60),
			},
		},
	});
	const seriesId = `archive-series-${crypto.randomUUID()}`;
	const draft: EventDraft = {
		title: "Archive verification practice",
		date: future,
		start: "19:00",
		end: "20:00",
		venue: "Fictional verification pool",
		program: "club",
		kind: "hockey",
		seasonId,
		repeat: "weekly",
		occurrences: 2,
		committedRoster: true,
		description: "Synthetic local verification only",
	};
	await owner.mutation(api.club.apply, {
		action: { type: "create-event", id: seriesId, draft },
	});
	const eventId = `${seriesId}-0`;
	const pastId = `archive-history-${crypto.randomUUID()}`;
	await owner.mutation(api.club.apply, {
		action: {
			type: "create-event",
			id: pastId,
			draft: {
				...draft,
				date: addDays(today, -7),
				repeat: "once",
				committedRoster: false,
			},
		},
	});
	await owner.mutation(api.club.apply, {
		action: {
			type: "attendance",
			eventId: `${pastId}-0`,
			personId,
			attendance: "present",
		},
	});
	await player.client.mutation(api.session_series.enroll, {
		seriesId,
		personId,
		start: future,
	});
	for (const actor of [{ client: owner, account: workspace.account }, guardian])
		await actor.client.mutation(api.club.apply, {
			action: {
				type: "respond",
				eventId,
				personId: actor.account.personId,
				response: "going",
			},
		});
	await owner.mutation(api.coaching_hours.setCoach, {
		eventId,
		coachId: coach.account.id,
		assigned: true,
	});
	const checkIn = { eventId, personId, energy: 4, note: "Ready for practice" };
	for (const client of [signedOut, outsider])
		await assert.rejects(client.query(api.session_checkins.state, { eventId }));
	for (const client of [
		signedOut,
		outsider,
		coach.client,
		admin.client,
		otherPlayer.client,
	])
		await assert.rejects(client.mutation(api.session_checkins.save, checkIn));
	for (const energy of [0, 6, 1.5, Number.NaN])
		await assert.rejects(
			player.client.mutation(api.session_checkins.save, { ...checkIn, energy }),
		);
	await assert.rejects(
		player.client.mutation(api.session_checkins.save, {
			...checkIn,
			note: "x".repeat(501),
		}),
	);
	await Promise.all([
		player.client.mutation(api.session_checkins.save, checkIn),
		player.client.mutation(api.session_checkins.save, checkIn),
	]);
	for (const client of [player.client, guardian.client, coach.client]) {
		const state = await client.query(api.session_checkins.state, { eventId });
		assert.equal(state.entries.length, 1);
		assert.equal(state.entries.at(0)?.note, checkIn.note);
		assert.equal(state.canReview, client === coach.client);
	}
	for (const client of [
		owner,
		otherCoach.client,
		admin.client,
		otherPlayer.client,
	]) {
		const state = await client.query(api.session_checkins.state, { eventId });
		assert.equal(state.canReview, false);
		assert.equal(state.entries.length, 0);
	}
	await guardian.client.mutation(api.session_checkins.save, {
		...checkIn,
		energy: 2,
		note: "Guardian update",
	});
	const updated = await player.client.query(api.session_checkins.state, {
		eventId,
	});
	assert.equal(updated.entries.length, 1);
	assert.equal(updated.entries.at(0)?.energy, 2);
	for (const client of [
		coach.client,
		admin.client,
		otherPlayer.client,
		outsider,
		signedOut,
	])
		await assert.rejects(
			client.mutation(api.session_checkins.remove, { eventId, personId }),
		);
	await owner.mutation(api.club.setAccess, {
		accountId: guardian.account.id,
		children: [],
		coachPrograms: [],
		admin: false,
	});
	assert.equal(
		(await guardian.client.query(api.session_checkins.state, { eventId }))
			.entries.length,
		0,
	);
	await assert.rejects(
		guardian.client.mutation(api.session_checkins.save, checkIn),
	);
	await owner.mutation(api.club.setAccess, {
		accountId: guardian.account.id,
		children: [personId],
		coachPrograms: [],
		admin: false,
	});
	await owner.mutation(api.club.setAccess, {
		accountId: coach.account.id,
		children: [],
		coachPrograms: [],
		admin: false,
	});
	assert.equal(
		(await coach.client.query(api.session_checkins.state, { eventId })).entries
			.length,
		0,
	);
	await owner.mutation(api.club.setAccess, {
		accountId: coach.account.id,
		children: [],
		coachPrograms: ["club"],
		admin: false,
	});
	const archive = {
		type: "set-member-archived",
		personId,
		archived: true,
	} as const;
	for (const client of [
		player.client,
		guardian.client,
		coach.client,
		outsider,
		signedOut,
	])
		await assert.rejects(client.mutation(api.club.apply, { action: archive }));
	await owner.mutation(api.club.apply, {
		action: { type: "generate-teams", eventId },
	});
	await admin.client.mutation(api.club.apply, { action: archive });
	const archived = await player.client.query(api.club.current, {
		screen: "member",
		id: personId,
	});
	assert(archived);
	assert.equal(archived.account.id, player.account.id);
	assert.equal(
		archived.data.members.find((member) => member.id === personId)?.archived,
		true,
	);
	assert.equal(
		(
			await owner.query(api.pages.members, {
				search: "",
				paginationOpts: { cursor: null, numItems: 40 },
			})
		).page.some((entry) => entry.member.id === personId),
		false,
	);
	assert.equal(
		(
			await owner.query(api.pages.members, {
				search: "",
				archived: true,
				paginationOpts: { cursor: null, numItems: 40 },
			})
		).page.some((entry) => entry.member.id === personId),
		true,
	);
	assert.equal(
		(
			await player.client.query(api.pages.members, {
				search: "",
				archived: true,
				paginationOpts: { cursor: null, numItems: 40 },
			})
		).page.length,
		0,
	);
	const history = await owner.query(api.club.current, {
		screen: "session",
		id: `${pastId}-0`,
	});
	assert.equal(
		history?.data.responses.find((entry) => entry.personId === personId)
			?.attendance,
		"present",
	);
	const series = await owner.query(api.session_series.detail, { seriesId });
	assert.equal(
		series.series.enrollments.find((entry) => entry.personId === personId)?.end,
		future,
	);
	const session = await owner.query(api.club.current, {
		screen: "session",
		id: eventId,
	});
	assert.equal(
		session?.data.responses.find((entry) => entry.personId === personId)
			?.seriesExpected,
		undefined,
	);
	assert.notEqual(
		session?.data.responses.find((entry) => entry.personId === personId)
			?.response,
		"going",
	);
	await assert.rejects(
		player.client.mutation(api.club.apply, {
			action: { type: "respond", eventId, personId, response: "going" },
		}),
	);
	await assert.rejects(
		player.client.mutation(api.session_series.enroll, {
			seriesId,
			personId,
			start: future,
		}),
	);
	await assert.rejects(
		player.client.mutation(api.session_checkins.save, checkIn),
	);
	assert.equal(
		(await player.client.query(api.session_checkins.state, { eventId })).entries
			.length,
		1,
	);
	await guardian.client.mutation(api.session_checkins.remove, {
		eventId,
		personId,
	});
	assert.equal(
		(await coach.client.query(api.session_checkins.state, { eventId })).entries
			.length,
		0,
	);
	await owner.mutation(api.club.apply, {
		action: { type: "generate-teams", eventId },
	});
	const teams = (
		await owner.query(api.club.current, { screen: "session", id: eventId })
	)?.data.teams.at(0);
	assert(teams);
	assert(!lineupPeople(lineupSnapshot(teams)).includes(personId));
	await owner.mutation(api.club.apply, {
		action: { ...archive, archived: false },
	});
	const restored = await player.client.query(api.club.current, {
		screen: "member",
		id: personId,
	});
	assert.equal(
		restored?.data.members.find((member) => member.id === personId)?.archived,
		false,
	);
	assert.equal(
		(
			await owner.query(api.session_series.detail, { seriesId })
		).series.enrollments.find((entry) => entry.personId === personId)?.end,
		future,
	);
	await player.client.mutation(api.session_series.enroll, {
		seriesId,
		personId,
		start: future,
	});
	await player.client.mutation(api.session_checkins.save, checkIn);
	assert.equal(
		(await coach.client.query(api.session_checkins.state, { eventId })).entries
			.length,
		1,
	);
	console.log(
		"Archive and energy checks passed: admin-only archive/restore, authoritative directory filters, retained identity/history/access, ended commitments, archived RSVP/lineup/check-in guards, explicit re-enrollment, private self/guardian/assigned-coach scopes, revoked access, bounded validation and atomic upserts.",
	);
};

const result = (await Promise.allSettled([verify()])).at(0);
const cleanup = (await Promise.allSettled([run.close()])).at(0);
if (result?.status === "rejected" && cleanup?.status === "rejected")
	throw new AggregateError(
		[result.reason, cleanup.reason],
		"Verification failed and synthetic fixture cleanup also failed.",
	);
if (result?.status === "rejected") throw result.reason;
if (cleanup?.status === "rejected") throw cleanup.reason;
