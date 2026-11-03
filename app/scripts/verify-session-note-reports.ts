import assert from "node:assert/strict";
import { api } from "../convex/_generated/api";
import { addDays } from "../src/domain/app-rules";
import type { EventDraft, Member } from "../src/domain/app-types";
import { clubDate } from "../src/domain/event-time";
import { createVerificationRun } from "./verification-fixtures";

const run = createVerificationRun("session-note-reports");
try {
	const owner = await run.fixture("Note report coach");
	await owner.client.mutation(api.club.create, {
		name: "Session note report verification",
		samples: false,
	});
	const workspace = await owner.client.query(api.club.current, {});
	assert(workspace);
	const player = await run.fixture("Note report player");
	const guardian = await run.fixture("Note report guardian");
	const administrator = await run.fixture("Note report administrator");
	const peer = await run.fixture("Other note coach");
	for (const actor of [player, guardian, administrator, peer])
		await actor.client.mutation(api.club.requestToJoin, {
			clubCode: workspace.inviteCode,
		});
	const [playerWorkspace, guardianWorkspace, adminWorkspace, peerWorkspace] =
		await Promise.all(
			[player, guardian, administrator, peer].map((actor) =>
				actor.client.query(api.club.current, {}),
			),
		);
	assert(
		playerWorkspace && guardianWorkspace && adminWorkspace && peerWorkspace,
	);
	const personId = playerWorkspace.account.personId;
	await owner.client.mutation(api.club.setAccess, {
		accountId: guardianWorkspace.account.id,
		children: [personId],
		coachPrograms: [],
		admin: false,
	});
	await owner.client.mutation(api.club.setAccess, {
		accountId: adminWorkspace.account.id,
		children: [],
		coachPrograms: [],
		admin: true,
	});
	await owner.client.mutation(api.club.setAccess, {
		accountId: peerWorkspace.account.id,
		children: [],
		coachPrograms: ["club"],
		admin: false,
	});
	const outsider = await run.fixture("Other note report club");
	await outsider.client.mutation(api.club.create, {
		name: "Other report club",
		samples: false,
	});
	const draft: EventDraft = {
		title: "Feedback reporting practice",
		date: addDays(clubDate(), 1),
		start: "19:00",
		end: "20:00",
		venue: "Fictional pool",
		program: "club",
		kind: "training",
		repeat: "once",
		seasonId: "2026-2027",
		description: "Synthetic report verification",
	};
	const eventKey = `note-report-${crypto.randomUUID()}`;
	await owner.client.mutation(api.club.apply, {
		action: { type: "create-event", id: eventKey, draft },
	});
	const eventId = `${eventKey}-0`;
	const command = {
		personId,
		eventId,
		kind: "coach",
		rating: 7,
		comments: "Private original coach wording",
		revision: 0,
		requestId: crypto.randomUUID(),
	} as const;
	const id = await owner.client.mutation(api.session_performance.save, command);
	const input = { id, revision: 1, reason: "Please review this wording" };
	for (const actor of [owner, administrator, outsider])
		await assert.rejects(
			actor.client.mutation(api.session_performance_reports.report, input),
		);
	await assert.rejects(
		guardian.client.mutation(api.session_performance_reports.report, {
			...input,
			reason: " ",
		}),
	);
	await assert.rejects(
		guardian.client.mutation(api.session_performance_reports.report, {
			...input,
			revision: 0,
		}),
	);
	await Promise.all(
		Array.from({ length: 3 }, () =>
			guardian.client.mutation(api.session_performance_reports.report, input),
		),
	);
	const reports = (
		await administrator.client.query(api.moderation.queue, {})
	).reports.filter((report) => report.source?.id === id);
	assert.equal(reports.length, 1);
	const report = reports.at(0);
	assert(report);
	assert.equal(report.body, command.comments);
	assert.equal(report.source?.rating, 7);
	assert.equal(report.source?.personId, personId);
	assert.equal(report.source?.revision, 1);
	assert.equal(
		(await guardian.client.query(api.moderation.queue, {})).reports.length,
		0,
	);
	assert.equal(
		(
			await guardian.client.query(api.moderation.reportsPage, {
				view: "open",
				paginationOpts: { cursor: null, numItems: 20 },
			})
		).page.length,
		0,
	);
	assert.equal(
		(await outsider.client.query(api.moderation.queue, {})).reports.length,
		0,
	);
	for (const actor of [guardian, outsider])
		await assert.rejects(
			actor.client.mutation(api.moderation.review, {
				reportId: report._id,
				decision: "removed",
				pauseChat: false,
			}),
		);
	await owner.client.mutation(api.session_performance.save, {
		...command,
		revision: 1,
		comments: "Newer coach wording",
		requestId: crypto.randomUUID(),
	});
	await assert.rejects(
		administrator.client.mutation(api.moderation.review, {
			reportId: report._id,
			decision: "removed",
			pauseChat: false,
		}),
	);
	assert.equal(
		(
			await player.client.query(api.session_performance.page, {
				personId,
				paginationOpts: { cursor: null, numItems: 20 },
			})
		).page.find((entry) => entry.id === id)?.comments,
		"Newer coach wording",
	);
	await administrator.client.mutation(api.moderation.review, {
		reportId: report._id,
		decision: "dismissed",
		pauseChat: false,
	});
	await guardian.client.mutation(api.session_performance_reports.report, {
		...input,
		revision: 2,
	});
	const currentReport = (
		await administrator.client.query(api.moderation.queue, {})
	).reports.find(
		(entry) => entry.source?.id === id && entry.source.revision === 2,
	);
	assert(currentReport);
	await administrator.client.mutation(api.moderation.review, {
		reportId: currentReport._id,
		decision: "removed",
		pauseChat: false,
	});
	await administrator.client.mutation(api.moderation.review, {
		reportId: currentReport._id,
		decision: "removed",
		pauseChat: false,
	});
	assert(
		!(
			await player.client.query(api.session_performance.page, {
				personId,
				paginationOpts: { cursor: null, numItems: 20 },
			})
		).page.some((entry) => entry.id === id),
	);
	await assert.rejects(
		owner.client.mutation(api.session_performance.save, {
			...command,
			revision: 3,
			requestId: crypto.randomUUID(),
			comments: "Cannot resurrect",
		}),
	);
	await owner.client.mutation(api.session_performance.save, command);
	assert.equal(
		(
			await owner.client.query(api.session_performance.current, {
				personId,
				eventId,
				kind: "coach",
			})
		)?.removed,
		true,
	);
	const selfId = await player.client.mutation(api.session_performance.save, {
		...command,
		kind: "self",
		requestId: crypto.randomUUID(),
	});
	await assert.rejects(
		guardian.client.mutation(api.session_performance_reports.report, {
			...input,
			id: selfId,
		}),
	);
	const pair = {
		sourceId: `reported-source-${crypto.randomUUID()}`,
		targetId: `reported-target-${crypto.randomUUID()}`,
	};
	for (const id of [pair.sourceId, pair.targetId]) {
		const member: Member = {
			id,
			name: id,
			programs: ["club"],
			position: "Forward",
			rating: 3,
			registration: "missing",
			goal: "",
			steps: 0,
		};
		await owner.client.mutation(api.club.apply, {
			action: { type: "add-member", member, charge: 0 },
		});
	}
	const mergeRating = await owner.client.mutation(
		api.session_performance.save,
		{ ...command, personId: pair.sourceId, requestId: crypto.randomUUID() },
	);
	await peer.client.mutation(api.session_performance_reports.report, {
		id: mergeRating,
		revision: 1,
		reason: "Review preserved source note",
	});
	await owner.client.mutation(api.club.apply, {
		action: {
			type: "set-member-archived",
			personId: pair.sourceId,
			archived: true,
		},
	});
	const mergeInput = { ...pair, fillEmptyProfile: false };
	const preview = await owner.client.query(
		api.member_merges.preview,
		mergeInput,
	);
	assert.equal(preview.conflicts.length, 0);
	assert(
		preview.counts.some(
			(row) =>
				row.label === "Session feedback reports relinked" && row.count === 1,
		),
	);
	await owner.client.mutation(api.member_merges.merge, {
		...mergeInput,
		token: preview.token,
		confirmation: pair.targetId,
		key: crypto.randomUUID(),
	});
	const mergedReport = (
		await administrator.client.query(api.moderation.queue, {})
	).reports.find((row) => row.source?.id === mergeRating);
	assert.equal(mergedReport?.source?.personId, pair.targetId);
	assert.equal(mergedReport?.body, command.comments);
	const peerRating = await peer.client.mutation(api.session_performance.save, {
		...command,
		requestId: crypto.randomUUID(),
	});
	await guardian.client.mutation(api.session_performance_reports.report, {
		id: peerRating,
		revision: 1,
		reason: "Review the other coach note",
	});
	const peerReport = (
		await administrator.client.query(api.moderation.queue, {})
	).reports.find((row) => row.source?.id === peerRating);
	assert(peerReport);
	await run.dispose(peer);
	const erasedAuthor = (
		await administrator.client.query(api.moderation.queue, {})
	).reports.find((row) => row._id === peerReport._id);
	assert(erasedAuthor);
	assert.equal(erasedAuthor.author, "Deleted account");
	assert.equal(erasedAuthor.body, "");
	assert.equal(erasedAuthor.subjectId, undefined);
	assert.equal(erasedAuthor.source, undefined);
	await run.dispose(player);
	const afterErasure = (
		await administrator.client.query(api.moderation.queue, {})
	).reports;
	assert(
		!afterErasure.some(
			(row) => row._id === report._id || row._id === currentReport._id,
		),
	);
	assert(afterErasure.some((row) => row._id === mergedReport?._id));
	console.log(
		"PASS: exact-reader/version note reporting, concurrent dedup, private admin snapshots, cross-club/own/self denial, stale removal refusal, tombstones/replay safety, report merge relinking and author/person erasure.",
	);
} finally {
	await run.close();
	console.log("Session-note report synthetic fixtures cleaned up.");
}
