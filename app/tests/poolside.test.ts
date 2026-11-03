import { expect, test } from "bun:test";
import { initialAppData, primaryAccount } from "../src/demo/app-data";
import { avatarColors } from "../src/design-system/avatar-colors";
import type { CoachingFeedback } from "../src/domain/app-types";
import { coachingTasks } from "../src/domain/coaching-dashboard";
import { filteredConversations } from "../src/domain/conversation-sections";
import type { ConversationSummary } from "../src/domain/messaging";

test("soft avatar colors are deterministic and normalize whitespace/case", (): void => {
	expect(avatarColors("  Alex  Rivera ")).toEqual(avatarColors("alex rivera"));
	expect(avatarColors("Alex Rivera").foreground).not.toBe("#FFFFFF");
});

const thread = (
	id: string,
	extra: Partial<ConversationSummary> = {},
): ConversationSummary => ({
	id,
	title: id,
	subtitle: "",
	accountIds: [],
	unread: 0,
	readThrough: 0,
	updatedAt: 0,
	...extra,
});

test("chat filters preserve one chronological list without mutating input", (): void => {
	const threads = [
		thread("dm-a", { kind: "direct", unread: 2, updatedAt: 20 }),
		thread("session:a", { eventId: "a", updatedAt: 10 }),
		thread("group-a", { kind: "group", updatedAt: 30 }),
		thread("club"),
	];
	expect(
		filteredConversations(threads, "", "all").map((entry) => entry.id),
	).toEqual(["group-a", "dm-a", "session:a", "club"]);
	expect(
		filteredConversations(threads, "", "unread").map((entry) => entry.id),
	).toEqual(["dm-a"]);
	expect(
		filteredConversations(threads, "", "group").map((entry) => entry.id),
	).toEqual(["group-a"]);
	expect(
		filteredConversations(threads, "", "channel").map((entry) => entry.id),
	).toEqual(["session:a", "club"]);
	expect(
		filteredConversations(threads, "  DM-A  ", "all").map((entry) => entry.id),
	).toEqual(["dm-a"]);
	expect(filteredConversations(threads, "NO MATCH", "all")).toEqual([]);
	expect(threads.at(0)?.id).toBe("dm-a");
});

test("coaching tasks exclude other authors, private notes, shoutouts and inactive players", (): void => {
	const member = initialAppData.members.at(0);
	if (!member) throw new Error("Fixture member missing");
	const own: CoachingFeedback = {
		id: "own",
		personId: member.id,
		authorId: primaryAccount.id,
		visibility: "draft",
		date: "2026-10-29",
		body: "Draft",
		kind: "coaching",
	};
	const people = [
		{ ...member, pendingGoal: "New goal" },
		{ ...member, id: "archived", archived: true, pendingGoal: "Hidden" },
	];
	const tasks = coachingTasks(
		primaryAccount,
		[...people, people.at(0) ?? member],
		[
			own,
			{ ...own, id: "other", authorId: "another" },
			{ ...own, id: "private", visibility: "private" },
			{ ...own, id: "public", kind: "shoutout" },
			{ ...own, id: "inactive", personId: "archived" },
		],
	);
	expect(tasks.goals.map((person) => person.id)).toEqual([member.id]);
	expect(tasks.goals.at(0)).toEqual({
		id: member.id,
		name: member.name,
		pendingGoal: "New goal",
	});
	expect(tasks.drafts.map((entry) => entry.id)).toEqual(["own"]);
	expect(
		coachingTasks(
			{ ...primaryAccount, coachPrograms: [], admin: true },
			people,
			[own],
		),
	).toEqual({ goals: [], drafts: [], morePlayers: false, moreDrafts: false });
});
