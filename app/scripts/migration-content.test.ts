import { expect, test } from "bun:test";
import type { Id } from "../convex/_generated/dataModel";
import {
	buildMigrationContent,
	type MigrationContentInput,
} from "./migration-content";

const ownerId = "fixture-owner-user" as Id<"users">;
const coachId = "fixture-coach-user" as Id<"users">;
const created = "2026-03-05T18:01:02.000Z";
const updated = "2026-03-06T19:01:02.000Z";
const source = { created_date: created, updated_date: updated };
const players: Record<string, string>[] = [
	{
		...source,
		id: "p1",
		full_name: "Player One",
		email: "player@example.test",
		program_id: "source-program",
		focus_goal: "Support the pass",
		goal_progress: JSON.stringify([
			{ session_number: 1, progress_note: "Kept more space", rating: 5 },
			{ session_number: 2, progress_note: "", rating: 3 },
		]),
	},
	{ ...source, id: "p2", full_name: "Coach Two", email: "coach@example.test" },
];
const input = (
	tables: MigrationContentInput["tables"],
): MigrationContentInput => ({
	tables: { Player: players, ...tables },
	person: (id): string => {
		if (id !== "p1" && id !== "p2")
			throw new Error("Unresolved fixture person");
		return `person-${id}`;
	},
	author: (_name, email): Id<"users"> =>
		email?.toLowerCase() === "coach@example.test" ? coachId : ownerId,
	program: (id): string => `program-${id}`,
	session: (_program, number) =>
		number === "1"
			? { id: "event-one", date: "2026-03-01", title: "Training" }
			: undefined,
});

test("shoutouts preserve all category meanings, authors, dates, text and stable source IDs", (): void => {
	const categories = [
		"Really stood out tonight",
		"Had a great session",
		"Played above their usual level",
		"MVP of the session",
	];
	const result = buildMigrationContent(
		input({
			ShoutOut: categories.map((shoutout_type, index) => ({
				...source,
				id: `s${index}`,
				from_player_id: "p1",
				to_player_id: "p2",
				program_id: "source-program",
				session_number: "1",
				note: "  Excellent play  ",
				shoutout_type,
			})),
		}),
	);
	expect(result.feedback.map((entry) => entry.value.category)).toEqual([
		"stood_out",
		"great_session",
		"above_usual",
		"mvp",
	]);
	for (const [index, entry] of result.feedback.entries()) {
		expect(entry.sourceId).toBe(`ShoutOut:s${index}`);
		expect(entry.value.id).toBe(entry.sourceId);
		expect(entry.value.authorId).toBe(ownerId);
		expect(entry.value.personId).toBe("person-p2");
		expect(entry.value.eventId).toBe("event-one");
		expect(entry.value.body).toBe("  Excellent play  ");
		expect(entry.value.date).toBe("2026-03-05");
		expect(entry.value.visibility).toBe("published");
	}
});

test("review authors resolve through email, raw scores retain their scale, and no source snapshot finalizes a round", (): void => {
	const calls: { name: string; email?: string }[] = [];
	const args = input({
		PlayerScore: [5, 95].map((score, index) => ({
			...source,
			id: `score${index}`,
			player_id: "p1",
			coach_id: "not-a-player-id",
			coach_name: "Old coach label",
			coach_email: "COACH@example.test",
			score: String(score),
			round: "1",
		})),
	});
	const result = buildMigrationContent({
		...args,
		author: (name, email): Id<"users"> => {
			calls.push({ name, email });
			return coachId;
		},
	});
	expect(result.reviews.map((entry) => entry.value.rating)).toEqual([5, 95]);
	expect(
		result.reviews.every(
			(entry) =>
				entry.value.coachId === coachId && entry.value.status === "submitted",
		),
	).toBe(true);
	expect(calls.at(0)?.name).toBe("Coach Two");
	expect(result.rounds).toHaveLength(1);
	expect(result.rounds.at(0)?.value.status).toBe("open");
	expect(result.rounds.at(0)?.value.requiredCoachIds).toEqual([coachId]);
	expect(result.rounds.at(0)?.value.finalizedRating).toBeUndefined();
	expect(result.rounds.at(0)?.value.finalizedAt).toBeUndefined();
});

