import assert from "node:assert/strict";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";
import type { MergeInspection } from "../convex/local_member_merge_checks";
import type { Member } from "../src/domain/app-types";
import { createVerificationRun } from "./verification-fixtures";

const run = createVerificationRun("member-merges");
const local = async <Result>(name: string, args: object): Promise<Result> => {
	const child = Bun.spawn(
		[
			process.execPath,
			"scripts/local-convex.ts",
			"run",
			`local_member_merge_checks:${name}`,
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
	if (code) throw new Error(`Isolated merge fixture ${name} failed: ${error}`);
	const result: Result = JSON.parse(output.trim() || "null");
	return result;
};
const sourceId = "merge-source";
const targetId = "merge-target";
const member = (id: string): Member => ({
	id,
	name:
		id === sourceId
			? "Archived fictional player"
			: "Canonical fictional player",
	programs: id === sourceId ? ["youth"] : ["club"],
	position: "Wing",
	rating: 40,
	registration: "missing",
	goal: id === sourceId ? "Original source goal" : "Authoritative target goal",
	goalRevision: id === targetId ? 3 : 1,
	steps: 2,
});

try {
	for (const kind of [
		"compatible",
		"attendance",
		"lineup",
		"checkin",
		"fitness",
		"enrollment",
		"invite",
		"round",
	] as const) {
		const owner = await run.fixture(`Merge ${kind} coach`);
		await owner.client.mutation(api.club.create, {
			name: "Member merge verification",
			samples: false,
		});
		const workspace = await owner.client.query(api.club.current, {
			screen: "settings",
		});
		assert(workspace);
		const fixture = { clubId: workspace.clubId, userId: workspace.account.id };
		for (const id of [sourceId, targetId])
			await owner.client.mutation(api.club.apply, {
				action: { type: "add-member", member: member(id), charge: 0 },
			});
		await owner.client.mutation(api.club.setAccess, {
			accountId: workspace.account.id,
			admin: true,
			coachPrograms: ["club"],
			children: [sourceId],
		});
		await owner.client.mutation(api.club.apply, {
			action: {
				type: "set-member-archived",
				personId: sourceId,
				archived: true,
			},
		});
		await local<null>("seed", { ...fixture, kind });
		const before = await local<MergeInspection>("inspect", fixture);
		const input = { sourceId, targetId, fillEmptyProfile: true };
		const preview = await owner.client.query(api.member_merges.preview, input);
		const command = {
			...input,
			token: preview.token,
			key: crypto.randomUUID(),
			confirmation: member(targetId).name,
		};
		if (kind !== "compatible" && kind !== "round") {
			assert(
				preview.conflicts.length > 0,
				`${kind} must expose an actionable preflight conflict`,
			);
			assert(
				preview.conflicts.every(
					(row) => row.category && row.record && row.reason && row.resolution,
				),
			);
			await assert.rejects(
				owner.client.mutation(api.member_merges.merge, command),
			);
			assert.deepEqual(
				await local<MergeInspection>("inspect", fixture),
				before,
				`${kind} must reject atomically`,
			);
			console.log(`Merge ${kind} collision rejected atomically.`);
			await run.dispose(owner);
			continue;
		}
		assert.deepEqual(preview.conflicts, []);
		assert.deepEqual(preview.filledFields, ["Phone", "Cap number"]);
		await assert.rejects(
			new ConvexHttpClient("http://127.0.0.1:3210", { logger: false }).query(
				api.member_merges.preview,
				input,
			),
		);
		await assert.rejects(
			owner.client.mutation(api.member_merges.merge, {
				...command,
				confirmation: "wrong name",
			}),
		);
		assert.deepEqual(await local<MergeInspection>("inspect", fixture), before);
		await owner.client.mutation(api.club.apply, {
			action: {
				type: "attendance",
				eventId: "merge-past",
				personId: sourceId,
				attendance: "late",
			},
		});
		await assert.rejects(
			owner.client.mutation(api.member_merges.merge, command),
			/changed|preview/i,
		);
		const refreshed = await owner.client.query(
			api.member_merges.preview,
			input,
		);
		const fresh = { ...command, token: refreshed.token };
		await Promise.all([
			owner.client.mutation(api.member_merges.merge, fresh),
			owner.client.mutation(api.member_merges.merge, fresh),
		]);
		assert.equal(
			await owner.client.mutation(api.member_merges.merge, fresh),
			targetId,
		);
		await assert.rejects(
			owner.client.mutation(api.member_merges.merge, {
				...fresh,
				key: crypto.randomUUID(),
			}),
		);
		const after = await local<MergeInspection>("inspect", fixture);
		const source = after.members.find((row) => row.id === sourceId);
		const target = after.members.find((row) => row.id === targetId);
		assert.equal(source?.mergedInto, targetId);
		assert.equal(source?.goal, "Original source goal");
		assert.equal(target?.goal, "Authoritative target goal");
		assert.equal(target?.goalRevision, 3);
		assert.deepEqual(target?.programs, ["club", "youth"]);
		assert.equal(after.audits.length, 1);
		assert.equal(after.audits.at(0)?.sourceSnapshot.goal, source?.goal);
		assert(
			after.audits
				.at(0)
				?.preserved.some((row) => row.category.includes("dues")),
		);
		assert.deepEqual(
			after.responses.map((row) => row._id),
			before.responses.map((row) => row._id),
		);
		assert(
			after.responses.every(
				(row) =>
					row.value.personId === targetId &&
					row.value.id === `merge-past:${targetId}`,
			),
		);
		assert.equal(after.checkins.at(0)?._id, before.checkins.at(0)?._id);
		assert.equal(after.checkins.at(0)?.personId, targetId);
		assert.equal(after.checkins.at(0)?.note, "Original private energy note");
		assert.equal(after.checkins.at(0)?.actorId, fixture.userId);
		for (const row of after.teams) {
			assert.equal(row.value.revision, 5);
			if (row.value.eventId === "merge-past")
				assert.equal(row.value.published, true);
			else {
				assert.equal(row.value.published, false);
				assert.equal(row.value.coachingStale, true);
			}
			assert(!row.value.black.includes(sourceId));
			assert(!row.value.referees?.some((entry) => entry.personId === sourceId));
		}
		assert(
			after.teams.some((row) =>
				row.value.fieldSlots?.some(
					(entry) => entry.personId === targetId && entry.slot === 0,
				),
			),
		);
		assert(
			after.teams.some((row) =>
				row.value.referees?.some((entry) => entry.personId === targetId),
			),
		);
		assert.equal(after.series.at(0)?.enrollments.length, 3);
		assert(
			after.series.at(0)?.enrollments.every((row) => row.personId === targetId),
		);
		assert.deepEqual(
			after.results.map((row) => row._id).sort(),
			before.results.map((row) => row._id).sort(),
		);
		assert(after.results.every((row) => row.personId === targetId));
		assert.equal(after.stats.length, 1);
		assert.deepEqual(
			after.stats.map((row) => [row.personId, row.count, row.total, row.best]),
			[[targetId, 2, 25, 15]],
		);
		const sourceSessionId = before.results.find(
			(row) => row.personId === sourceId,
		)?.sessionId;
		assert.equal(
			after.sessions.find((row) => row._id === sourceSessionId)?.revision,
			3,
		);
		assert.deepEqual(
			after.reflections.map((row) => [row._id, row.authorId, row.note]),
			before.reflections.map((row) => [row._id, row.authorId, row.note]),
		);
		assert(after.reflections.every((row) => row.personId === targetId));
		assert.deepEqual(
			after.ledger.map((row) => [row._id, row.before, row.after, row.note]),
			before.ledger.map((row) => [row._id, row.before, row.after, row.note]),
		);
		assert(after.ledger.every((row) => row.personId === targetId));
		assert(
			after.references.every(
				(row) =>
					row.personId === targetId &&
					row.fingerprint === "Original import fingerprint",
			),
		);
		assert(
			after.references.some(
				(row) => row.kind === "members" && row.targetId === targetId,
			),
		);
		assert(
			after.references.some(
				(row) =>
					row.kind === "registration" &&
					row.targetId === `2025-2026:${targetId}`,
			),
		);
		assert.deepEqual(
			after.reviews.map((row) => row._id).sort(),
			before.reviews.map((row) => row._id).sort(),
		);
		assert(
			after.reviews.every(
				(row) => row.personId === targetId && row.originRound === 1,
			),
		);
		assert.deepEqual(
			after.conversations.at(0)?.value.accountIds,
			before.conversations.at(0)?.value.accountIds,
		);
		assert.equal(
			after.conversations.find((row) => row.value.id === "merge-conversation")
				?.recipientPersonId,
			targetId,
		);
		assert(
			after.memberships
				.find((row) => row.userId === fixture.userId)
				?.children.includes(targetId),
		);
		const profile = await owner.client.query(api.member_profiles.read, {
			personId: targetId,
		});
		assert.equal(profile.contact?.email, "target@example.test");
		assert.equal(profile.contact?.phone, "+1 403 555 0100");
		assert.equal(profile.capNumber, 7);
		assert.equal(
			(
				await owner.client.query(api.session_checkins.state, {
					eventId: "merge-past",
				})
			).entries.at(0)?.note,
			"Original private energy note",
		);
		const guest = await run.fixture("Unrelated merge member");
		await guest.client.mutation(api.club.requestToJoin, {
			clubCode: workspace.inviteCode,
		});
		assert.equal(
			(
				await guest.client.query(api.member_profiles.read, {
					personId: targetId,
				})
			).contact,
			undefined,
		);
		assert.deepEqual(
			(
				await guest.client.query(api.session_checkins.state, {
					eventId: "merge-past",
				})
			).entries,
			[],
		);
		await assert.rejects(guest.client.query(api.member_merges.preview, input));
		await assert.rejects(guest.client.mutation(api.member_merges.merge, fresh));
		await assert.rejects(
			owner.client.mutation(api.club.apply, {
				action: {
					type: "set-member-archived",
					personId: sourceId,
					archived: false,
				},
			}),
		);
		await assert.rejects(
			owner.client.mutation(api.player_coaching.save, {
				personId: sourceId,
				revision: 0,
				rating: 50,
				positions: ["FORWARD"],
				ageGroup: "adult",
			}),
		);
		if (kind === "round") {
			const player = await owner.client.query(api.development.player, {
				personId: targetId,
			});
			assert(player?.round?.status === "superseded");
			await owner.client.mutation(api.development.reopen, {
				personId: targetId,
				round: player.round.round,
				revision: player.round.revision,
			});
			assert.equal(
				(
					await owner.client.query(api.development.player, {
						personId: targetId,
					})
				)?.round?.status,
				"open",
			);
		}
		await run.dispose(guest);
		await run.dispose(owner);
		console.log(
			`Merge ${kind} preserved history, authorization, idempotency, stale snapshots and alias protections.`,
		);
	}
	console.log(
		"Member merge verification passed; all fictional accounts and clubs removed.",
	);
} finally {
	await run.close();
}
