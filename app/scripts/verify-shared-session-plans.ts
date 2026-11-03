import assert from "node:assert/strict";
import { api } from "../convex/_generated/api";
import { addDays } from "../src/domain/app-rules";
import type { EventDraft } from "../src/domain/app-types";
import { clubDate } from "../src/domain/event-time";
import { createVerificationRun } from "./verification-fixtures";

const run = createVerificationRun("shared-plans");
try {
	const owner = await run.fixture("Shared plan coach");
	await owner.client.mutation(api.club.create, {
		name: "Shared plan verification",
		samples: false,
	});
	const workspace = await owner.client.query(api.club.current, {});
	assert(workspace);
	const player = await run.fixture("Shared plan player");
	const guardian = await run.fixture("Shared plan guardian");
	const unrelated = await run.fixture("Unrelated shared plan player");
	for (const actor of [player, guardian, unrelated])
		await actor.client.mutation(api.club.requestToJoin, {
			clubCode: workspace.inviteCode,
		});
	const playerWorkspace = await player.client.query(api.club.current, {});
	const guardianWorkspace = await guardian.client.query(api.club.current, {});
	assert(playerWorkspace && guardianWorkspace);
	const personId = playerWorkspace.account.personId;
	await owner.client.mutation(api.club.setAccess, {
		accountId: guardianWorkspace.account.id,
		children: [personId],
		coachPrograms: [],
		admin: false,
	});
	const draft: EventDraft = {
		title: "Published-plan practice",
		date: addDays(clubDate(), 3),
		start: "19:00",
		end: "20:00",
		venue: "Fictional plan pool",
		program: "club",
		kind: "training",
		repeat: "once",
		seasonId: "2026-2027",
		description: "Synthetic local verification",
		eligiblePersonIds: [personId],
	};
	const id = `shared-plan-${crypto.randomUUID()}`;
	await owner.client.mutation(api.club.apply, {
		action: { type: "create-event", id, draft },
	});
	const eventId = `${id}-0`;
	const target = { eventId };

	assert.equal(
		await guardian.client.query(api.session_plans.shared, target),
		null,
	);
	const resource = async (audience: "club" | "coaches"): Promise<string> =>
		owner.client.mutation(api.resources.save, {
			title: `${audience} drill reference`,
			description: "Synthetic media",
			kind: "document",
			audience,
			personIds: [],
			url: `https://example.test/${audience}.pdf`,
			key: crypto.randomUUID(),
			revision: 0,
		});
	const privateId = await resource("coaches");
	const publicId = await resource("club");
	const command = {
		...target,
		revision: 0,
		requestId: crypto.randomUUID(),
		body: "**Session plan**\nWarm up, then *small-sided games*.\nGame FOCUS\n- Sub on the fly\n- Balance the load",
		notes: "Do not expose internal coaching notes",
		media: [
			{
				id: "staff",
				label: "Secret coaching-only reference",
				source: "resource",
				resourceId: privateId,
			},
			{
				id: "public",
				label: "Shared reference",
				source: "resource",
				resourceId: publicId,
			},
		],
	} as const;
	const saveCommand = { ...command, media: [...command.media] };
	await owner.client.mutation(api.session_plans.save, saveCommand);
	assert.equal(
		await player.client.query(api.session_plans.shared, target),
		null,
	);
	const publication = {
		...target,
		revision: 1,
		requestId: crypto.randomUUID(),
		published: true,
	};
	for (const actor of [player, guardian, unrelated]) {
		await assert.rejects(actor.client.query(api.session_plans.state, target));
		await assert.rejects(
			actor.client.mutation(api.session_plans.publish, publication),
		);
	}
	await assert.rejects(
		owner.client.mutation(api.session_plans.publish, {
			...publication,
			requestId: command.requestId,
		}),
	);
	await Promise.all([
		owner.client.mutation(api.session_plans.publish, publication),
		owner.client.mutation(api.session_plans.publish, publication),
	]);
	for (const actor of [player, guardian]) {
		const shared = await actor.client.query(api.session_plans.shared, target);
		assert(shared);
		assert.equal(shared.revision, 2);
		assert.equal(shared.body, command.body);
		assert(!("notes" in shared));
		assert.equal(shared.media.length, 1);
		assert(!JSON.stringify(shared).includes(privateId));
		assert(!JSON.stringify(shared).includes("Secret coaching"));
		assert(!JSON.stringify(shared).includes(command.notes));
	}
	assert.equal(
		await unrelated.client.query(api.session_plans.shared, target),
		null,
	);
	const coachShared = await owner.client.query(
		api.session_plans.shared,
		target,
	);
	assert.equal(coachShared?.media.length, 2);
	assert(coachShared && !("notes" in coachShared));
	assert.equal(
		(await owner.client.query(api.session_plans.state, target)).notes,
		command.notes,
	);
	await owner.client.mutation(api.session_plans.save, saveCommand);
	assert.equal(
		(await owner.client.query(api.session_plans.state, target)).published,
		true,
	);
	await assert.rejects(
		owner.client.mutation(api.session_plans.publish, {
			...publication,
			requestId: crypto.randomUUID(),
		}),
	);
	await owner.client.mutation(api.club.setAccess, {
		accountId: guardianWorkspace.account.id,
		children: [],
		coachPrograms: [],
		admin: false,
	});
	assert.equal(
		await guardian.client.query(api.session_plans.shared, target),
		null,
	);
	await owner.client.mutation(api.club.setAccess, {
		accountId: guardianWorkspace.account.id,
		children: [personId],
		coachPrograms: [],
		admin: false,
	});
	await owner.client.mutation(api.club.apply, {
		action: { type: "set-member-archived", personId, archived: true },
	});
	assert.equal(
		await player.client.query(api.session_plans.shared, target),
		null,
	);
	assert.equal(
		await guardian.client.query(api.session_plans.shared, target),
		null,
	);
	await owner.client.mutation(api.club.apply, {
		action: { type: "set-member-archived", personId, archived: false },
	});
	assert(await guardian.client.query(api.session_plans.shared, target));
	const unpublish = {
		...target,
		revision: 2,
		requestId: crypto.randomUUID(),
		published: false,
	};
	await owner.client.mutation(api.session_plans.publish, unpublish);
	assert.equal(
		await player.client.query(api.session_plans.shared, target),
		null,
	);
	await owner.client.mutation(api.session_plans.publish, publication);
	assert.equal(
		(await owner.client.query(api.session_plans.state, target)).published,
		false,
	);
	await owner.client.mutation(api.session_plans.publish, {
		...publication,
		revision: 3,
		requestId: crypto.randomUUID(),
	});
	await owner.client.mutation(api.session_plans.save, {
		...saveCommand,
		revision: 4,
		requestId: crypto.randomUUID(),
		body: "A revised shared plan",
	});
	assert.equal(
		await player.client.query(api.session_plans.shared, target),
		null,
	);
	const nextPublication = {
		...target,
		revision: 5,
		published: true,
		requestId: crypto.randomUUID(),
	};
	const race = await Promise.allSettled([
		owner.client.mutation(api.session_plans.publish, nextPublication),
		owner.client.mutation(api.session_plans.save, {
			...saveCommand,
			revision: 5,
			requestId: crypto.randomUUID(),
			notes: "Concurrent private edit",
		}),
	]);
	assert.equal(
		race.filter((result) => result.status === "fulfilled").length,
		1,
	);
	const finalPlan = await owner.client.query(api.session_plans.state, target);
	assert.equal(finalPlan.revision, 6);
	await owner.client.mutation(api.club.apply, {
		action: { type: "cancel-event", eventId },
	});
	assert.equal(
		await player.client.query(api.session_plans.shared, target),
		null,
	);
	await assert.rejects(
		owner.client.mutation(api.session_plans.publish, {
			...nextPublication,
			revision: 6,
			requestId: crypto.randomUUID(),
		}),
	);
	console.log(
		"PASS: explicit version-guarded plan publishing, protected-media projection, private/legacy note isolation, household/archive revocation, safe retries, stale requests, save/publish race and cancelled-session denial.",
	);
} finally {
	await run.close();
	console.log("Shared-plan synthetic fixtures cleaned up.");
}
