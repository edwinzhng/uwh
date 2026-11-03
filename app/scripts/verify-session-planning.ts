import assert from "node:assert/strict";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";
import { addDays } from "../src/domain/app-rules";
import type { EventDraft, TeamPlan } from "../src/domain/app-types";
import { clubDate } from "../src/domain/event-time";
import {
	editLineup,
	lineupPeople,
	lineupSnapshot,
	planWithSnapshot,
} from "../src/domain/lineup";
import type { SessionPlanCommand } from "../src/domain/session-plan";
import { createVerificationRun } from "./verification-fixtures";

const endpoint = process.env.EXPO_PUBLIC_CONVEX_URL;
if (endpoint !== "http://127.0.0.1:3210")
	throw new Error(
		"Session-planning verification requires the isolated local backend.",
	);
const run = createVerificationRun("session-planning");
const planFor = async (
	client: ConvexHttpClient,
	eventId: string,
): Promise<TeamPlan> => {
	const workspace = await client.query(api.club.current, {
		screen: "session",
		id: eventId,
	});
	const plan = workspace?.data.teams.find(
		(entry) => entry.eventId === eventId && entry.partId === "hockey",
	);
	assert(plan);
	return plan;
};
const verify = async (): Promise<void> => {
	const { client: owner } = await run.fixture("Session planning coach");
	await owner.mutation(api.club.create, {
		name: "Session planning verification",
		samples: false,
	});
	const workspace = await owner.query(api.club.current, {});
	assert(workspace);
	const join = async (
		name: string,
		coach: boolean,
	): Promise<ConvexHttpClient> => {
		const { client } = await run.fixture(name);
		await client.mutation(api.club.requestToJoin, {
			clubCode: workspace.inviteCode,
		});
		const account = (await client.query(api.club.current, {}))?.account;
		assert(account);
		await owner.mutation(api.club.setAccess, {
			accountId: account.id,
			children: [],
			coachPrograms: coach ? ["club"] : [],
			admin: !coach,
		});
		return client;
	};
	const peer = await join("Session planning second coach", true);
	const viewer = await join("Session planning admin without coaching", false);
	const viewerAccount = (await viewer.query(api.club.current, {}))?.account;
	assert(viewerAccount);
	const { client: outsider } = await run.fixture("Session planning other club");
	await outsider.mutation(api.club.create, {
		name: "Other planning club",
		samples: false,
	});
	const signedOut = new ConvexHttpClient(endpoint, { logger: false });
	const people = Array.from(
		{ length: 9 },
		(_, index) => `planning-player-${index}`,
	);
	for (const [index, personId] of people.entries())
		await owner.mutation(api.club.apply, {
			action: {
				type: "add-member",
				charge: 0,
				member: {
					id: personId,
					name: `Planning player ${index}`,
					programs: ["club"],
					position: "Forward",
					rating: 50,
					registration: "approved",
					goal: "",
					steps: 0,
				},
			},
		});
	await owner.mutation(api.club.setAccess, {
		accountId: workspace.account.id,
		children: people,
		coachPrograms: ["club"],
		admin: true,
	});
	const today = clubDate();
	const seasonId = `planning-season-${crypto.randomUUID()}`;
	await owner.mutation(api.club.apply, {
		action: {
			type: "add-season",
			season: {
				id: seasonId,
				name: "Planning verification",
				start: today,
				end: addDays(today, 60),
			},
		},
	});
	const draft: EventDraft = {
		title: "Session planning verification",
		date: addDays(today, 1),
		start: "19:00",
		end: "20:00",
		venue: "Fictional verification pool",
		kind: "hockey",
		program: "club",
		seasonId,
		repeat: "once",
		description: "Synthetic local verification",
		parts: [
			{
				id: "training",
				title: "Training",
				kind: "training",
				start: "19:00",
				end: "19:30",
			},
			{
				id: "hockey",
				title: "Hockey",
				kind: "hockey",
				start: "19:30",
				end: "20:00",
			},
		],
	};
	const sourceKey = `planning-source-${crypto.randomUUID()}`;
	const targetKey = `planning-target-${crypto.randomUUID()}`;
	const sourceId = `${sourceKey}-0`;
	const targetId = `${targetKey}-0`;
	await owner.mutation(api.club.apply, {
		action: { type: "create-event", id: sourceKey, draft },
	});
	await owner.mutation(api.club.apply, {
		action: {
			type: "create-event",
			id: targetKey,
			draft: { ...draft, date: addDays(today, 8) },
		},
	});
	for (const personId of people.slice(0, 8))
		await owner.mutation(api.club.apply, {
			action: {
				type: "respond",
				eventId: sourceId,
				personId,
				response: "going",
			},
		});
	for (const personId of people.slice(1))
		await owner.mutation(api.club.apply, {
			action: {
				type: "respond",
				eventId: targetId,
				personId,
				response: "going",
			},
		});
	await owner.mutation(api.club.apply, {
		action: {
			type: "generate-teams",
			eventId: sourceId,
			partId: "hockey",
			separateYouth: false,
			expectedRevision: 0,
		},
	});
	const generated = await planFor(owner, sourceId);
	const first = generated.black.at(0);
	const second = generated.white.at(0);
	assert(first && second);
	const snapshot = lineupSnapshot(generated);
	const destination = snapshot.fieldSlots?.find(
		(entry) => entry.personId === second,
	)?.slot;
	assert(destination !== undefined);
	const positioned = editLineup(generated, snapshot, {
		kind: "place",
		personId: first,
		side: "white",
		slot: destination,
	});
	const referees = editLineup(generated, positioned, {
		kind: "referee",
		side: "black",
		personId: viewerAccount.personId,
	});
	await owner.mutation(api.club.apply, {
		action: {
			type: "save-lineup",
			eventId: sourceId,
			partId: "hockey",
			expectedRevision: generated.revision ?? 0,
			snapshot: referees,
		},
	});
	const edited = await planFor(owner, sourceId);
	assert.deepEqual(
		edited.fieldSlots,
		planWithSnapshot(generated, referees).fieldSlots,
	);
	assert.equal(edited.referees?.at(0)?.personId, viewerAccount.personId);
	assert.equal(new Set(lineupPeople(lineupSnapshot(edited))).size, 8);
	await owner.mutation(api.club.apply, {
		action: {
			type: "publish-teams",
			eventId: sourceId,
			partId: "hockey",
			expectedRevision: edited.revision ?? 0,
		},
	});
	const published = await planFor(owner, sourceId);
	assert.deepEqual(
		(await planFor(viewer, sourceId)).fieldSlots,
		published.fieldSlots,
	);
	assert.equal((await planFor(viewer, sourceId)).referees?.length, 1);
	const archived = people.at(1);
	assert(archived);
	await owner.mutation(api.club.apply, {
		action: { type: "set-member-archived", personId: archived, archived: true },
	});
	const sourceList = await owner.query(api.lineup.sources, {
		eventId: targetId,
		partId: "hockey",
		paginationOpts: { cursor: null, numItems: 1000 },
	});
	assert(
		sourceList.page.some(
			(entry) => entry.eventId === sourceId && entry.partId === "hockey",
		),
	);
	for (const client of [viewer, outsider, signedOut])
		await assert.rejects(
			client.query(api.lineup.sources, {
				eventId: targetId,
				partId: "hockey",
				paginationOpts: { cursor: null, numItems: 20 },
			}),
		);
	const carry = {
		type: "carry-lineup",
		eventId: targetId,
		partId: "hockey",
		sourceEventId: sourceId,
		sourcePartId: "hockey",
		expectedRevision: 0,
		expectedSourceRevision: published.revision ?? 0,
	} as const;
	await assert.rejects(viewer.mutation(api.club.apply, { action: carry }));
	await assert.rejects(
		owner.mutation(api.club.apply, {
			action: { ...carry, expectedSourceRevision: 0 },
		}),
	);
	await assert.rejects(
		owner.mutation(api.club.apply, {
			action: { ...carry, sourcePartId: "training" },
		}),
	);
	const copies = await Promise.allSettled([
		owner.mutation(api.club.apply, { action: carry }),
		peer.mutation(api.club.apply, { action: carry }),
	]);
	assert.equal(
		copies.filter((result) => result.status === "fulfilled").length,
		1,
	);
	const carried = await planFor(owner, targetId);
	assert.equal(carried.published, false);
	assert.equal(carried.revision, 1);
	assert(!lineupPeople(lineupSnapshot(carried)).includes(people.at(0) ?? ""));
	assert(!lineupPeople(lineupSnapshot(carried)).includes(archived));
	assert(lineupPeople(lineupSnapshot(carried)).includes(people.at(-1) ?? ""));
	assert.deepEqual(await planFor(owner, sourceId), published);
	await assert.rejects(owner.mutation(api.club.apply, { action: carry }));

	const resourceId = await owner.mutation(api.resources.save, {
		title: "Planning drill reference",
		description: "Synthetic drill reference",
		kind: "document",
		category: "drills",
		audience: "coaches",
		personIds: [],
		url: "https://example.test/drill.pdf",
		key: crypto.randomUUID(),
		revision: 0,
	});
	const foreignResource = await outsider.mutation(api.resources.save, {
		title: "Other club drill",
		description: "Foreign private fixture",
		kind: "document",
		category: "drills",
		audience: "coaches",
		personIds: [],
		url: "https://example.test/private.pdf",
		key: crypto.randomUUID(),
		revision: 0,
	});
	const command: SessionPlanCommand = {
		eventId: targetId,
		partId: "training",
		requestId: crypto.randomUUID(),
		revision: 0,
		body: "Support the receiver\nPassing lanes: pass and move into support.\nThree on two: find an open teammate.",
		notes: "Keep partner rotations short",
		media: [
			{
				id: "resource",
				label: "Planning reference",
				source: "resource",
				resourceId,
			},
			{
				id: "video",
				label: "Secure demonstration",
				source: "link",
				url: "https://youtu.be/dQw4w9WgXcQ",
			},
		],
	};
	for (const client of [viewer, outsider, signedOut]) {
		await assert.rejects(
			client.query(api.session_plans.state, {
				eventId: targetId,
				partId: "training",
			}),
		);
		await assert.rejects(client.mutation(api.session_plans.save, command));
	}
	await assert.rejects(
		owner.mutation(api.session_plans.save, {
			...command,
			media: [
				{
					id: "foreign",
					label: "Foreign",
					source: "resource",
					resourceId: foreignResource,
				},
			],
		}),
	);
	await Promise.all([
		owner.mutation(api.session_plans.save, command),
		owner.mutation(api.session_plans.save, command),
	]);
	const saved = await peer.query(api.session_plans.state, {
		eventId: targetId,
		partId: "training",
	});
	assert.equal(saved.revision, 1);
	assert.equal(saved.body, command.body);
	assert.equal(saved.media.length, 2);
	assert.equal(
		(
			await owner.query(api.session_plans.state, {
				eventId: targetId,
				partId: "hockey",
			})
		).revision,
		0,
	);
	await assert.rejects(
		owner.mutation(api.session_plans.save, {
			...command,
			notes: "Changed payload, same request",
		}),
	);
	await assert.rejects(
		owner.mutation(api.session_plans.save, { ...command, partId: "hockey" }),
	);
	await assert.rejects(
		peer.mutation(api.session_plans.save, {
			...command,
			requestId: crypto.randomUUID(),
		}),
	);
	const updates = await Promise.allSettled([
		owner.mutation(api.session_plans.save, {
			...command,
			revision: 1,
			requestId: crypto.randomUUID(),
			notes: "Owner update",
		}),
		peer.mutation(api.session_plans.save, {
			...command,
			revision: 1,
			requestId: crypto.randomUUID(),
			notes: "Peer update",
		}),
	]);
	assert.equal(
		updates.filter((result) => result.status === "fulfilled").length,
		1,
	);
	const latest = await owner.query(api.session_plans.state, {
		eventId: targetId,
		partId: "training",
	});
	assert.equal(latest.revision, 2);
	await owner.mutation(api.session_plans.save, command);
	assert.deepEqual(
		await owner.query(api.session_plans.state, {
			eventId: targetId,
			partId: "training",
		}),
		latest,
	);
	await assert.rejects(
		owner.mutation(api.session_plans.save, {
			...command,
			revision: 2,
			requestId: crypto.randomUUID(),
			media: [
				{
					id: "unsafe",
					label: "Unsafe",
					source: "link",
					url: "javascript:alert(1)",
				},
			],
		}),
	);
	await owner.mutation(api.club.apply, {
		action: { type: "cancel-event", eventId: targetId },
	});
	await assert.rejects(
		owner.mutation(api.session_plans.save, {
			...command,
			revision: 2,
			requestId: crypto.randomUUID(),
		}),
	);
	assert.equal(
		(
			await peer.query(api.session_plans.state, {
				eventId: targetId,
				partId: "training",
			})
		).revision,
		2,
	);
	console.log(
		"Session-planning checks passed: exact pool spots, dual-role referee persistence/publication, protected carry-forward with current eligibility and concurrency, unchanged source, coach-only freeform plans, private notes, protected resource references, ordered media, part/club isolation, canonical retry keys, stale/concurrent saves and cancelled-session guards.",
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
