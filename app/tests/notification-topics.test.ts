import { expect, test } from "bun:test";
import { initialAppData } from "../src/demo/app-data";
import {
	type InboxContext,
	type InboxSource,
	inboxContent,
	inboxRoute,
} from "../src/domain/inbox";
import { notificationPayload } from "../src/domain/notification-payload";
import {
	notificationPreferenceFor,
	resolvedNotificationPreferences,
} from "../src/domain/notification-preferences";
import { notificationPath } from "../src/domain/push-routing";

const person = initialAppData.members.find((entry) => entry.id === "sam");
const practice = initialAppData.events.find((entry) => entry.id === "club-thu");
if (!person || !practice) throw new Error("Notification fixtures required.");
const context: InboxContext = {
	account: {
		id: "guardian",
		personId: "parent",
		name: "Parent",
		children: [person.id],
		coachPrograms: [],
		admin: false,
	},
	people: [person],
	blocked: [],
	chatPaused: false,
	today: "2026-10-25",
	now: 1000,
	event: { ...practice, cancelled: false, eligiblePersonIds: [person.id] },
	responses: [],
};
test("granular preferences preserve coarse legacy opt-outs without exposing stored metadata", (): void => {
	const stored = {
		messages: false,
		feedback: false,
		events: false,
		userId: "private",
	};
	const value = resolvedNotificationPreferences(stored);
	expect(value.directMessages).toBe(false);
	expect(value.coachMessages).toBe(false);
	expect(value.shoutouts).toBe(false);
	expect(value.lineups).toBe(false);
	expect(value.plans).toBe(false);
	expect("userId" in value).toBe(false);
	expect(
		resolvedNotificationPreferences({ messages: false, directMessages: true })
			.directMessages,
	).toBe(true);
	expect(notificationPreferenceFor("messages", "chatAnnouncement")).toBe(
		"announcements",
	);
	expect(notificationPreferenceFor("announcements", "video")).toBe("videos");
});
test("published plans notify families only after publication and never from an earlier staff-only save job", (): void => {
	const source: InboxSource = {
		kind: "events",
		topic: "sessionPlan",
		entityId: practice.id,
	};
	expect(
		inboxContent(source, { ...context, planExists: true }),
	).toBeUndefined();
	const published = { ...context, planExists: true, planPublished: true };
	const value = inboxContent(source, published);
	expect(value?.target).toEqual({
		kind: "event",
		eventId: practice.id,
		tab: "overview",
		partId: undefined,
	});
	expect(
		inboxContent({ ...source, staffOnly: true }, published),
	).toBeUndefined();
	expect(
		inboxContent(source, {
			...published,
			account: { ...context.account, children: [] },
		}),
	).toBeUndefined();
	expect(
		inboxContent(source, {
			...context,
			planExists: true,
			account: { ...context.account, coachPrograms: ["club"] },
		})?.target,
	).toEqual({
		kind: "event",
		eventId: practice.id,
		tab: "coaching",
		partId: undefined,
	});
});
test("lineup inbox access follows current publication, attendance and derived validity", (): void => {
	const source: InboxSource = {
		kind: "events",
		topic: "lineup",
		entityId: practice.id,
	};
	const value: InboxContext = {
		...context,
		team: {
			eventId: practice.id,
			black: [person.id],
			white: [],
			attendees: [person.id],
			published: true,
		},
		responses: [
			{
				eventId: practice.id,
				personId: person.id,
				response: "going",
				attendance: "unmarked",
			},
		],
	};
	expect(inboxContent(source, value)?.target.kind).toBe("event");
	expect(inboxContent(source, { ...value, responses: [] })).toBeUndefined();
	expect(
		inboxContent(source, {
			...value,
			team: {
				...value.team,
				eventId: practice.id,
				black: [],
				white: [],
				attendees: [],
				published: false,
			},
		}),
	).toBeUndefined();
	expect(
		inboxContent(source, {
			...value,
			team: {
				eventId: practice.id,
				black: [person.id],
				white: [],
				attendees: [person.id],
				published: true,
				coachingStale: true,
			},
		}),
	).toBeUndefined();
});
test("coach action alerts recheck unresolved request revisions and not-attending state", (): void => {
	const coach: InboxContext = {
		...context,
		account: { ...context.account, coachPrograms: ["club"] },
		person: { ...person, pendingGoal: "New goal", pendingGoalRevision: 2 },
		response: {
			eventId: practice.id,
			personId: person.id,
			response: "unavailable",
			attendance: "unmarked",
			absenceReason: "Private detail",
		},
	};
	const request: InboxSource = {
		kind: "feedback",
		topic: "goalRequest",
		entityId: "member-row",
		sourceRevision: 2,
	};
	expect(inboxContent(request, coach)?.description).toBe(
		"A goal change is ready to review.",
	);
	expect(
		inboxContent({ ...request, sourceRevision: 1 }, coach),
	).toBeUndefined();
	expect(
		inboxContent(request, { ...coach, account: context.account }),
	).toBeUndefined();
	const decline: InboxSource = {
		kind: "events",
		topic: "rsvpNo",
		entityId: "response-row",
	};
	expect(inboxContent(decline, coach)?.description).not.toContain(
		"Private detail",
	);
	expect(
		inboxContent(decline, {
			...coach,
			response: {
				eventId: practice.id,
				personId: person.id,
				response: "going",
				attendance: "unmarked",
			},
		}),
	).toBeUndefined();
});
test("generic push payloads keep private text out and generated destinations pass the route allowlist", (): void => {
	const content = {
		kind: "announcements" as const,
		topic: "video" as const,
		title: "Private player name",
		description: "Private voice transcript",
		target: { kind: "resource" as const, resourceId: "resource-1" },
	};
	const payload = notificationPayload(
		{ kind: "announcements", topic: "video", entityId: "resource-1" },
		content,
	);
	expect(payload.body).toBe("A new video clip is available.");
	expect(JSON.stringify(payload)).not.toContain(content.title);
	expect(JSON.stringify(payload)).not.toContain(content.description);
	expect(notificationPath(payload.path)).toBe(payload.path);
	const route = notificationPayload(
		{ kind: "events", topic: "lineup", entityId: "event-1" },
		{
			kind: "events",
			topic: "lineup",
			title: "Teams",
			description: "",
			target: {
				kind: "event",
				eventId: "event-1",
				tab: "overview",
				partId: "training",
			},
		},
	);
	expect(notificationPath(route.path)).toBe(route.path);
	expect(inboxRoute({ kind: "resource", resourceId: "r" })).toEqual({
		pathname: "/resources",
		params: { id: "r" },
	});
});
