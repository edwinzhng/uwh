import assert from "node:assert/strict";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";
import type { EventDraft } from "../src/domain/app-types";
import { addDays } from "../src/domain/calendar-dates";
import { clubDate } from "../src/domain/event-time";
import type { InboxItem } from "../src/domain/inbox";
import { lineupSnapshot } from "../src/domain/lineup";
import { personRecipientId } from "../src/domain/message-recipients";
import {
	type NotificationTopic,
	notificationPreferenceOptions,
} from "../src/domain/notification-preferences";
import { createVerificationRun } from "./verification-fixtures";

const run = createVerificationRun("resources-inbox-topics");
const inbox = async (
	client: ConvexHttpClient,
	cursor: string | null = null,
): Promise<InboxItem[]> => {
	const page = await client.query(api.inbox.list, {
		unreadOnly: false,
		paginationOpts: { cursor, numItems: 40 },
	});
	return page.isDone
		? page.page
		: [...page.page, ...(await inbox(client, page.continueCursor))];
};
const waitTopic = async (
	client: ConvexHttpClient,
	topic: NotificationTopic,
	attempt = 0,
): Promise<InboxItem> => {
	const item = (await inbox(client)).find((item) => item.topic === topic);
	if (item) return item;
	if (attempt > 40) throw new Error(`Missing inbox topic: ${topic}`);
	await Bun.sleep(100);
	return waitTopic(client, topic, attempt + 1);
};
try {
	const owner = await run.fixture("Notification coach");
	await owner.client.mutation(api.club.create, {
		name: "Fictional notification topics",
		samples: true,
	});
	const club = await owner.client.query(api.club.current, {});
	assert(club);
	const guardian = await run.fixture("Notification guardian");
	const coach = await run.fixture("Notification second coach");
	const groupMember = await run.fixture("Notification private group member");
	for (const fixture of [guardian, coach, groupMember])
		await fixture.client.mutation(api.club.requestToJoin, {
			clubCode: club.inviteCode,
		});
	const family = await guardian.client.query(api.club.current, {});
	const staff = await coach.client.query(api.club.current, {});
	const guest = await groupMember.client.query(api.club.current, {});
	assert(family && staff && guest);
	await owner.client.mutation(api.club.setAccess, {
		accountId: family.account.id,
		children: ["sam", "taylor"],
		coachPrograms: [],
		admin: false,
	});
	await owner.client.mutation(api.club.setAccess, {
		accountId: staff.account.id,
		children: [],
		coachPrograms: ["club"],
		admin: false,
	});
	await owner.client.mutation(api.club.setAccess, {
		accountId: guest.account.id,
		children: [],
		coachPrograms: [],
		admin: false,
	});
	await guardian.client.mutation(api.notifications.preferences, {
		kind: "messages",
		enabled: false,
	});
	assert.equal(
		(await guardian.client.query(api.notifications.settings, {})).preferences
			.directMessages,
		false,
	);
	await guardian.client.mutation(api.notifications.preferences, {
		kind: "directMessages",
		enabled: true,
	});
	const preferences = (
		await guardian.client.query(api.notifications.settings, {})
	).preferences;
	assert.equal(preferences.directMessages, true);
	assert.equal(preferences.messages, false);
	for (const fixture of [guardian, coach])
		for (const preference of notificationPreferenceOptions)
			await fixture.client.mutation(api.notifications.preferences, {
				kind: preference.key,
				enabled: false,
			});
	const today = clubDate(undefined, club.data.timeZone);
	const videoId = await owner.client.mutation(api.resources.save, {
		key: crypto.randomUUID(),
		revision: 0,
		title: "Tagged training video",
		description: "Private coaching description",
		kind: "video",
		audience: "players",
		personIds: ["sam"],
		url: "https://example.com/video",
	});
	await owner.client.mutation(api.resources.save, {
		key: crypto.randomUUID(),
		revision: 0,
		title: "Scoped team document",
		description: "",
		kind: "document",
		audience: "programs",
		personIds: [],
		programIds: ["youth"],
		category: "rules",
		url: "https://example.com/rules",
	});
	const video = await waitTopic(guardian.client, "video");
	await waitTopic(guardian.client, "document");
	assert.deepEqual(
		await guardian.client.mutation(api.inbox.open, {
			id: video.id as Id<"inboxItems">,
		}),
		{ kind: "resource", resourceId: videoId },
	);
	await owner.client.mutation(api.resources.archive, {
		id: videoId,
		revision: 1,
		archived: true,
	});
	await assert.rejects(
		guardian.client.mutation(api.inbox.open, {
			id: video.id as Id<"inboxItems">,
		}),
	);
	const key = crypto.randomUUID();
	const draft: EventDraft = {
		title: "Notification practice",
		date: addDays(today, 1),
		start: "19:00",
		end: "20:00",
		venue: "Fictional pool",
		program: "club",
		kind: "hockey",
		repeat: "once",
		signupOpens: "now",
		signupCloses: "start",
		eligiblePersonIds: ["sam", "taylor"],
		description: "",
	};
	await owner.client.mutation(api.club.apply, {
		action: { type: "create-event", id: key, draft },
	});
	const eventId = `${key}-0`;
	await guardian.client.mutation(api.club.apply, {
		action: { type: "respond", eventId, personId: "sam", response: "going" },
	});
	await guardian.client.mutation(api.club.apply, {
		action: { type: "respond", eventId, personId: "taylor", response: "going" },
	});
	await owner.client.mutation(api.club.apply, {
		action: { type: "generate-teams", eventId, expectedRevision: 0 },
	});
	const generated = (
		await owner.client.query(api.club.current, {})
	)?.data.teams.find((entry) => entry.eventId === eventId);
	assert(generated);
	await owner.client.mutation(api.club.apply, {
		action: {
			type: "publish-teams",
			eventId,
			expectedRevision: generated.revision ?? 0,
		},
	});
	const lineup = await waitTopic(guardian.client, "lineup");
	assert.deepEqual(
		await guardian.client.mutation(api.inbox.open, {
			id: lineup.id as Id<"inboxItems">,
		}),
		{ kind: "event", eventId, tab: "overview" },
	);
	const published = (
		await owner.client.query(api.club.current, {})
	)?.data.teams.find((entry) => entry.eventId === eventId);
	assert(published);
	await owner.client.mutation(api.club.apply, {
		action: {
			type: "save-lineup",
			eventId,
			expectedRevision: published.revision ?? 0,
			snapshot: lineupSnapshot(published),
		},
	});
	await assert.rejects(
		guardian.client.mutation(api.inbox.open, {
			id: lineup.id as Id<"inboxItems">,
		}),
	);
	await owner.client.mutation(api.session_plans.save, {
		eventId,
		revision: 0,
		requestId: crypto.randomUUID(),
		body: "Support the receiver",
		notes: "Private coaching note must stay private",
		media: [],
	});
	await waitTopic(coach.client, "sessionPlan");
	assert(
		!(await inbox(guardian.client)).some(
			(entry) => entry.topic === "sessionPlan",
		),
	);
	const plan = await owner.client.query(api.session_plans.state, { eventId });
	await owner.client.mutation(api.session_plans.publish, {
		eventId,
		revision: plan.revision,
		requestId: crypto.randomUUID(),
		published: true,
	});
	const shared = await waitTopic(guardian.client, "sessionPlan");
	assert.deepEqual(
		await guardian.client.mutation(api.inbox.open, {
			id: shared.id as Id<"inboxItems">,
		}),
		{ kind: "event", eventId, tab: "overview" },
	);
	assert(
		!(await inbox(guardian.client)).some((entry) =>
			entry.description.includes("Private coaching note"),
		),
	);
	const sharedState = await owner.client.query(api.session_plans.state, {
		eventId,
	});
	await owner.client.mutation(api.session_plans.publish, {
		eventId,
		revision: sharedState.revision,
		requestId: crypto.randomUUID(),
		published: false,
	});
	await assert.rejects(
		guardian.client.mutation(api.inbox.open, {
			id: shared.id as Id<"inboxItems">,
		}),
	);
	await guardian.client.mutation(api.club.apply, {
		action: {
			type: "respond",
			eventId,
			personId: "sam",
			response: "unavailable",
		},
	});
	const no = await waitTopic(coach.client, "rsvpNo");
	assert.deepEqual(
		await coach.client.mutation(api.inbox.open, {
			id: no.id as Id<"inboxItems">,
		}),
		{ kind: "event", eventId, tab: "people" },
	);
	await guardian.client.mutation(api.club.apply, {
		action: { type: "respond", eventId, personId: "sam", response: "going" },
	});
	await assert.rejects(
		coach.client.mutation(api.inbox.open, { id: no.id as Id<"inboxItems"> }),
	);
	await owner.client.mutation(api.club.apply, {
		action: {
			type: "set-goal",
			personId: family.account.personId,
			goal: "Create a passing option",
		},
	});
	const player = (
		await owner.client.query(api.club.current, {})
	)?.data.members.find((entry) => entry.id === family.account.personId);
	assert(player);
	await guardian.client.mutation(api.club.apply, {
		action: {
			type: "request-goal",
			personId: player.id,
			goal: "Read passing options earlier",
			expectedRevision: player.goalRevision ?? 0,
			expectedPendingRevision: player.pendingGoalRevision ?? 0,
		},
	});
	const goal = await waitTopic(coach.client, "goalRequest");
	const requested = (
		await owner.client.query(api.club.current, {})
	)?.data.members.find((entry) => entry.id === player.id);
	assert(requested?.pendingGoal);
	await owner.client.mutation(api.club.apply, {
		action: {
			type: "review-goal",
			personId: player.id,
			goal: requested.pendingGoal,
			requestRevision: requested.pendingGoalRevision,
			approve: false,
		},
	});
	await assert.rejects(
		coach.client.mutation(api.inbox.open, { id: goal.id as Id<"inboxItems"> }),
	);
	await guardian.client.mutation(api.goal_reflections.record, {
		personId: player.id,
		requestId: crypto.randomUUID(),
		goal: player.goal,
		goalRevision: player.goalRevision ?? 0,
		expectedSteps: player.steps,
		note: "Private player reflection",
		selfRating: 4,
	});
	const progress = await waitTopic(coach.client, "progress");
	assert(!progress.description.includes(player.goal));
	assert(!progress.description.includes("Private player reflection"));
	const planningGroup = await owner.client.mutation(api.messaging.createGroup, {
		groupId: `group-${crypto.randomUUID()}`,
		name: "Private planning",
		recipientIds: [
			personRecipientId(staff.account.personId),
			personRecipientId(guest.account.personId),
		],
	});
	await owner.client.mutation(api.club.apply, {
		action: {
			type: "send-message",
			id: crypto.randomUUID(),
			threadId: planningGroup,
			body: "Private planning notification",
			time: "12:00",
		},
	});
	await waitTopic(coach.client, "groupMessage");
	assert(
		!(await inbox(guardian.client)).some(
			(entry) => entry.topic === "groupMessage",
		),
	);
	const threadId = await owner.client.mutation(api.club.apply, {
		action: {
			type: "create-thread",
			id: crypto.randomUUID(),
			title: "Private",
			recipientId: family.account.id,
		},
	});
	assert(threadId);
	await owner.client.mutation(api.club.apply, {
		action: {
			type: "send-message",
			id: crypto.randomUUID(),
			threadId,
			body: "Direct notification",
			time: "12:01",
		},
	});
	await waitTopic(guardian.client, "directMessage");
	const configuration = await guardian.client.query(
		api.web_push.configuration,
		{},
	);
	assert.equal(configuration.configured, false);
	assert.equal(configuration.publicKey, undefined);
	assert.match(configuration.reason ?? "", /not configured/);
	const anonymous = new ConvexHttpClient("http://127.0.0.1:3210", {
		logger: false,
	});
	await assert.rejects(anonymous.query(api.web_push.configuration, {}));
	await assert.rejects(
		guardian.client.action(api.web_push_transport.test, {
			platform: "web",
			installationId: crypto.randomUUID(),
		}),
	);
	await assert.rejects(
		anonymous.action(api.web_push_transport.test, {
			platform: "web",
			installationId: crypto.randomUUID(),
		}),
	);
	console.log(
		"Notification topic checks passed: protected media/documents, published lineup revocation, private/published plan audiences and draft-save race guard, coach RSVP-no/goal/progress, staff/direct channels, granular preference compatibility and honest unconfigured browser/test state. No real push delivery attempted.",
	);
} finally {
	await run.close();
}
