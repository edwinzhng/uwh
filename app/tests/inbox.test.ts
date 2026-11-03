import { describe, expect, test } from "bun:test";
import { initialAppData, primaryAccount } from "../src/demo/app-data";
import { previewInboxItems } from "../src/demo/inbox-state";
import type { Member } from "../src/domain/app-types";
import {
	type InboxContext,
	type InboxSource,
	inboxContent,
	inboxRoute,
} from "../src/domain/inbox";

const player: Member = {
	id: "child",
	name: "Player",
	programs: ["club"],
	position: "Forward",
	rating: 3,
	registration: "approved",
	goal: "Support",
	steps: 0,
};
const context: InboxContext = {
	account: {
		id: "guardian",
		personId: "parent",
		name: "Guardian",
		children: [player.id],
		coachPrograms: [],
		admin: false,
	},
	people: [player],
	blocked: [],
	chatPaused: false,
	today: "2026-10-25",
	now: 1000,
	responses: [],
};
const feedback: InboxSource = {
	kind: "feedback",
	entityId: "note",
	actorId: "coach",
};
const withFeedback = {
	...context,
	feedback: {
		id: "note",
		personId: player.id,
		authorId: "coach",
		body: "Find support early",
		visibility: "published",
		date: "2026-10-25",
	},
} satisfies InboxContext;
describe("durable inbox authorization", (): void => {
	test("coaching feedback routes to Feedback while legacy goal targets open Goals", (): void => {
		expect(
			inboxRoute({ kind: "feedback", personId: player.id, tab: "progress" }),
		).toEqual({ pathname: "/member", params: { id: player.id, tab: "goals" } });
		const target = inboxContent(feedback, withFeedback)?.target;
		if (!target) throw new Error("Feedback target required");
		expect(inboxRoute(target)).toEqual({
			pathname: "/member",
			params: { id: player.id, tab: "feedback" },
		});
		expect(
			inboxContent(
				{ kind: "feedback", entityId: player.id, topic: "progress" },
				{
					...context,
					account: { ...context.account, coachPrograms: ["club"] },
					person: player,
				},
			)?.target,
		).toEqual({ kind: "feedback", personId: player.id, tab: "progress" });
	});
	test("published household feedback becomes inaccessible after revocation, archive, merge or privacy changes", (): void => {
		expect(inboxContent(feedback, withFeedback)?.target).toEqual({
			kind: "feedback",
			personId: player.id,
			tab: "feedback",
		});
		expect(
			inboxContent(feedback, {
				...withFeedback,
				account: { ...context.account, children: [] },
			}),
		).toBeUndefined();
		for (const person of [
			{ ...player, archived: true },
			{ ...player, mergedInto: "other" },
		])
			expect(
				inboxContent(feedback, { ...withFeedback, people: [person] }),
			).toBeUndefined();
		for (const visibility of ["private", "draft"] as const)
			expect(
				inboxContent(feedback, {
					...withFeedback,
					feedback: { ...withFeedback.feedback, visibility },
				}),
			).toBeUndefined();
		expect(
			inboxContent(feedback, { ...withFeedback, blocked: ["coach"] }),
		).toBeUndefined();
	});
	test("message history rechecks participation, deletion, author blocks and paused chat", (): void => {
		const source: InboxSource = { kind: "messages", entityId: "m" };
		const messageContext = {
			...context,
			message: {
				id: "m",
				threadId: "t",
				accountId: "coach",
				author: "Coach",
				body: "Hello",
				time: "12:00",
			},
			thread: {
				id: "t",
				title: "Practice",
				subtitle: "",
				accountIds: ["guardian", "coach"],
			},
		} satisfies InboxContext;
		expect(inboxContent(source, messageContext)?.description).toBe(
			"Coach: Hello",
		);
		for (const change of [
			{ chatPaused: true },
			{ blocked: ["coach"] },
			{ thread: { ...messageContext.thread, accountIds: ["coach"] } },
			{ message: { ...messageContext.message, deleted: true } },
		])
			expect(
				inboxContent(source, { ...messageContext, ...change }),
			).toBeUndefined();
	});
	test("announcements recheck current program membership and expiry", (): void => {
		const source: InboxSource = { kind: "announcements", entityId: "notice" };
		const value = {
			...context,
			notice: {
				id: "notice",
				title: "Practice change",
				body: "Pool B",
				program: "club",
				date: "2026-10-25",
				acknowledgedBy: [],
			},
		} satisfies InboxContext;
		expect(inboxContent(source, value)?.target.kind).toBe("announcement");
		expect(
			inboxContent(source, { ...value, people: [{ ...player, programs: [] }] }),
		).toBeUndefined();
		expect(
			inboxContent(source, {
				...value,
				notice: { ...value.notice, expiresAt: context.today },
			}),
		).toBeUndefined();
	});
	test("delivered event history survives RSVP and closing while stale scheduled jobs do not deliver", (): void => {
		const source: InboxSource = {
			kind: "events",
			entityId: "event",
			eventPhase: "open",
			eventTimestamp: 100,
		};
		const sampleEvent = initialAppData.events.at(0);
		if (!sampleEvent) throw new Error("Event fixture required.");
		const value: InboxContext = {
			...context,
			event: {
				...sampleEvent,
				id: "event",
				opensAt: 100,
				closesAt: 2000,
				eligiblePersonIds: [player.id],
			},
		};
		expect(inboxContent(source, value, "delivery")?.target.kind).toBe("event");
		const answered: InboxContext = {
			...value,
			now: 3000,
			responses: [
				{
					eventId: "event",
					personId: player.id,
					response: "going",
					attendance: "unmarked",
				},
			],
		};
		expect(inboxContent(source, answered, "delivery")).toBeUndefined();
		expect(inboxContent(source, answered)?.target.kind).toBe("event");
		expect(
			inboxContent({ ...source, eventTimestamp: 99 }, value, "delivery"),
		).toBeUndefined();
	});
	test("targets are typed internal routes and preview read state is account-isolated", (): void => {
		expect(
			inboxRoute({ kind: "message", threadId: "t&x", messageId: "m" }),
		).toEqual({
			pathname: "/conversation",
			params: { id: "t&x" },
		});
		const first = previewInboxItems(initialAppData, primaryAccount, {}).at(0);
		expect(first).toBeDefined();
		if (!first) return;
		const markers = { [`${primaryAccount.id}:${first.id}`]: 100 };
		expect(
			previewInboxItems(initialAppData, primaryAccount, markers).find(
				(item) => item.id === first.id,
			)?.readAt,
		).toBe(100);
		expect(
			previewInboxItems(
				initialAppData,
				{ ...primaryAccount, id: "other" },
				markers,
			).find((item) => item.id === first.id)?.readAt,
		).toBeUndefined();
	});
});
