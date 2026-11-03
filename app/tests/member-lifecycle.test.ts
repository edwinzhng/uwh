import { expect, test } from "bun:test";
import { initialAppData, primaryAccount } from "../src/demo/app-data";
import { reduceApp } from "../src/domain/app-reducer";
import { canRegister, eventAttendees } from "../src/domain/app-rules";
import { endMemberEnrollments } from "../src/domain/member-lifecycle";
import {
	currentSeriesEnrollment,
	enrollmentApplies,
	type SessionSeries,
} from "../src/domain/session-series";

test("archive and restore preserve person identity and historical data", (): void => {
	const archived = reduceApp(initialAppData, primaryAccount, {
		type: "set-member-archived",
		personId: "sam",
		archived: true,
	});
	const person = archived.members.find((member) => member.id === "sam");
	const event = initialAppData.events.at(0);
	if (!person || !event) throw new Error("Missing fixture");
	expect(person.archived).toBe(true);
	expect(person.archivedAt).toBeDefined();
	expect(archived.responses).toBe(initialAppData.responses);
	expect(archived.feedback).toBe(initialAppData.feedback);
	expect(archived.payments).toBe(initialAppData.payments);
	expect(canRegister(person, event)).toBe(false);
	expect(
		eventAttendees(archived, event.id).some(
			(member) => member.id === person.id,
		),
	).toBe(false);
	const restored = reduceApp(archived, primaryAccount, {
		type: "set-member-archived",
		personId: "sam",
		archived: false,
	});
	expect(restored.members.find((member) => member.id === "sam")).toMatchObject({
		id: "sam",
		archived: false,
		registration: person.registration,
		goal: person.goal,
	});
	expect(() =>
		reduceApp(
			initialAppData,
			{ ...primaryAccount, admin: false },
			{ type: "set-member-archived", personId: "sam", archived: true },
		),
	).toThrow();
});

test("archival ends future commitments without changing completed attendance or enrollment IDs", (): void => {
	const series: SessionSeries = {
		id: "series",
		seriesIds: ["series"],
		title: "Sample practice",
		enrollments: [
			{ personId: "sam", start: "2026-09-01", state: "committed" },
			{ personId: "mila", start: "2026-09-01", state: "committed" },
		],
	};
	const archived = endMemberEnrollments(series, "sam", "2026-10-25");
	const enrollment = archived.enrollments.find(
		(entry) => entry.personId === "sam",
	);
	if (!enrollment) throw new Error("Missing fixture");
	expect(enrollmentApplies(enrollment, "2026-10-24")).toBe(true);
	expect(enrollmentApplies(enrollment, "2026-10-26")).toBe(false);
	expect(
		archived.enrollments.find((entry) => entry.personId === "mila"),
	).toEqual(series.enrollments.at(1));
});

test("a commitment archived before its start cannot block explicit rejoining after restore", (): void => {
	const series: SessionSeries = {
		id: "future-series",
		seriesIds: ["future-series"],
		title: "Future practice",
		enrollments: [{ personId: "sam", start: "2026-11-01", state: "committed" }],
	};
	expect(currentSeriesEnrollment(series, "sam", "2026-10-25")?.state).toBe(
		"committed",
	);
	const archived = endMemberEnrollments(series, "sam", "2026-10-25");
	expect(archived.enrollments.at(0)?.end).toBe("2026-11-01");
	expect(
		currentSeriesEnrollment(archived, "sam", "2026-10-25"),
	).toBeUndefined();
	const rejoined: SessionSeries = {
		...archived,
		enrollments: [
			...archived.enrollments,
			{ personId: "sam", start: "2026-11-01", state: "committed" },
		],
	};
	expect(
		currentSeriesEnrollment(rejoined, "sam", "2026-10-25")?.end,
	).toBeUndefined();
	expect(currentSeriesEnrollment(rejoined, "sam", "2026-10-25")).toBe(
		rejoined.enrollments.at(1),
	);
});
