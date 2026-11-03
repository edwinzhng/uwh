import assert from "node:assert/strict";
import { ConvexHttpClient } from "convex/browser";
import { api, internal } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";
import type { EventDraft } from "../src/domain/app-types";
import { addDays } from "../src/domain/calendar-dates";
import { clubDate } from "../src/domain/event-time";
import type { InboxItem } from "../src/domain/inbox";
import { localRun } from "./local-checks";
import { createVerificationRun } from "./verification-fixtures";

const run = createVerificationRun("resources-inbox");
const items = async (
	client: ConvexHttpClient,
	unreadOnly = false,
	cursor: string | null = null,
): Promise<InboxItem[]> => {
	const page = await client.query(api.inbox.list, {
		unreadOnly,
		paginationOpts: { cursor, numItems: 40 },
	});
	return page.isDone
		? page.page
		: [...page.page, ...(await items(client, unreadOnly, page.continueCursor))];
};
const waitFor = async (
	client: ConvexHttpClient,
	predicate: (items: InboxItem[]) => boolean,
	attempt = 0,
): Promise<InboxItem[]> => {
	const result = await items(client);
	if (predicate(result)) return result;
	if (attempt >= 30)
		throw new Error("The expected inbox item was not delivered.");
	await Bun.sleep(100);
	return waitFor(client, predicate, attempt + 1);
};
try {
	const owner = await run.fixture("Inbox coach");
	await owner.client.mutation(api.club.create, {
		name: "Fictional inbox verification",
		samples: true,
	});
	const club = await owner.client.query(api.club.current, {});
	assert(club);
	const guardian = await run.fixture("Inbox guardian");
	await guardian.client.mutation(api.club.requestToJoin, {
		clubCode: club.inviteCode,
	});
	const guardianClub = await guardian.client.query(api.club.current, {});
	assert(guardianClub);
	await owner.client.mutation(api.club.setAccess, {
		accountId: guardianClub.account.id,
		children: ["sam"],
		coachPrograms: [],
		admin: false,
	});
	const outsider = await run.fixture("Other inbox club");
	await outsider.client.mutation(api.club.create, {
		name: "Fictional other inbox",
		samples: false,
	});
	for (const kind of [
		"messages",
		"events",
		"feedback",
		"announcements",
	] as const)
		await guardian.client.mutation(api.notifications.preferences, {
			kind,
			enabled: false,
		});
	assert.equal(
		(await guardian.client.query(api.notifications.settings, {})).devices,
		0,
	);
	await owner.client.mutation(api.club.apply, {
		action: {
			type: "settings",
			clubName: club.data.clubName,
			reminders: false,
		},
	});
	const today = clubDate(undefined, club.data.timeZone);
	const feedbackId = crypto.randomUUID();
	await owner.client.mutation(api.club.apply, {
		action: {
			type: "save-feedback",
			feedback: {
				id: feedbackId,
				personId: "sam",
				authorId: club.account.id,
				body: "Inbox private family coaching",
				visibility: "published",
				date: today,
			},
		},
	});
	const messageId = crypto.randomUUID();
	await owner.client.mutation(api.club.apply, {
		action: {
			type: "send-message",
			id: messageId,
			threadId: "club",
			body: "Inbox team message",
			time: "12:00",
		},
	});
	const noticeId = crypto.randomUUID();
	await owner.client.mutation(api.club.apply, {
		action: {
			type: "create-notice",
			notice: {
				id: noticeId,
				title: "Inbox club announcement",
				body: "Bring both sticks",
				program: "youth",
				date: today,
				expiresAt: addDays(today, 3),
				acknowledgedBy: [],
			},
		},
	});
	const eventKey = crypto.randomUUID();
	const draft: EventDraft = {
		title: "Inbox registration",
		date: addDays(today, 1),
		start: "19:00",
		end: "20:00",
		venue: "Fictional pool",
		program: "club",
		kind: "hockey",
		repeat: "once",
		signupOpens: "now",
		signupCloses: "start",
		eligiblePersonIds: ["sam"],
		description: "Verification practice",
	};
	await owner.client.mutation(api.club.apply, {
		action: { type: "create-event", id: eventKey, draft },
	});
	const delivered = await waitFor(
		guardian.client,
		(rows) => new Set(rows.map((row) => row.kind)).size === 4,
	);
	const feedback = delivered.find((item) => item.kind === "feedback");
	const message = delivered.find((item) => item.kind === "messages");
	const event = delivered.find((item) => item.kind === "events");
	const announcement = delivered.find((item) => item.kind === "announcements");
	assert(feedback && message && event && announcement);
	assert(delivered.every((item) => !item.readAt));
	const anonymous = new ConvexHttpClient("http://127.0.0.1:3210", {
		logger: false,
	});
	await assert.rejects(items(anonymous));
	for (const client of [anonymous, outsider.client, owner.client])
		await assert.rejects(
			client.mutation(api.inbox.open, { id: feedback.id as Id<"inboxItems"> }),
		);
	assert.deepEqual(
		await guardian.client.mutation(api.inbox.open, {
			id: feedback.id as Id<"inboxItems">,
		}),
		{ kind: "feedback", personId: "sam", tab: "feedback" },
	);
	assert(
		!(await items(guardian.client, true)).some(
			(item) => item.id === feedback.id,
		),
	);
	await guardian.client.mutation(api.inbox.setRead, {
		id: feedback.id as Id<"inboxItems">,
		read: false,
	});
	assert(
		(await items(guardian.client, true)).some(
			(item) => item.id === feedback.id,
		),
	);
	await guardian.client.mutation(api.club.apply, {
		action: {
			type: "respond",
			eventId: `${eventKey}-0`,
			personId: "sam",
			response: "going",
		},
	});
	assert.deepEqual(
		await guardian.client.mutation(api.inbox.open, {
			id: event.id as Id<"inboxItems">,
		}),
		{ kind: "event", eventId: `${eventKey}-0` },
	);
	const inspected = await localRun(
		"local_checks:inspect",
		internal.local_checks.inspect,
		{
			userId: guardianClub.account.id as Id<"users">,
			clubId: club.clubId,
		},
	);
	const job = inspected.jobs.find((item) => item.entityId === feedbackId);
	assert(job);
	await localRun("notifications:fanout", internal.notifications.fanout, {
		jobId: job._id,
	});
	assert.equal(
		(await items(guardian.client)).filter((item) => item.id === feedback.id)
			.length,
		1,
	);
	assert.equal(inspected.deliveries.length, 0);
	await owner.client.mutation(api.club.setAccess, {
		accountId: guardianClub.account.id,
		children: [],
		coachPrograms: [],
		admin: false,
	});
	assert(
		!(await items(guardian.client)).some(
			(item) =>
				item.id === feedback.id ||
				item.id === announcement.id ||
				item.id === event.id,
		),
	);
	await assert.rejects(
		guardian.client.mutation(api.inbox.open, {
			id: feedback.id as Id<"inboxItems">,
		}),
	);
	await owner.client.mutation(api.club.setAccess, {
		accountId: guardianClub.account.id,
		children: ["sam"],
		coachPrograms: [],
		admin: false,
	});
	const privateFeedbackId = crypto.randomUUID();
	await owner.client.mutation(api.club.apply, {
		action: {
			type: "save-feedback",
			feedback: {
				id: privateFeedbackId,
				personId: "sam",
				authorId: club.account.id,
				body: "Private coach note must never appear",
				visibility: "private",
				date: today,
			},
		},
	});
	assert(
		!(await items(guardian.client)).some((item) =>
			item.description.includes("Private coach note"),
		),
	);
	await owner.client.mutation(api.club.apply, {
		action: { type: "set-member-archived", personId: "sam", archived: true },
	});
	assert(
		!(await items(guardian.client)).some(
			(item) =>
				item.id === feedback.id ||
				item.id === announcement.id ||
				item.id === event.id,
		),
	);
	await owner.client.mutation(api.club.apply, {
		action: { type: "set-member-archived", personId: "sam", archived: false },
	});
	await guardian.client.mutation(api.moderation.block, {
		targetId: club.account.id,
		blocked: true,
	});
	assert(
		!(await items(guardian.client)).some((item) => item.id === message.id),
	);
	await assert.rejects(
		guardian.client.mutation(api.inbox.open, {
			id: message.id as Id<"inboxItems">,
		}),
	);
	await guardian.client.mutation(api.moderation.block, {
		targetId: club.account.id,
		blocked: false,
	});
	await owner.client.mutation(api.club.apply, {
		action: { type: "delete-message", messageId },
	});
	assert(
		!(await items(guardian.client)).some((item) => item.id === message.id),
	);
	await assert.rejects(
		guardian.client.mutation(api.inbox.open, {
			id: message.id as Id<"inboxItems">,
		}),
	);
	const through = Date.now();
	await Bun.sleep(5);
	await owner.client.mutation(api.club.apply, {
		action: {
			type: "create-notice",
			notice: {
				id: crypto.randomUUID(),
				title: "New after mark-all cutoff",
				body: "Keep unread",
				program: "all",
				date: today,
				expiresAt: addDays(today, 3),
				acknowledgedBy: [],
			},
		},
	});
	await waitFor(guardian.client, (rows) =>
		rows.some((item) => item.title === "New after mark-all cutoff"),
	);
	await guardian.client.mutation(api.inbox.markAll, { through });
	assert(
		(await items(guardian.client, true)).some(
			(item) => item.title === "New after mark-all cutoff",
		),
	);
	await localRun("local_inbox_checks:seed", internal.local_inbox_checks.seed, {
		userId: guardianClub.account.id as Id<"users">,
		sourceId: announcement.id as Id<"inboxItems">,
		count: 105,
		hidden: false,
	});
	await localRun("local_inbox_checks:seed", internal.local_inbox_checks.seed, {
		userId: guardianClub.account.id as Id<"users">,
		sourceId: announcement.id as Id<"inboxItems">,
		count: 45,
		hidden: true,
	});
	const capped = await guardian.client.query(api.inbox.list, {
		unreadOnly: false,
		paginationOpts: { cursor: null, numItems: 5000 },
	});
	assert(capped.page.length <= 40);
	assert((await items(guardian.client)).length >= 108);
	const cutoff = Date.now();
	assert.equal(
		(await guardian.client.mutation(api.inbox.markAll, { through: cutoff }))
			.done,
		false,
	);
	assert.equal(
		(await guardian.client.mutation(api.inbox.markAll, { through: cutoff }))
			.done,
		true,
	);
	assert.equal((await items(guardian.client, true)).length, 0);
	assert.equal(
		(
			await localRun(
				"local_inbox_checks:inspect",
				internal.local_inbox_checks.inspect,
				{ userId: guardianClub.account.id as Id<"users"> },
			)
		).unread,
		0,
	);
	await owner.client.mutation(api.club.apply, {
		action: { type: "expire-notice", noticeId },
	});
	await assert.rejects(
		guardian.client.mutation(api.inbox.open, {
			id: announcement.id as Id<"inboxItems">,
		}),
	);
	await guardian.client.mutation(api.club.apply, {
		action: {
			type: "send-message",
			id: crypto.randomUUID(),
			threadId: "club",
			body: "Inbox owner cleanup fixture",
			time: "12:30",
		},
	});
	await waitFor(owner.client, (rows) =>
		rows.some((item) =>
			item.description.includes("Inbox owner cleanup fixture"),
		),
	);
	await run.dispose(guardian);
	assert.equal(
		await localRun(
			"local_inbox_checks:remaining",
			internal.local_inbox_checks.remaining,
			{ userId: guardianClub.account.id as Id<"users"> },
		),
		0,
	);
	await run.dispose(owner);
	assert.equal(
		await localRun(
			"local_inbox_checks:remaining",
			internal.local_inbox_checks.remaining,
			{ userId: club.account.id as Id<"users"> },
		),
		0,
	);
	console.log(
		"Inbox checks passed: all four sources, no-device/push-opt-out delivery, typed authorized opens, persistent read/unread, retry fanout deduplication, guardian/program/archive/privacy/block/deletion revocation, bounded filtered paging, mark-all batching/new-item cutoff, account and club cleanup.",
	);
} finally {
	await run.close();
}
