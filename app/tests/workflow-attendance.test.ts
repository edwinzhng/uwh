import { expect, test } from "bun:test";
import { initialAppData, primaryAccount } from "../src/demo/app-data";
import { reduceApp } from "../src/domain/app-reducer";
import type { AppAction, EventResponse } from "../src/domain/app-types";
import {
	attendanceForPart,
	participatesInPart,
} from "../src/domain/practice-parts";

const practice = initialAppData.events.find((event) => event.id === "club-thu");
const person = initialAppData.members.at(0);
if (!practice || !person) throw new Error("Missing two-part practice fixture");
const marks = ["unmarked", "present", "late", "absent"] as const;
const responses = ["going", "unavailable", "unanswered"] as const;
const parts: readonly (readonly string[] | undefined)[] = [
	undefined,
	["training"],
	["hockey"],
];

test("exhaustive attendance transitions preserve RSVP, other parts and history; reject revoked permissions and cancellation; retries are idempotent", (): void => {
	const cases = responses.flatMap((response) =>
		parts.flatMap((partIds) =>
			marks.flatMap((training) =>
				marks.map(
					(hockey): EventResponse => ({
						eventId: practice.id,
						personId: person.id,
						response,
						attendance: "unmarked",
						partIds: partIds ? [...partIds] : undefined,
						partAttendance: [
							{ partId: "training", attendance: training },
							{ partId: "hockey", attendance: hockey },
						],
					}),
				),
			),
		),
	);
	const targets = [undefined, "training", "hockey"];
	for (const previous of cases)
		for (const partId of targets)
			for (const attendance of marks)
				for (const lateAddition of [false, true])
					for (const authorized of [false, true])
						for (const cancelled of [false, true]) {
							const event = { ...practice, cancelled };
							const actor = authorized
								? primaryAccount
								: { ...primaryAccount, admin: false, coachPrograms: [] };
							const data = {
								...initialAppData,
								events: [event],
								responses: [previous],
							};
							const action: Extract<AppAction, { type: "attendance" }> = {
								type: "attendance",
								eventId: event.id,
								personId: person.id,
								partId,
								attendance,
								lateAddition,
							};
							const denied =
								!authorized ||
								cancelled ||
								(partId !== undefined &&
									!lateAddition &&
									!participatesInPart(previous, partId));
							if (denied) {
								expect(() => reduceApp(data, actor, action)).toThrow();
								continue;
							}
							const next = reduceApp(data, actor, action);
							const saved = next.responses.at(0);
							expect(saved?.response).toBe(previous.response);
							expect(next.responses).toHaveLength(1);
							if (partId) {
								const other = partId === "training" ? "hockey" : "training";
								expect(saved && attendanceForPart(saved, other)).toBe(
									attendanceForPart(previous, other),
								);
								expect(saved && attendanceForPart(saved, partId)).toBe(
									attendance,
								);
							}
							expect(reduceApp(next, actor, action).responses).toEqual(
								next.responses,
							);
							expect(data.responses.at(0)).toBe(previous);
						}
});