test("goal progress preserves 1–5 values and source snapshot timestamp without inventing session dates", (): void => {
	const result = buildMigrationContent(input({}));
	expect(result.reflections).toHaveLength(2);
	expect(result.reflections.map((entry) => entry.sourceId)).toEqual([
		"Player:p1:goal_progress:0",
		"Player:p1:goal_progress:1",
	]);
	expect(result.reflections.map((entry) => entry.value.selfRating)).toEqual([
		5, 3,
	]);
	expect(result.reflections.map((entry) => entry.value.checkIn)).toEqual([
		1, 2,
	]);
	expect(result.reflections.at(0)?.value.note).toBe("Kept more space");
	expect(result.reflections.at(1)?.value.note).toBe("");
	expect(
		result.reflections.every(
			(entry) => entry.value.createdAt === Date.parse(updated),
		),
	).toBe(true);
});

test("session feedback only links known sessions and returns normalized unresolved history separately", (): void => {
	const records = ["1", "9"].map((session_number) => ({
		...source,
		id: `feedback${session_number}`,
		session_number,
		player_id: "p1",
		program_id: "source-program",
		rating: "9",
		comments: "Good session",
		type: "player_self_rating",
	}));
	const result = buildMigrationContent(
		input({ PlayerSessionFeedback: records }),
	);
	expect(result.performance).toHaveLength(1);
	expect(result.performance.at(0)?.value.eventId).toBe("event-one");
	expect(result.performance.at(0)?.value.kind).toBe("self");
	expect(result.performance.at(0)?.value.authorKey).toBe("self");
	expect(result.performance.at(0)?.value.rating).toBe(9);
	expect(result.unlinked).toHaveLength(1);
	const unresolved = result.unlinked.at(0);
	expect(unresolved?.sourceId).toBe("PlayerSessionFeedback:feedback9");
	expect(unresolved?.sourceSessionNumber).toBe("9");
	expect(unresolved?.value).not.toHaveProperty("eventId");
	expect(unresolved?.value).not.toHaveProperty("eventDate");
	expect(unresolved?.value).not.toHaveProperty("eventTitle");
});

test("checkins preserve categorical energy and the source actor without synthesizing unmatched events", (): void => {
	const result = buildMigrationContent(
		input({
			SessionCheckin: ["tired", "average", "great"].map(
				(energy_level, index) => ({
					...source,
					id: `check${index}`,
					player_id: "p1",
					program_id: "source-program",
					session_number: "1",
					energy_level,
					created_by: "coach@example.test",
				}),
			),
		}),
	);
	expect(result.checkins.map((entry) => entry.value.energy)).toEqual([1, 3, 5]);
	expect(
		result.checkins.every((entry) => entry.value.actorId === coachId),
	).toBe(true);
	expect(
		result.checkins.every((entry) => entry.value.eventId === "event-one"),
	).toBe(true);
});

test("shared family email does not arbitrarily attach one player's name to the source actor", (): void => {
	const calls: { name: string; email?: string }[] = [];
	const args = input({
		Player: [
			...players,
			{
				id: "family",
				full_name: "Another family profile",
				email: "coach@example.test",
			},
		],
		SessionCheckin: [
			{
				...source,
				id: "check",
				player_id: "p1",
				program_id: "source-program",
				session_number: "1",
				energy_level: "average",
				created_by: "coach@example.test",
			},
		],
	});
	const result = buildMigrationContent({
		...args,
		author: (name, email): Id<"users"> => {
			calls.push({ name, email });
			return coachId;
		},
	});
	expect(result.checkins).toHaveLength(1);
	expect(calls).toContainEqual({ name: "", email: "coach@example.test" });
});

test("invalid source values fail explicitly rather than silently dropping or coercing history", (): void => {
	expect(() =>
		buildMigrationContent(
			input({
				Player: [{ id: "p1", goal_progress: "private malformed text" }],
			}),
		),
	).toThrow("Player:p1: invalid goal progress JSON");
	expect(() =>
		buildMigrationContent(
			input({
				ShoutOut: [
					{
						...source,
						id: "bad",
						from_player_id: "p1",
						to_player_id: "p2",
						shoutout_type: "Unknown",
					},
				],
			}),
		),
	).toThrow("unsupported shoutout category");
	expect(() =>
		buildMigrationContent(
			input({
				PlayerScore: [
					{
						...source,
						id: "bad",
						player_id: "p1",
						coach_name: "Coach Two",
						score: "",
						round: "1",
					},
				],
			}),
		),
	).toThrow("missing score");
	expect(() =>
		buildMigrationContent(
			input({
				SessionCheckin: [
					{ ...source, id: "bad", player_id: "p1", energy_level: "unknown" },
				],
			}),
		),
	).toThrow("unsupported energy level");
	expect(() =>
		buildMigrationContent(
			input({
				Player: [
					{
						...players.at(0),
						id: "p1",
						goal_progress: JSON.stringify([
							{ session_number: 1, progress_note: "", rating: 9 },
						]),
					},
				],
			}),
		),
	).toThrow("reflection rating");
});
