import assert from "node:assert/strict";
import { api } from "../convex/_generated/api";
import { programRoomId, staffRoomId } from "../src/domain/managed-rooms";
import { defaultProgramRsvp, type ProgramDraft } from "../src/domain/programs";
import {
	createVerificationRun,
	type VerificationFixture,
} from "./verification-fixtures";

const run = createVerificationRun("managed-rooms");
const site = process.env.EXPO_PUBLIC_CONVEX_SITE_URL;
if (site !== "http://127.0.0.1:3211")
	throw new Error(
		"Managed room verification requires the isolated local site endpoint.",
	);
try {
	const owner = await run.fixture("Room administrator");
	await owner.client.mutation(api.club.create, {
		name: "Managed room verification",
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
	const player = await join("Program room player");
	const guardian = await join("Program room guardian");
	const coach = await join("Staff room coach");
	const other = await join("Unrelated room member");
	const outside = await run.fixture("Other club member");
	await outside.client.mutation(api.club.create, {
		name: "Different room club",
		samples: false,
	});
	const [playerWorkspace, guardianWorkspace, coachWorkspace] =
		await Promise.all(
			[player, guardian, coach].map((actor) =>
				actor.client.query(api.club.current, {}),
			),
		);
	assert(playerWorkspace && guardianWorkspace && coachWorkspace);
	const personId = playerWorkspace.account.personId;
	await owner.client.mutation(api.club.setAccess, {
		accountId: guardianWorkspace.account.id,
		children: [personId],
		coachPrograms: [],
		admin: false,
	});
	await owner.client.mutation(api.club.setAccess, {
		accountId: coachWorkspace.account.id,
		children: [],
		coachPrograms: ["club"],
		admin: false,
	});
	const draft: ProgramDraft = {
		id: `rooms-${crypto.randomUUID()}`,
		name: "Room program",
		status: "active",
		archived: false,
		kind: "hockey",
		rsvp: defaultProgramRsvp(),
	};
	const saveRoster = async (
		memberIds: string[],
		revision: number,
		archived = false,
	): Promise<void> => {
		await owner.client.mutation(api.club.apply, {
			action: {
				type: "save-program",
				requestId: crypto.randomUUID(),
				draft: { ...draft, archived },
				memberIds,
				expectedRevision: revision,
			},
		});
	};
	await saveRoster([personId], 0);
	await Promise.all(
		[owner, player, guardian].map((actor) =>
			actor.client.mutation(api.messaging.ensureGeneral, {}),
		),
	);
	const programId = programRoomId(draft.id);
	const ids = async (actor: VerificationFixture): Promise<string[]> =>
		(await actor.client.query(api.messaging.inbox, {})).map(
			(thread) => thread.id,
		);
	for (const actor of [owner, coach, player, guardian, other])
		assert(!(await ids(actor)).includes(staffRoomId));
	for (const actor of [owner, player, guardian, coach])
		assert((await ids(actor)).includes(programId));
	assert(!(await ids(other)).includes(programId));
	assert(!(await ids(outside)).includes(programId));
	const post = async (
		actor: VerificationFixture,
		threadId: string,
		body: string,
		id = crypto.randomUUID(),
	): Promise<string> => {
		await actor.client.mutation(api.club.apply, {
			action: { type: "send-message", id, threadId, body, time: "Now" },
		});
		return id;
	};
	for (const actor of [owner, coach, player, guardian, other, outside]) {
		await assert.rejects(post(actor, staffRoomId, "Forbidden"));
		await assert.rejects(
			actor.client.query(api.thread_participants.current, {
				threadId: staffRoomId,
			}),
		);
	}
	const programMessage = await post(
		player,
		programId,
		"Program attendance reminder",
	);
	const pollId = await owner.client.mutation(api.thread_tools.create, {
		threadId: programId,
		key: crypto.randomUUID(),
		question: "Focus?",
		options: ["Passing", "Support"],
		multiple: false,
	});
	await guardian.client.mutation(api.thread_tools.vote, {
		pollId,
		choices: [0],
	});
	const png = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
	const upload = await fetch(
		`${site}/images?${new URLSearchParams({ thread: programId, name: "Room.png" })}`,
		{
			method: "POST",
			headers: {
				Authorization: `Bearer ${player.token}`,
				"Content-Type": "image/png",
			},
			body: png,
		},
	);
	assert.equal(upload.status, 200);
	const photo = await upload.json();
	assert(typeof photo.id === "string" && typeof photo.name === "string");
	await player.client.mutation(api.club.apply, {
		action: {
			type: "send-message",
			id: crypto.randomUUID(),
			threadId: programId,
			body: "",
			time: "Now",
			images: [{ id: photo.id, name: photo.name }],
		},
	});
	const download = (actor: VerificationFixture): Promise<Response> =>
		fetch(`${site}/images?id=${encodeURIComponent(photo.id)}`, {
			headers: { Authorization: `Bearer ${actor.token}` },
		});
	assert.equal((await download(guardian)).status, 200);
	const assertRevoked = async (actor: VerificationFixture): Promise<void> => {
		assert(!(await ids(actor)).includes(programId));
		assert.equal(
			await actor.client.query(api.messaging.message, {
				messageId: programMessage,
			}),
			null,
		);
		assert.equal(
			(
				await actor.client.query(api.messaging.list, {
					threadId: programId,
					paginationOpts: { cursor: null, numItems: 10 },
				})
			).page.length,
			0,
		);
		await assert.rejects(post(actor, programId, "Stale room composer"));
		await assert.rejects(
			actor.client.query(api.thread_tools.read, { threadId: programId }),
		);
		await assert.rejects(
			actor.client.mutation(api.moderation.report, {
				messageId: programMessage,
				reason: "Stale room report",
				blockAuthor: false,
			}),
		);
		await assert.rejects(
			actor.client.mutation(api.thread_tools.vote, { pollId, choices: [1] }),
		);
		await assert.rejects(
			actor.client.query(api.thread_participants.current, {
				threadId: programId,
			}),
		);
		assert.equal((await download(actor)).status, 404);
	};
	await owner.client.mutation(api.club.setAccess, {
		accountId: guardianWorkspace.account.id,
		children: [],
		coachPrograms: [],
		admin: false,
	});
	await assertRevoked(guardian);
	await owner.client.mutation(api.club.setAccess, {
		accountId: guardianWorkspace.account.id,
		children: [personId],
		coachPrograms: [],
		admin: false,
	});
	assert.equal((await download(guardian)).status, 200);
	await saveRoster([], 1);
	await assertRevoked(player);
	await assertRevoked(guardian);
	await saveRoster([personId], 2);
	await owner.client.mutation(api.club.apply, {
		action: { type: "set-member-archived", personId, archived: true },
	});
	await assertRevoked(player);
	await assertRevoked(guardian);
	assert((await ids(player)).includes("club"));
	await owner.client.mutation(api.club.apply, {
		action: { type: "set-member-archived", personId, archived: false },
	});
	assert((await ids(guardian)).includes(programId));
	await owner.client.mutation(api.club.setAccess, {
		accountId: coachWorkspace.account.id,
		children: [],
		coachPrograms: [],
		admin: false,
	});
	assert(!(await ids(coach)).includes(staffRoomId));
	await assert.rejects(post(coach, staffRoomId, "Former coach"));
	await player.client.mutation(api.moderation.block, {
		targetId: workspace.account.id,
		blocked: true,
	});
	const blockedMessage = await post(
		owner,
		programId,
		"Blocked author's content",
	);
	await post(player, programId, "Shared room still works");
	assert.equal(
		await player.client.query(api.messaging.message, {
			messageId: blockedMessage,
		}),
		null,
	);
	assert(
		!(
			await player.client.query(api.messaging.list, {
				threadId: programId,
				paginationOpts: { cursor: null, numItems: 30 },
			})
		).page.some((message) => message.id === blockedMessage),
	);
	await assert.rejects(
		owner.client.mutation(api.thread_participants.add, {
			threadId: programId,
			recipientIds: [guardianWorkspace.account.id],
			groupId: "arbitrary",
		}),
	);
	await assert.rejects(
		owner.client.mutation(api.club.apply, {
			action: {
				type: "create-thread",
				id: "room:program:forged",
				recipientId: guardianWorkspace.account.id,
				title: "Forged",
			},
		}),
	);
	await saveRoster([personId], 3, true);
	await assertRevoked(player);
	assert(!(await ids(owner)).includes(programId));
	console.log(
		"PASS: canonical managed rooms, current roles/households/programs, roster/archive/role revocation, messages/polls/photos privacy, block filtering, reserved IDs and cross-club isolation.",
	);
} finally {
	await run.close();
	console.log("Managed-room synthetic fixtures cleaned up.");
}
