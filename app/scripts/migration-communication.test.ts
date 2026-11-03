import { expect, test } from "bun:test";
import type { Id } from "../convex/_generated/dataModel";
import { buildMigrationCommunication } from "./migration-communication";

type Input = Parameters<typeof buildMigrationCommunication>[0];
const userId = (key: string): Id<"users"> => key as Id<"users">;
const input = (extra: Partial<Input> = {}): Input => ({
	tables: {},
	person: (id): string => `person:${id}`,
	author: (_name, key): Id<"users"> => userId(key),
	program: (id): string => `program:${id}`,
	event: (): undefined => undefined,
	currentOwnerId: userId("owner@example.test"),
	...extra,
});
const thread = (id: string, emails: string[]): Record<string, string> => ({
	id,
	participant_emails: JSON.stringify(emails),
	participant_names: JSON.stringify(emails),
	participant_ids: JSON.stringify(emails.map((email) => `source:${email}`)),
});
const message = (
	id: string,
	sender: string,
	threadId?: string,
): Record<string, string> => ({
	id,
	message: `Message ${id}`,
	sender_name: sender,
	sender_email: sender,
	created_date: "2026-10-27T12:34:56.000000",
	...(threadId
		? { thread_id: threadId }
		: { program_id: "club-wide", channel: "group" }),
});

test("private historical conversations retain exact source actors and never grant the owner administrative access", (): void => {
	const plan = buildMigrationCommunication(
		input({
			tables: {
				DirectThread: [
					thread("own", ["owner@example.test", "coach@example.test"]),
					thread("other", ["a@example.test", "b@example.test"]),
				],
				DirectMessage: [
					message("mine", "coach@example.test", "own"),
					message("private", "a@example.test", "other"),
					message("old-alias", "old-a@example.test", "other"),
				],
			},
		}),
	);
	expect(plan.summary.ownerDirectThreads).toBe(1);
	expect(plan.summary.privateOtherDirectThreads).toBe(1);
	expect(plan.messages).toHaveLength(3);
	expect(
		plan.conversations.find((row) => row.value.id === "base44:thread:other")
			?.value.accountIds,
	).toEqual(["a@example.test", "b@example.test"]);
	expect(
		plan.requiredActors.some((actor) => actor.email === "old-a@example.test"),
	).toBe(true);
	expect(
		plan.unlinked.some((row) => row.feature === "historical sender identity"),
	).toBe(true);
});

test("actual reactions and copied images are preserved without synthetic polls, reads or cross-thread replies", (): void => {
	const calls: string[] = [];
	const first = {
		...message("first", "coach@example.test"),
		reactions: JSON.stringify([
			{ emoji: "🔥", user_emails: ["owner@example.test"] },
		]),
		image_urls: JSON.stringify(["https://source.example/image.png"]),
		is_announcement: "true",
	};
	const plan = buildMigrationCommunication(
		input({
			tables: {
				ChatMessage: [first],
				DirectThread: [thread("private", ["a@example.test", "b@example.test"])],
				DirectMessage: [
					{
						...message("reply", "a@example.test", "private"),
						reply_to_id: "first",
					},
				],
			},
			image: (id, url) => {
				calls.push(`${id}:${url}`);
				return { id: "copied-private-image", name: "image.png" };
			},
		}),
	);
	expect(calls).toHaveLength(1);
	expect(plan.messages.at(0)?.value.reactions).toEqual([
		{ emoji: "🔥", accountIds: ["owner@example.test"] },
	]);
	expect(plan.messages.at(0)?.value.images).toEqual([
		{ id: "copied-private-image", name: "image.png" },
	]);
	expect(
		plan.messages.find((row) => row.value.id === "base44:message:reply")?.value
			.replyToId,
	).toBeUndefined();
	expect(plan.unlinked.some((row) => row.feature === "reply")).toBe(true);
	expect(plan.notices.at(0)?.value).toMatchObject({
		date: "2026-10-27",
		expiresAt: "2026-10-27",
		acknowledgedBy: [],
	});
	expect(plan.messages.at(0)?.value.pollId).toBeUndefined();
});

