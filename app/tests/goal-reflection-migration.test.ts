import { expect, test } from "bun:test";
import { migratedGoalReflection } from "../src/domain/goal-reflection-migration";

test("goal check-ins become historical reflections without inventing practices or losing original ratings", () => {
	const timestamp = Date.parse("2026-11-05T02:00:00Z");
	const source = {
		id: "legacy-1",
		clubId: "club",
		personId: "player",
		authorId: "author",
		goal: "Improve passing",
		note: "Held the passing lane",
		selfRating: 3,
		createdAt: timestamp,
		checkIn: 2,
	};
	const result = migratedGoalReflection(source, "America/Edmonton", "Player");
	expect(result.eventId).toBe("goal-reflection:legacy-1");
	expect(result.eventDate).toBe("2026-11-04");
	expect(result.dateKind).toBe("recorded");
	expect(result.updatedAt).toBe(timestamp);
	expect(result.rating).toBe(6);
	expect(result.comments).toContain(source.note);
	expect(result.comments).toContain(source.goal);
	expect(result.comments).toContain("Original rating: 3/5");
	expect(result.comments).toContain("Check-in 2");
	expect(result.personId).toBe(source.personId);
	expect(result.authorId).toBe(source.authorId);
	expect(migratedGoalReflection(source, "America/Edmonton", "Player")).toEqual(
		result,
	);
});
