import assert from "node:assert/strict";
import { api } from "../convex/_generated/api";
import { addDays } from "../src/domain/app-rules";
import type { EventDraft, Member } from "../src/domain/app-types";
import { clubDate } from "../src/domain/event-time";
import {
	createVerificationRun,
	type VerificationFixture,
} from "./verification-fixtures";

const run = createVerificationRun("session-performance");
try {
	const owner = await run.fixture("Session performance coach");
	await owner.client.mutation(api.club.create, {
		name: "Session performance verification",
		samples: false,
	});
	const workspace = await owner.client.query(api.club.current, {});
	assert(workspace);
	const join = async (name: string): Promise<VerificationFixture> => {
		const fixture = await run.fixture(name);
		await fixture.client.mutation(api.club.requestToJoin, {
			clubCode: workspace.inviteCode,
		});
		return fixture;
	};
	const player = await join("Performance player");
	const guardian = await join("Performance guardian");
	const peer = await join("Other performance coach");
	const admin = await join("Unrelated performance admin");
	const outside = await run.fixture("Other performance club");
	await outside.client.mutation(api.club.create, {
		name: "Other performance verification",
		samples: false,
	});
	const [playerWorkspace, guardianWorkspace, peerWorkspace, adminWorkspace] =
		await Promise.all(
			[player, guardian, peer, admin].map((actor) =>
				actor.client.query(api.club.current, {}),
			),
		);
	assert(
		playerWorkspace && guardianWorkspace && peerWorkspace && adminWorkspace,
	);
	const personId = playerWorkspace.account.personId;
	const access = async (
		accountId: string,
		children: string[],
		coach = false,
		administrator = false,
	): Promise<void> => {
		await owner.client.mutation(api.club.setAccess, {
			accountId,
			children,
			coachPrograms: coach ? ["club"] : [],
			admin: administrator,
		});
	};
	await access(guardianWorkspace.account.id, [personId]);
	await access(peerWorkspace.account.id, [], true);
	await access(adminWorkspace.account.id, [], false, true);
	const draft: EventDraft = {
		title: "Performance practice",
		date: addDays(clubDate(), 1),
		start: "19:00",
		end: "20:00",
		venue: "Fictional rating pool",
		program: "club",
		kind: "training",
		repeat: "weekly",
		occurrences: 2,
		seasonId: "2026-2027",
		description: "Synthetic verification only",
		eligiblePersonIds: [personId],
	};
	const eventKey = `performance-${crypto.randomUUID()}`;
	await owner.client.mutation(api.club.apply, {
		action: { type: "create-event", id: eventKey, draft },
	});
	const eventId = `${eventKey}-1`;
	const currentPerson = (
		await owner.client.query(api.club.current, {})
	)?.data.members.find((member) => member.id === personId);
	assert(currentPerson);
	const command = {
		personId,
		eventId,
		kind: "coach",
		rating: 7,
		comments: "Support improved",
		revision: 0,
		requestId: crypto.randomUUID(),
	} as const;
	const id = await owner.client.mutation(api.session_performance.save, command);
	assert.equal(
		await owner.client.mutation(api.session_performance.save, command),
		id,
	);
	await assert.rejects(
		owner.client.mutation(api.session_performance.save, {
			...command,
			rating: 8,
		}),
	);
	const peerId = await peer.client.mutation(api.session_performance.save, {
		...command,
		comments: "Independent coach observation",
	});
	assert.notEqual(peerId, id);
	const self = {
		...command,
		kind: "self",
		rating: 6,
		comments: "I found support earlier",
		requestId: crypto.randomUUID(),
	} as const;
	const selfId = await player.client.mutation(
		api.session_performance.save,
		self,
	);
	const list = async (
		actor: VerificationFixture,
		target = personId,
	): Promise<
		Awaited<
			ReturnType<typeof owner.client.query<typeof api.session_performance.page>>
		>
	> =>
		actor.client.query(api.session_performance.page, {
			personId: target,
			paginationOpts: { cursor: null, numItems: 30 },
		});
	const entries = (await list(guardian)).page;
	assert.equal(entries.length, 1);
	assert(entries.every((entry) => entry.kind === "self"));
	for (const actor of [player, guardian, admin]) {
		await assert.rejects(
			actor.client.query(api.session_performance.current, {
				personId,
				eventId,
				kind: "coach",
			}),
		);
		await assert.rejects(
			actor.client.query(api.session_performance.page, {
				personId,
				kind: "coach",
				paginationOpts: { cursor: null, numItems: 10 },
			}),
		);
	}
	assert(entries.every((entry) => entry.sessionNumber === 2));
	assert.equal(entries.find((entry) => entry.id === id)?.canEdit, false);
	assert.equal(entries.find((entry) => entry.id === selfId)?.canEdit, true);
	assert.equal(
		(
			await owner.client.query(api.session_performance.current, {
				personId,
				eventId,
				kind: "coach",
			})
		)?.id,
		id,
	);
	assert.equal(
		(
			await peer.client.query(api.session_performance.current, {
				personId,
				eventId,
				kind: "coach",
			})
		)?.id,
		peerId,
	);
	for (const actor of [player, guardian, admin])
		await assert.rejects(
			actor.client.mutation(api.session_performance.save, {
				...command,
				requestId: crypto.randomUUID(),
			}),
		);
	for (const actor of [admin, outside]) {
		await assert.rejects(list(actor));
		await assert.rejects(
			actor.client.query(api.session_performance.sessions, {
				personId,
				paginationOpts: { cursor: null, numItems: 10 },
			}),
		);
	}
	await assert.rejects(
		peer.client.mutation(api.session_performance.save, {
			...self,
			requestId: crypto.randomUUID(),
		}),
	);
	for (const rating of [0, 11, 1.5])
		await assert.rejects(
			owner.client.mutation(api.session_performance.save, {
				...command,
				revision: 1,
				requestId: crypto.randomUUID(),
				rating,
			}),
		);
	await assert.rejects(
		owner.client.mutation(api.session_performance.save, {
			...command,
			revision: 1,
			requestId: crypto.randomUUID(),
			comments: "x".repeat(2001),
		}),
	);
	await assert.rejects(
		guardian.client.mutation(api.session_performance.save, {
			...self,
			requestId: crypto.randomUUID(),
		}),
	);
	await guardian.client.mutation(api.session_performance.save, {
		...self,
		revision: 1,
		requestId: crypto.randomUUID(),
		rating: 8,
	});
	assert.equal(
		(await list(player)).page.filter((entry) => entry.kind === "self").length,
		1,
	);
	const beforeRename = (await list(owner)).page.find(
		(entry) => entry.id === id,
	);
	assert(beforeRename);
	await owner.client.mutation(api.club.apply, {
		action: {
			type: "edit-event",
			eventId,
			scope: "single",
			draft: {
				...draft,
				date: addDays(draft.date, 7),
				repeat: "once",
				title: "Renamed current practice",
			},
		},
	});
	await owner.client.mutation(api.session_performance.save, {
		...command,
		revision: 1,
		requestId: crypto.randomUUID(),
		rating: 9,
	});
	const afterRename = (await list(owner)).page.find((entry) => entry.id === id);
	assert.equal(afterRename?.eventTitle, beforeRename.eventTitle);
	assert.equal(afterRename?.eventDate, beforeRename.eventDate);
	assert.equal(afterRename?.sessionNumber, 2);
	await owner.client.mutation(api.session_performance.save, command);
	assert.equal(
		(await list(owner)).page.find((entry) => entry.id === id)?.rating,
		9,
	);
	await owner.client.mutation(api.club.apply, {
		action: { type: "set-member-archived", personId, archived: true },
	});
	assert.equal((await list(player)).page.length, 1);
	await assert.rejects(
		player.client.mutation(api.session_performance.save, {
			...self,
			revision: 2,
			requestId: crypto.randomUUID(),
		}),
	);
	await owner.client.mutation(api.club.apply, {
		action: { type: "set-member-archived", personId, archived: false },
	});
	await access(guardianWorkspace.account.id, []);
	await assert.rejects(list(guardian));
	const unchanged = (
		await owner.client.query(api.club.current, {})
	)?.data.members.find((member) => member.id === personId);
	assert.equal(unchanged?.rating, currentPerson.rating);
	assert.equal(unchanged?.goal, currentPerson.goal);
	assert.equal(unchanged?.steps, currentPerson.steps);
	assert.equal(unchanged?.goalRevision, currentPerson.goalRevision);
	const mergeEventKey = `merge-performance-${crypto.randomUUID()}`;
	await owner.client.mutation(api.club.apply, {
		action: {
			type: "create-event",
			id: mergeEventKey,
			draft: { ...draft, repeat: "once", eligiblePersonIds: undefined },
		},
	});
	const mergeEventId = `${mergeEventKey}-0`;
	const person = (id: string): Member => ({
		id,
		name: id,
		programs: ["club"],
		position: "Forward",
		rating: 3,
		registration: "missing",
		goal: "",
		steps: 0,
	});
	const pair = async (
		suffix: string,
	): Promise<{ sourceId: string; targetId: string }> => {
		const sourceId = `rating-source-${suffix}`;
		const targetId = `rating-target-${suffix}`;
		for (const id of [sourceId, targetId])
			await owner.client.mutation(api.club.apply, {
				action: { type: "add-member", member: person(id), charge: 0 },
			});
		await access(workspace.account.id, [sourceId, targetId], true, true);
		return { sourceId, targetId };
	};
	const compatible = await pair("compatible");
	const sourceRating = await owner.client.mutation(
		api.session_performance.save,
		{
			...self,
			personId: compatible.sourceId,
			eventId: mergeEventId,
			requestId: crypto.randomUUID(),
		},
	);
	const sourceBefore = (await list(owner, compatible.sourceId)).page.at(0);
	assert(sourceBefore);
	await owner.client.mutation(api.club.apply, {
		action: {
			type: "set-member-archived",
			personId: compatible.sourceId,
			archived: true,
		},
	});
	const mergeInput = { ...compatible, fillEmptyProfile: false };
	const preview = await owner.client.query(
		api.member_merges.preview,
		mergeInput,
	);
	assert.equal(preview.conflicts.length, 0);
	assert(
		preview.counts.some(
			(row) =>
				row.label === "Session performance ratings relinked" && row.count === 1,
		),
	);
	const merge = {
		...mergeInput,
		token: preview.token,
		confirmation: compatible.targetId,
		key: crypto.randomUUID(),
	};
	await owner.client.mutation(api.member_merges.merge, merge);
	const sourceAfter = (await list(owner, compatible.targetId)).page.find(
		(entry) => entry.id === sourceRating,
	);
	assert(sourceAfter);
	assert.equal(sourceAfter.personId, compatible.targetId);
	assert.equal(sourceAfter.revision, sourceBefore.revision + 1);
	assert.equal(sourceAfter.comments, sourceBefore.comments);
	assert.equal(sourceAfter.authorId, sourceBefore.authorId);
	assert.equal(sourceAfter.eventDate, sourceBefore.eventDate);
	await assert.rejects(
		owner.client.mutation(api.session_performance.save, {
			...self,
			personId: compatible.sourceId,
			eventId: mergeEventId,
			revision: 1,
			requestId: crypto.randomUUID(),
		}),
	);
	await assert.rejects(
		owner.client.mutation(api.session_performance.save, {
			...self,
			personId: compatible.targetId,
			eventId: mergeEventId,
			revision: 1,
			requestId: crypto.randomUUID(),
		}),
	);
	const collision = await pair("collision");
	await owner.client.mutation(api.session_performance.save, {
		...self,
		personId: collision.sourceId,
		eventId: mergeEventId,
		requestId: crypto.randomUUID(),
	});
	await owner.client.mutation(api.club.apply, {
		action: {
			type: "set-member-archived",
			personId: collision.sourceId,
			archived: true,
		},
	});
	const collisionInput = { ...collision, fillEmptyProfile: false };
	const stale = await owner.client.query(
		api.member_merges.preview,
		collisionInput,
	);
	assert.equal(stale.conflicts.length, 0);
	await owner.client.mutation(api.session_performance.save, {
		...self,
		personId: collision.targetId,
		eventId: mergeEventId,
		requestId: crypto.randomUUID(),
	});
	await assert.rejects(
		owner.client.mutation(api.member_merges.merge, {
			...collisionInput,
			token: stale.token,
			confirmation: collision.targetId,
			key: crypto.randomUUID(),
		}),
	);
	const refused = await owner.client.query(
		api.member_merges.preview,
		collisionInput,
	);
	assert(
		refused.conflicts.some((row) => row.category === "Session performance"),
	);
	const sourceIntact = (await list(owner, collision.sourceId)).page;
	await assert.rejects(
		owner.client.mutation(api.member_merges.merge, {
			...collisionInput,
			token: refused.token,
			confirmation: collision.targetId,
			key: crypto.randomUUID(),
		}),
	);
	assert.deepEqual((await list(owner, collision.sourceId)).page, sourceIntact);
	await run.dispose(peer);
	assert(!(await list(owner)).page.some((entry) => entry.id === peerId));
	assert((await list(owner)).page.some((entry) => entry.id === id));
	const paginationEventKey = `performance-pagination-${crypto.randomUUID()}`;
	await owner.client.mutation(api.club.apply, {
		action: {
			type: "create-event",
			id: paginationEventKey,
			draft: {
				...draft,
				date: addDays(draft.date, 21),
				occurrences: 8,
			},
		},
	});
	for (const index of Array.from({ length: 8 }, (_, index) => index))
		await player.client.mutation(api.session_performance.save, {
			...self,
			eventId: `${paginationEventKey}-${index}`,
			requestId: crypto.randomUUID(),
		});
	const firstPage = await player.client.query(api.session_performance.page, {
		personId,
		paginationOpts: { cursor: null, numItems: 6 },
	});
	assert.equal(firstPage.page.length, 6);
	assert(firstPage.page.every((entry) => entry.kind === "self"));
	const coachPage = await owner.client.query(api.session_performance.page, {
		personId,
		kind: "coach",
		paginationOpts: { cursor: null, numItems: 1 },
	});
	assert.equal(coachPage.page.length, 1);
	assert.equal(coachPage.page.at(0)?.id, id);
	if (!coachPage.isDone) {
		const remaining = await owner.client.query(api.session_performance.page, {
			personId,
			kind: "coach",
			paginationOpts: { cursor: coachPage.continueCursor, numItems: 1 },
		});
		assert.equal(remaining.page.length, 0);
		assert.equal(remaining.isDone, true);
	}
	for (const actor of [admin, outside, guardian])
		await assert.rejects(
			actor.client.query(api.session_performance.page, {
				personId,
				kind: "coach",
				paginationOpts: { cursor: null, numItems: 1 },
			}),
		);
	console.log(
		"PASS: private coach/self 1–10 ratings, bounded kind-filtered history, real session numbering, author isolation, household editing, safe retries, snapshots, archive/unlink revocation, merge preservation/collision/stale guards and authored-data erasure.",
	);
} finally {
	await run.close();
	console.log("Session-performance synthetic fixtures cleaned up.");
}
