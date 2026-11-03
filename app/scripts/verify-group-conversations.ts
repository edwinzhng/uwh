import assert from "node:assert/strict";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";
import type { GroupInspection } from "../convex/local_group_checks";
import { staffRoomId } from "../src/domain/managed-rooms";
import {
	createVerificationRun,
	type VerificationFixture,
} from "./verification-fixtures";

const run = createVerificationRun("named-groups");
const site = process.env.EXPO_PUBLIC_CONVEX_SITE_URL;
if (site !== "http://127.0.0.1:3211")
	throw new Error("Group verification requires the isolated local site.");
const local = async <Result>(name: string, args: object): Promise<Result> => {
	const child = Bun.spawn(
		[
			process.execPath,
			"scripts/local-convex.ts",
			"run",
			`local_group_checks:${name}`,
			JSON.stringify(args),
			"--typecheck",
			"disable",
		],
		{ env: process.env, stdout: "pipe", stderr: "pipe" },
	);
	const [output, error, code] = await Promise.all([
		new Response(child.stdout).text(),
		new Response(child.stderr).text(),
		child.exited,
	]);
	if (code) throw new Error(`Isolated group fixture ${name} failed: ${error}`);
	const result: Result = JSON.parse(output.trim() || "null");
	return result;
};
try {
	const owner = await run.fixture("Group administrator");
	await owner.client.mutation(api.club.create, {
		name: "Named group verification",
		samples: false,
	});
	const workspace = await owner.client.query(api.club.current, {});
	assert(workspace);
	const fixture = { clubId: workspace.clubId, userId: workspace.account.id };
	const join = async (name: string): Promise<VerificationFixture> => {
		const actor = await run.fixture(name);
		await actor.client.mutation(api.club.requestToJoin, {
			clubCode: workspace.inviteCode,
		});
		return actor;
	};
	const first = await join("First selected person");
	const second = await join("Second selected person");
	const other = await join("Unselected person");
	const outside = await run.fixture("Different club person");
	await outside.client.mutation(api.club.create, {
		name: "Other fictional group club",
		samples: false,
	});
	const [firstWorkspace, secondWorkspace, otherWorkspace, outsideWorkspace] =
		await Promise.all(
			[first, second, other, outside].map((actor) =>
				actor.client.query(api.club.current, {}),
			),
		);
	assert(
		firstWorkspace && secondWorkspace && otherWorkspace && outsideWorkspace,
	);
	const recipientIds = [firstWorkspace, secondWorkspace].map(
		(current) => `person:${current.account.personId}`,
	);
	const input = {
		groupId: `group-${crypto.randomUUID()}`,
		name: "  Pool   practice planning  ",
		recipientIds,
	};
	const inspect = (): Promise<GroupInspection> => local("inspect", fixture);
	const post = async (
		actor: VerificationFixture,
		threadId: string,
		body: string,
	): Promise<string> => {
		const id = crypto.randomUUID();
		await actor.client.mutation(api.club.apply, {
			action: { type: "send-message", id, threadId, body, time: "Now" },
		});
		return id;
	};
	await owner.client.mutation(api.messaging.ensureGeneral, {});
	const privateId = await owner.client.mutation(api.messaging.openDirect, {
		recipientId: recipientIds.at(0) ?? "",
	});
	await post(owner, privateId, "Original private direct history");
	const before = await inspect();
	assert(!before.threads.some((thread) => thread.id === staffRoomId));
	const ids = await Promise.all([
		owner.client.mutation(api.messaging.createGroup, input),
		owner.client.mutation(api.messaging.createGroup, {
			...input,
			recipientIds: [...recipientIds].reverse(),
		}),
	]);
	assert.deepEqual(ids, [input.groupId, input.groupId]);
	const after = await inspect();
	assert.equal(after.threads.length, before.threads.length + 1);
	assert.deepEqual(
		after.threads.filter((thread) => thread.id !== input.groupId),
		before.threads,
	);
	const group = after.threads.find((thread) => thread.id === input.groupId);
	assert(group);
	assert.deepEqual(group.messages, []);
	assert.equal(group.direct, false);
	assert.deepEqual(
		group.accountIds.toSorted(),
		[
			workspace.account.id,
			firstWorkspace.account.id,
			secondWorkspace.account.id,
		].toSorted(),
	);
	assert.equal(group.receipt?.name, "Pool practice planning");
	for (const actor of [owner, first, second])
		assert(
			(await actor.client.query(api.messaging.inbox, {})).some(
				(thread) =>
					thread.id === input.groupId &&
					thread.title === "Pool practice planning",
			),
		);
	for (const actor of [other, outside]) {
		assert(
			!(await actor.client.query(api.messaging.inbox, {})).some(
				(thread) => thread.id === input.groupId,
			),
		);
		assert.equal(
			(
				await actor.client.query(api.messaging.list, {
					threadId: input.groupId,
					paginationOpts: { cursor: null, numItems: 10 },
				})
			).page.length,
			0,
		);
		await assert.rejects(post(actor, input.groupId, "Must not write"));
		await assert.rejects(
			actor.client.query(api.thread_participants.current, {
				threadId: input.groupId,
			}),
		);
	}
	assert.equal(
		(
			await second.client.query(api.messaging.list, {
				threadId: privateId,
				paginationOpts: { cursor: null, numItems: 10 },
			})
		).page.length,
		0,
	);
	for (const changed of [
		{ ...input, name: "Different name" },
		{
			...input,
			recipientIds: [
				recipientIds.at(0) ?? "",
				`person:${otherWorkspace.account.personId}`,
			],
		},
		{ ...input, groupId: "club" },
		{ ...input, groupId: staffRoomId },
		{ ...input, groupId: "group-" },
		{ ...input, groupId: `group-${crypto.randomUUID()}`, name: "" },
		{
			...input,
			groupId: `group-${crypto.randomUUID()}`,
			recipientIds: [recipientIds.at(0) ?? ""],
		},
		{
			...input,
			groupId: `group-${crypto.randomUUID()}`,
			recipientIds: [
				recipientIds.at(0) ?? "",
				`person:${outsideWorkspace.account.personId}`,
			],
		},
	])
		await assert.rejects(
			owner.client.mutation(api.messaging.createGroup, changed),
		);
	await assert.rejects(other.client.mutation(api.messaging.createGroup, input));
	await assert.rejects(
		new ConvexHttpClient("http://127.0.0.1:3210", { logger: false }).mutation(
			api.messaging.createGroup,
			input,
		),
	);
	assert.deepEqual(await inspect(), after);
	const conversion = {
		threadId: privateId,
		groupId: `group-${crypto.randomUUID()}`,
		recipientIds: [`person:${secondWorkspace.account.personId}`],
	};
	assert.deepEqual(
		await Promise.all([
			owner.client.mutation(api.thread_participants.add, conversion),
			owner.client.mutation(api.thread_participants.add, conversion),
		]),
		[conversion.groupId, conversion.groupId],
	);
	await assert.rejects(
		owner.client.mutation(api.thread_participants.add, {
			...conversion,
			recipientIds: [`person:${otherWorkspace.account.personId}`],
		}),
	);
	await assert.rejects(
		first.client.mutation(api.thread_participants.add, conversion),
	);
	const converted = (await inspect()).threads.find(
		(thread) => thread.id === conversion.groupId,
	);
	assert.deepEqual(converted?.conversionRecipients, conversion.recipientIds);
	assert.deepEqual(converted?.messages, []);
	const publicConversion = (
		await owner.client.query(api.messaging.inbox, {})
	).find((thread) => thread.id === conversion.groupId);
	assert(publicConversion);
	assert(!("groupSourceRecipientIds" in publicConversion));
	await first.client.mutation(api.moderation.block, {
		targetId: secondWorkspace.account.id,
		blocked: true,
	});
	await assert.rejects(owner.client.mutation(api.messaging.createGroup, input));
	await assert.rejects(
		owner.client.mutation(api.messaging.createGroup, {
			...input,
			groupId: `group-${crypto.randomUUID()}`,
		}),
	);
	await first.client.mutation(api.moderation.block, {
		targetId: secondWorkspace.account.id,
		blocked: false,
	});
	for (const targetId of [workspace.account.id, firstWorkspace.account.id]) {
		await local<null>("pause", { ...fixture, targetId, paused: true });
		await assert.rejects(
			owner.client.mutation(api.messaging.createGroup, input),
		);
		await assert.rejects(
			owner.client.mutation(api.messaging.createGroup, {
				...input,
				groupId: `group-${crypto.randomUUID()}`,
			}),
		);
		await local<null>("pause", { ...fixture, targetId, paused: false });
	}
	assert.equal(
		await owner.client.mutation(api.messaging.createGroup, input),
		input.groupId,
	);
	await owner.client.mutation(api.chat_policy.save, {
		phrases: ["forbidden fixture"],
	});
	await assert.rejects(
		owner.client.mutation(api.messaging.createGroup, {
			...input,
			groupId: `group-${crypto.randomUUID()}`,
			name: "Forbidden fixture name",
		}),
	);
	await owner.client.mutation(api.chat_policy.save, { phrases: [] });
	await owner.client.mutation(api.club.apply, {
		action: {
			type: "add-member",
			member: {
				id: "pending-group-person",
				name: "Unconnected fictional person",
				programs: [],
				position: "",
				rating: 0,
				registration: "missing",
				goal: "",
				steps: 0,
			},
			charge: 0,
		},
	});
	const pendingId = await owner.client.mutation(api.messaging.createGroup, {
		groupId: `group-${crypto.randomUUID()}`,
		name: "Pending profile group",
		recipientIds: [recipientIds.at(0) ?? "", "person:pending-group-person"],
	});
	const pending = (await inspect()).threads.find(
		(thread) => thread.id === pendingId,
	);
	assert.deepEqual(
		pending?.accountIds.toSorted(),
		[workspace.account.id, firstWorkspace.account.id].toSorted(),
	);
	assert(pending?.personIds.includes("pending-group-person"));
	await owner.client.mutation(api.club.apply, {
		action: {
			type: "set-member-archived",
			personId: firstWorkspace.account.personId,
			archived: true,
		},
	});
	assert(
		!(
			await owner.client.query(api.message_recipients.directory, {})
		).recipients.some(
			(recipient) =>
				recipient.id === `person:${firstWorkspace.account.personId}` ||
				recipient.id === firstWorkspace.account.id,
		),
	);
	await assert.rejects(
		owner.client.mutation(api.messaging.createGroup, {
			...input,
			groupId: `group-${crypto.randomUUID()}`,
		}),
	);
	for (const recipientId of [
		`person:${firstWorkspace.account.personId}`,
		firstWorkspace.account.id,
	])
		await assert.rejects(
			owner.client.mutation(api.messaging.openDirect, { recipientId }),
		);
	const activeDirect = await owner.client.mutation(api.messaging.openDirect, {
		recipientId: `person:${secondWorkspace.account.personId}`,
	});
	for (const recipientId of [
		`person:${firstWorkspace.account.personId}`,
		firstWorkspace.account.id,
	])
		await assert.rejects(
			owner.client.mutation(api.thread_participants.add, {
				threadId: activeDirect,
				groupId: `group-${crypto.randomUUID()}`,
				recipientIds: [recipientId],
			}),
		);
	assert.equal(
		(
			await owner.client.query(api.messaging.list, {
				threadId: privateId,
				paginationOpts: { cursor: null, numItems: 10 },
			})
		).page.at(0)?.body,
		"Original private direct history",
	);
	await owner.client.mutation(api.club.apply, {
		action: {
			type: "set-member-archived",
			personId: firstWorkspace.account.personId,
			archived: false,
		},
	});
	await local<null>("seedStaff", fixture);
	await Promise.all(
		[owner, first, second].map((actor) =>
			actor.client.mutation(api.messaging.ensureGeneral, {}),
		),
	);
	for (const actor of [owner, first, second, other, outside]) {
		assert(
			!(await actor.client.query(api.messaging.inbox, {})).some(
				(thread) => thread.id === staffRoomId,
			),
		);
		assert.equal(
			await actor.client.query(api.messaging.message, {
				messageId: "retired-staff-message",
			}),
			null,
		);
		assert.equal(
			(
				await actor.client.query(api.messaging.list, {
					threadId: staffRoomId,
					paginationOpts: { cursor: null, numItems: 10 },
				})
			).page.length,
			0,
		);
		await assert.rejects(post(actor, staffRoomId, "Stale Staff composer"));
		await assert.rejects(
			actor.client.mutation(api.messaging.markRead, {
				threadId: staffRoomId,
				messageId: "retired-staff-message",
			}),
		);
		await assert.rejects(
			actor.client.query(api.thread_tools.read, { threadId: staffRoomId }),
		);
		await assert.rejects(
			actor.client.mutation(api.thread_tools.create, {
				threadId: staffRoomId,
				key: crypto.randomUUID(),
				question: "Forbidden?",
				options: ["Yes", "No"],
				multiple: false,
			}),
		);
		await assert.rejects(
			actor.client.query(api.thread_participants.current, {
				threadId: staffRoomId,
			}),
		);
	}
	const image = await fetch(
		`${site}/images?${new URLSearchParams({ thread: staffRoomId, name: "Legacy.png" })}`,
		{
			method: "POST",
			headers: {
				Authorization: `Bearer ${owner.token}`,
				"Content-Type": "image/png",
			},
			body: new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]),
		},
	);
	assert.equal(image.status, 403);
	assert.deepEqual(
		(await inspect()).threads.find((thread) => thread.id === staffRoomId)
			?.messages,
		["Preserved fictional Staff history"],
	);
	const messageId = await post(
		owner,
		input.groupId,
		"Shared named group history",
	);
	const fallback = await join("Legacy account without roster profile");
	const fallbackWorkspace = await fallback.client.query(api.club.current, {});
	assert(fallbackWorkspace);
	await local<null>("detachRoster", {
		...fixture,
		targetId: fallbackWorkspace.account.id,
	});
	const fallbackDirect = await owner.client.mutation(api.messaging.openDirect, {
		recipientId: fallbackWorkspace.account.id,
	});
	await assert.rejects(
		owner.client.mutation(api.thread_participants.add, {
			threadId: fallbackDirect,
			recipientIds: [fallbackWorkspace.account.id],
			groupId: `group-${crypto.randomUUID()}`,
		}),
		/already in this conversation/,
	);
	const fallbackGroup = await owner.client.mutation(
		api.thread_participants.add,
		{
			threadId: activeDirect,
			recipientIds: [fallbackWorkspace.account.id],
			groupId: `group-${crypto.randomUUID()}`,
		},
	);
	const fallbackThread = (await inspect()).threads.find(
		(thread) => thread.id === fallbackGroup,
	);
	assert(fallbackThread);
	assert(fallbackThread.accountIds.includes(fallbackWorkspace.account.id));
	assert(!fallbackThread.personIds.includes(fallbackWorkspace.account.id));
	assert.equal(
		await owner.client.mutation(api.thread_participants.add, {
			threadId: fallbackGroup,
			recipientIds: [fallbackWorkspace.account.id],
			groupId: fallbackGroup,
		}),
		fallbackGroup,
	);
	const legacyId = await local<string>("seedLegacyParticipant", {
		...fixture,
		threadId: conversion.groupId,
		targetId: firstWorkspace.account.id,
	});
	assert(
		(await inspect()).threads
			.find((thread) => thread.id === legacyId)
			?.personIds.includes(firstWorkspace.account.id),
	);
	await run.dispose(first);
	const erased = (await inspect()).threads.find(
		(thread) => thread.id === input.groupId,
	);
	assert(erased);
	assert(!erased.accountIds.includes(firstWorkspace.account.id));
	assert(!erased.personIds.includes(firstWorkspace.account.personId));
	assert(!erased.personIds.includes(firstWorkspace.account.id));
	const convertedAfterErasure = (await inspect()).threads.find(
		(thread) => thread.id === conversion.groupId,
	);
	assert(convertedAfterErasure);
	assert(!convertedAfterErasure.personIds.includes(firstWorkspace.account.id));
	assert(
		!convertedAfterErasure.personIds.includes(firstWorkspace.account.personId),
	);
	const legacyAfterErasure = (await inspect()).threads.find(
		(thread) => thread.id === legacyId,
	);
	assert(legacyAfterErasure);
	assert(!legacyAfterErasure.personIds.includes(firstWorkspace.account.id));
	assert.equal(erased.receipt, undefined);
	assert.equal(
		(await inspect()).threads.find((thread) => thread.id === conversion.groupId)
			?.conversionRecipients,
		undefined,
	);
	assert.deepEqual(erased.messages, ["Shared named group history"]);
	assert.equal(
		(await second.client.query(api.messaging.message, { messageId }))?.body,
		"Shared named group history",
	);
	await assert.rejects(owner.client.mutation(api.messaging.createGroup, input));
	const otherGroup = {
		groupId: `group-${crypto.randomUUID()}`,
		name: "Creator erasure group",
		recipientIds: [
			`person:${workspace.account.personId}`,
			`person:${secondWorkspace.account.personId}`,
		],
	};
	await other.client.mutation(api.messaging.createGroup, otherGroup);
	await run.dispose(other);
	const creatorErased = (await inspect()).threads.find(
		(thread) => thread.id === otherGroup.groupId,
	);
	assert.equal(creatorErased?.creator, undefined);
	assert.equal(creatorErased?.receipt, undefined);
	console.log(
		"PASS: named groups and direct conversions, canonical concurrent retry, changed-audience rejection, private receipt erasure, no private history copying, current membership/block/pause/filter and archived-recipient gates, pending profiles, cross-club privacy, Staff retirement and cleanup.",
	);
} finally {
	await run.close();
	console.log("Named-group synthetic fixtures cleaned up.");
}