test("historical coaches group uses source role membership, not current owner authority", (): void => {
	const plan = buildMigrationCommunication(
		input({
			tables: {
				Player: [
					{
						id: "owner",
						full_name: "Owner",
						email: "owner@example.test",
						role: "player",
						program_id: "monday",
					},
					{
						id: "coach",
						full_name: "Coach",
						email: "coach@example.test",
						role: "coach",
						program_id: "monday",
					},
				],
				ChatMessage: [
					{
						...message("staff", "coach@example.test"),
						program_id: "monday",
						channel: "coaches",
					},
				],
			},
		}),
	);
	expect(plan.conversations.at(0)?.value.accountIds).toEqual([
		"coach@example.test",
	]);
	expect(plan.conversations.at(0)?.value.id).toBe("base44:coaches:monday");
});

test("dated lineup IDs match the actual event and duplicate positions become explicit bench rotations", (): void => {
	const lineup = {
		id: "dated",
		event_id: "practice",
		black_formation: "1-3-2",
		white_formation: "1-3-2",
		black_assignments: JSON.stringify([
			{ player_id: "one", position: "CF" },
			{ player_id: "two", position: "CF" },
			{ player_id: "three", position: "LW" },
		]),
		white_assignments: JSON.stringify([{ player_id: "four", position: "CF" }]),
		published: "true",
	};
	const plan = buildMigrationCommunication(
		input({
			tables: { Lineup: [lineup] },
			event: (key) => ({
				id: key,
				title: "Practice",
				date: "2026-10-26",
				start: "20:30",
				end: "22:00",
				venue: "Pool",
				program: "club",
				kind: "training",
				signup: "closed",
				description: "",
				cancelled: false,
			}),
		}),
	);
	expect(plan.teams.at(0)?.value).toMatchObject({
		id: "base44:Event:practice",
		eventId: "base44:Event:practice",
		black: ["person:one", "person:three"],
		blackBench: ["person:two"],
		rotationSlots: [{ personId: "person:two", slot: 0 }],
	});
	expect(plan.teams.at(0)?.value.attendees).toContain("person:two");
});

test("undated lineup labels remain coach-only references and never become invented events", (): void => {
	const plan = buildMigrationCommunication(
		input({
			tables: {
				Lineup: [
					{
						id: "template",
						label: "Lineup – 4/8/2026",
						black_assignments: JSON.stringify([
							{
								player_id: "one",
								player_name: "Player One",
								position: "LF",
								cap_number: 7,
							},
						]),
						created_date: "2026-04-08T12:00:00Z",
						created_by: "coach@example.test",
					},
				],
			},
		}),
	);
	expect(plan.teams).toEqual([]);
	expect(plan.resources.at(0)?.value.audience).toBe("coaches");
	expect(plan.resources.at(0)?.value.description).toContain(
		"No linked practice was captured",
	);
	expect(plan.resources.at(0)?.value.description).toContain(
		"LF: Player One · cap 7",
	);
	expect(plan.unlinked.at(0)?.feature).toBe("lineup");
});

test("misaligned participant arrays recover verified source-user identities without shifting emails or inventing access", (): void => {
	const first = {
		...thread("known", ["a@example.test", "b@example.test"]),
		participant_ids: '["source-a","source-b"]',
	};
	const malformed = {
		...thread("malformed", ["a@example.test"]),
		participant_ids: '["source-a","source-b"]',
	};
	const plan = buildMigrationCommunication(
		input({ tables: { DirectThread: [first, malformed] } }),
	);
	expect(
		plan.conversations.find((row) => row.value.id === "base44:thread:malformed")
			?.value.accountIds,
	).toEqual(["a@example.test", "b@example.test"]);
	expect(plan.requiredActors.some((actor) => !actor.email)).toBe(false);
	expect(
		plan.unlinked.some((row) => row.feature === "participant source metadata"),
	).toBe(true);
});
