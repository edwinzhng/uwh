import { expect, test } from "bun:test";
import { initialAppData } from "../src/demo/app-data";

test("demo practice programs use weekdays and Thursday/Sunday have one session with two blocks", (): void => {
	const programs = initialAppData.programs ?? [];
	expect(programs.map((program) => program.name).sort()).toEqual([
		"Friday",
		"Monday",
		"Sunday",
		"Thursday",
	]);
	for (const name of ["Thursday", "Sunday"]) {
		const program = programs.find((entry) => entry.name === name);
		const sessions = initialAppData.events.filter(
			(event) => event.program === program?.id && event.kind !== "social",
		);
		expect(sessions.length).toBeGreaterThan(0);
		expect(new Set(sessions.map((event) => event.date)).size).toBe(
			sessions.length,
		);
		for (const session of sessions) {
			expect(session.parts?.map((part) => part.id)).toEqual([
				"training",
				"hockey",
			]);
			expect(session.parts?.at(0)?.start).toBe(session.start);
			expect(session.parts?.at(0)?.end).toBe(session.parts?.at(1)?.start);
			expect(session.parts?.at(1)?.end).toBe(session.end);
			expect(new Date(`${session.date}T12:00:00Z`).getUTCDay()).toBe(
				name === "Thursday" ? 4 : 0,
			);
		}
	}
});
