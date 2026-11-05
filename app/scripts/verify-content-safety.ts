import assert from "node:assert/strict";
import type { FunctionArgs } from "convex/server";
import { api, internal } from "../convex/_generated/api";
import type { Doc, Id } from "../convex/_generated/dataModel";
import type { ContentReference } from "../src/domain/content-report";
import { practicePartKey } from "../src/domain/practice-parts";
import { localRun } from "./local-checks";
import { createVerificationRun } from "./verification-fixtures";

if (
	process.env.EXPO_PUBLIC_CONVEX_URL !== "http://127.0.0.1:3210" ||
	process.env.EXPO_PUBLIC_CONVEX_SITE_URL !== "http://127.0.0.1:3211"
)
	throw new Error("Isolated local backend only.");
const run = createVerificationRun("content-safety");
try {
	const owner = await run.fixture("Content owner");
	await owner.client.mutation(api.club.create, {
		name: "Content safety fixtures",
		samples: true,
	});
	const workspace = await owner.client.query(api.club.current, {});
	assert(workspace);
	const author = await run.fixture("Content author");
	const reader = await run.fixture("Content reader");
	const observer = await run.fixture("Content observer");
	for (const fixture of [author, reader, observer])
		await fixture.client.mutation(api.club.requestToJoin, {
			clubCode: workspace.inviteCode,
		});
	const authorInfo = await author.client.query(api.club.current, {});
	const readerInfo = await reader.client.query(api.club.current, {});
	assert(authorInfo && readerInfo);
	await owner.client.mutation(api.club.setAccess, {
		accountId: authorInfo.account.id,
		children: [],
		coachPrograms: ["club"],
		admin: false,
	});
	const outsider = await run.fixture("Other club");
	await outsider.client.mutation(api.club.create, {
		name: "Other safety fixtures",
		samples: false,
	});
	const reportFor = async (
		source: ContentReference,
	): Promise<Doc<"chatReports">> => {
		const reports = (await owner.client.query(api.moderation.queue, {}))
			.reports;
		const report = reports.find(
			(row) =>
				row.contentSource?.kind === source.kind &&
				row.contentSource.id === source.id &&
				row.state === "open",
		);
		assert(report);
		return report;
	};
	const draft: FunctionArgs<typeof api.resources.save> = {
		key: crypto.randomUUID(),
		revision: 0,
		title: "Training fixture",
		description: "A fictional training reference",
		kind: "video",
		audience: "club",
		personIds: [],
		url: "https://youtu.be/dQw4w9WgXcQ",
	};
	const resourceId = await author.client.mutation(api.resources.save, draft);
	const resourceSource: ContentReference = {
		kind: "resource",
		id: resourceId,
		revision: 1,
	};
	await assert.rejects(
		outsider.client.mutation(api.content_reports.report, {
			source: resourceSource,
			reason: "Guessed foreign resource",
			blockAuthor: false,
		}),
	);
	await reader.client.mutation(api.content_reports.report, {
		source: resourceSource,
		reason: "Review fixture",
		blockAuthor: false,
	});
	await reader.client.mutation(api.content_reports.report, {
		source: resourceSource,
		reason: "Review fixture",
		blockAuthor: false,
	});
	const firstReport = await reportFor(resourceSource);
	assert.equal(
		(await owner.client.query(api.moderation.queue, {})).reports.filter(
			(row) => row.contentSource?.id === resourceId,
		).length,
		1,
	);
	await author.client.mutation(api.resources.save, {
		...draft,
		id: resourceId,
		revision: 1,
		description: "An updated reference",
	});
	await assert.rejects(
		owner.client.mutation(api.moderation.review, {
			reportId: firstReport._id,
			decision: "removed",
			pauseChat: false,
		}),
		/changed since/,
	);
	await owner.client.mutation(api.moderation.review, {
		reportId: firstReport._id,
		decision: "dismissed",
		pauseChat: false,
	});
	await reader.client.mutation(api.content_reports.report, {
		source: { ...resourceSource, revision: 2 },
		reason: "Updated fixture",
		blockAuthor: false,
	});
	await owner.client.mutation(api.moderation.review, {
		reportId: (await reportFor(resourceSource))._id,
		decision: "removed",
		pauseChat: false,
	});
	await assert.rejects(
		reader.client.query(api.resources.details, { id: resourceId }),
	);
	const retainedResource = await owner.client.mutation(api.resources.save, {
		...draft,
		key: crypto.randomUUID(),
	});
	await author.client.mutation(api.resources.comment, {
		id: retainedResource,
		key: crypto.randomUUID(),
		body: "Comment fixture",
	});
	const comment = (
		await reader.client.query(api.resources.details, { id: retainedResource })
	).comments.at(0);
	assert(comment);
	const commentSource: ContentReference = { kind: "comment", id: comment.id };
	await reader.client.mutation(api.content_reports.report, {
		source: commentSource,
		reason: "Comment review",
		blockAuthor: true,
	});
	assert(
		(
			await reader.client.query(api.moderation.status, {})
		).unavailableIds.includes(authorInfo.account.id),
	);
	assert.equal(
		(await reader.client.query(api.resources.details, { id: retainedResource }))
			.comments.length,
		0,
	);
	await reader.client.mutation(api.moderation.block, {
		targetId: authorInfo.account.id,
		blocked: false,
	});
	await owner.client.mutation(api.moderation.review, {
		reportId: (await reportFor(commentSource))._id,
		decision: "removed",
		pauseChat: false,
	});
	assert.equal(
		(await reader.client.query(api.resources.details, { id: retainedResource }))
			.comments.length,
		0,
	);
	const feedbackId = crypto.randomUUID();
	await author.client.mutation(api.club.apply, {
		action: {
			type: "save-feedback",
			feedback: {
				id: feedbackId,
				kind: "coaching",
				personId: readerInfo.account.personId,
				authorId: authorInfo.account.id,
				body: "Fictional private coaching feedback",
				visibility: "draft",
				date: "2026-11-05",
			},
		},
	});
	await author.client.mutation(api.club.apply, {
		action: { type: "publish-feedback", id: feedbackId },
	});
	await assert.rejects(
		observer.client.mutation(api.content_reports.report, {
			source: { kind: "feedback", id: feedbackId },
			reason: "Guessed private feedback",
			blockAuthor: false,
		}),
	);
	await reader.client.mutation(api.content_reports.report, {
		source: { kind: "feedback", id: feedbackId },
		reason: "Private feedback review",
		blockAuthor: false,
	});
	await owner.client.mutation(api.moderation.review, {
		reportId: (await reportFor({ kind: "feedback", id: feedbackId }))._id,
		decision: "removed",
		pauseChat: false,
	});
	assert(
		!(await reader.client.query(api.club.current, {}))?.data.feedback.some(
			(row) => row.id === feedbackId,
		),
	);
	const profileSource: ContentReference = {
		kind: "profile",
		id: authorInfo.account.personId,
	};
	await reader.client.mutation(api.content_reports.report, {
		source: profileSource,
		reason: "Profile review",
		blockAuthor: false,
	});
	await owner.client.mutation(api.moderation.review, {
		reportId: (await reportFor(profileSource))._id,
		decision: "removed",
		pauseChat: false,
	});
	assert.equal(
		(await author.client.query(api.account.current, {}))?.name,
		"Member",
	);
	await owner.client.mutation(api.chat_policy.save, {
		phrases: ["forbidden fixture"],
	});
	await assert.rejects(
		author.client.mutation(api.resources.save, {
			...draft,
			key: crypto.randomUUID(),
			title: "FORBIDDEN FIXTURE",
		}),
		/blocked phrase/,
	);
	await assert.rejects(
		author.client.mutation(api.resources.comment, {
			id: retainedResource,
			key: crypto.randomUUID(),
			body: "forbidden fixture",
		}),
		/blocked phrase/,
	);
	await assert.rejects(
		author.client.mutation(api.club.apply, {
			action: {
				type: "save-feedback",
				feedback: {
					id: crypto.randomUUID(),
					personId: readerInfo.account.personId,
					authorId: authorInfo.account.id,
					body: "forbidden fixture",
					visibility: "draft",
					date: "2026-11-05",
				},
			},
		}),
		/blocked phrase/,
	);
	const eventSeriesId = crypto.randomUUID();
	const event = { id: `${eventSeriesId}-0` };
	await owner.client.mutation(api.club.apply, {
		action: {
			type: "create-event",
			id: eventSeriesId,
			draft: {
				title: "Safety fixture practice",
				date: "2026-11-07",
				start: "18:00",
				end: "19:00",
				venue: "Fixture pool",
				program: "club",
				kind: "hockey",
				repeat: "once",
				occurrences: 1,
				signupOpens: "now",
				signupCloses: "start",
				description: "Fictional verification",
			},
		},
	});
	const currentPlan = await author.client.query(api.session_plans.state, {
		eventId: event.id,
	});
	await author.client.mutation(api.session_plans.save, {
		eventId: event.id,
		revision: currentPlan.revision,
		requestId: crypto.randomUUID(),
		body: "Published plan fixture",
		notes: "Private staff notes",
		media: [],
	});
	await author.client.mutation(api.session_plans.publish, {
		eventId: event.id,
		revision: currentPlan.revision + 1,
		requestId: crypto.randomUUID(),
		published: true,
	});
	const planSource: ContentReference = {
		kind: "sessionPlan",
		id: practicePartKey(event.id),
		revision: currentPlan.revision + 2,
	};
	await reader.client.mutation(api.content_reports.report, {
		source: planSource,
		reason: "Plan review",
		blockAuthor: false,
	});
	const planReport = await reportFor(planSource);
	assert(!planReport.body.includes("Private staff notes"));
	await owner.client.mutation(api.moderation.review, {
		reportId: planReport._id,
		decision: "removed",
		pauseChat: false,
	});
	assert.equal(
		await reader.client.query(api.session_plans.shared, { eventId: event.id }),
		null,
	);
	const uploaded = await fetch(
		"http://127.0.0.1:3211/resources/file?name=erasure.pdf",
		{
			method: "POST",
			headers: { Authorization: `Bearer ${author.token}` },
			body: new Blob(["%PDF-1.7\nErasure fixture\n%%EOF"], {
				type: "application/pdf",
			}),
		},
	);
	assert.equal(uploaded.status, 200);
	const file: { id: Id<"resourceFiles"> } = await uploaded.json();
	const document = await author.client.mutation(api.resources.save, {
		...draft,
		key: crypto.randomUUID(),
		kind: "document",
		fileId: file.id,
		url: undefined,
	});
	const storageId = await localRun(
		"local_content_checks:fileStorage",
		internal.local_content_checks.fileStorage,
		{ ownerId: authorInfo.account.id as Id<"users">, fileId: file.id },
	);
	assert(
		await localRun(
			"local_content_checks:storageExists",
			internal.local_content_checks.storageExists,
			{ storageId },
		),
	);
	await author.client.mutation(api.resources.comment, {
		id: retainedResource,
		key: crypto.randomUUID(),
		body: "Erase my comment",
	});
	await run.dispose(author);
	await assert.rejects(
		reader.client.query(api.resources.details, { id: document }),
	);
	assert.equal(
		await localRun(
			"local_content_checks:storageExists",
			internal.local_content_checks.storageExists,
			{ storageId },
		),
		false,
	);
	assert.equal(
		(await reader.client.query(api.resources.details, { id: retainedResource }))
			.comments.length,
		0,
	);
	console.log(
		"Content safety checks passed: cross-club/private report authorization, duplicate reports, stale-edit protection, resource/comment/profile/feedback/plan removal, block visibility, phrase filtering, account erasure and uploaded byte deletion.",
	);
} finally {
	await run.close();
}
