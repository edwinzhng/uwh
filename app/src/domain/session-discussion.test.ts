import { expect, test } from "bun:test";
import { initialAppData, primaryAccount } from "../demo/app-data";
import { isDirectThread } from "./messaging";
import { canDiscussSession, sessionThreadId } from "./session-discussion";

test("session conversations cannot be reused as a direct message with two accounts", () => {
	expect(
		isDirectThread(
			{
				id: sessionThreadId("practice"),
				eventId: "practice",
				title: "Practice",
				subtitle: "Session discussion",
				accountIds: ["a", "b"],
			},
			"a",
			"b",
		),
	).toBe(false);
	expect(sessionThreadId("practice")).toBe(sessionThreadId("practice"));
});
test("session access follows eligible household players and revokes when eligibility changes", () => {
	const event = initialAppData.events.at(0);
	const player = initialAppData.members.find(
		(entry) => entry.programs.length > 0,
	);
	if (!event || !player) throw new Error("Missing fixtures");
	const session = { ...event, program: player.programs.at(0) ?? "all" };
	const parent = {
		...primaryAccount,
		admin: false,
		coachPrograms: [],
		personId: "guardian",
		children: [player.id],
	};
	expect(
		canDiscussSession(parent, { ...session, eligiblePersonIds: [player.id] }, [
			player,
		]),
	).toBe(true);
	expect(
		canDiscussSession(parent, { ...session, eligiblePersonIds: ["other"] }, [
			player,
		]),
	).toBe(false);
	expect(
		canDiscussSession(parent, { ...session, program: "unrelated" }, [player]),
	).toBe(false);
	expect(canDiscussSession({ ...parent, children: [] }, event, [player])).toBe(
		false,
	);
	expect(canDiscussSession({ ...parent, admin: true }, event, [])).toBe(true);
	expect(
		canDiscussSession({ ...parent, coachPrograms: ["club"] }, event, []),
	).toBe(true);
});
