import { describe, expect, test } from "bun:test";
import { fitnessTestNameError } from "../src/domain/fitness-model";
import { validateGoal } from "../src/domain/goals";
import {
	type MemberProfileInput,
	memberProfileError,
} from "../src/domain/member-profile";
import {
	defaultProgramRsvp,
	type ProgramDraft,
	validateProgram,
} from "../src/domain/programs";
import {
	emptySessionPlan,
	nextSessionPlan,
	validateSessionPlan,
} from "../src/domain/session-plan";
import { termsError } from "../src/domain/terms";

const profile: MemberProfileInput = {
	name: "Player",
	email: "",
	phone: "",
	capNumber: "",
};
const program: ProgramDraft = {
	id: "practice",
	name: "Practice",
	status: "active",
	archived: false,
	kind: "hockey",
	rsvp: defaultProgramRsvp(),
};

describe("concise validation copy", () => {
	test("empty fields ask only for the missing value, not an unrelated length constraint", (): void => {
		expect(validateGoal(" ")).toBe("Add a goal");
		expect(memberProfileError({ ...profile, name: " " })).toBe("Add a name");
		expect(fitnessTestNameError(" ")).toBe("Add a test name");
		expect(validateProgram({ ...program, name: " " }, { seasons: [] })).toBe(
			"Add a program name",
		);
	});

	test("oversized values explain the actual limit and preserve inclusive boundaries", (): void => {
		expect(validateGoal("x".repeat(500))).toBeUndefined();
		expect(validateGoal("x".repeat(501))).toBe(
			"Keep the goal to 500 characters",
		);
		expect(
			memberProfileError({ ...profile, name: "x".repeat(80) }),
		).toBeUndefined();
		expect(memberProfileError({ ...profile, name: "x".repeat(81) })).toBe(
			"Keep the name to 80 characters",
		);
		expect(fitnessTestNameError("x".repeat(100))).toBeUndefined();
		expect(fitnessTestNameError("x".repeat(101))).toBe(
			"Keep the test name to 100 characters",
		);
		expect(
			validateProgram({ ...program, name: "x".repeat(101) }, { seasons: [] }),
		).toBe("Keep the program name to 100 characters");
	});

	test("optional contact fields remain optional while invalid values retain useful format guidance", (): void => {
		expect(memberProfileError(profile)).toBeUndefined();
		expect(memberProfileError({ ...profile, email: "not-email" })).toBe(
			"Enter a valid email",
		);
		expect(memberProfileError({ ...profile, phone: "123" })).toBe(
			"Use a phone number with 7–15 digits",
		);
		expect(memberProfileError({ ...profile, capNumber: "0" })).toBe(
			"Choose a cap number from 1–99",
		);
	});

	test("policy fields distinguish missing text, length and version format without weakening validation", (): void => {
		const terms = { version: "1.0", title: "Terms", body: "Approved policy" };
		expect(termsError({ ...terms, version: " " })).toBe("Add a version");
		expect(termsError({ ...terms, title: " " })).toBe("Add a title");
		expect(termsError({ ...terms, body: " " })).toBe(
			"Add the approved policy text",
		);
		expect(termsError({ ...terms, version: "x".repeat(41) })).toContain("40");
		expect(termsError({ ...terms, version: "-1" })).toContain(
			"letter or number",
		);
		expect(termsError({ ...terms, version: "1!" })).toContain("underscores");
		expect(
			termsError({ ...terms, version: "v1.0 _- release" }),
		).toBeUndefined();
		expect(termsError({ ...terms, title: "x".repeat(121) })).toContain("120");
		expect(termsError({ ...terms, body: "x".repeat(30001) })).toContain(
			"30,000",
		);
	});

	test("plan limits identify the failing field and attachments require uploaded images", (): void => {
		expect(
			validateSessionPlan({ ...emptySessionPlan(), body: "x".repeat(20001) }),
		).toBe("Keep the plan to 20,000 characters");
		expect(
			validateSessionPlan({ ...emptySessionPlan(), notes: "x".repeat(10001) }),
		).toBe("Keep notes to 10,000 characters");
		expect(
			validateSessionPlan({
				...emptySessionPlan(),
				media: [
					{
						id: "link",
						source: "link",
						label: "Clip",
						url: "http://example.test/clip",
					},
				],
			}),
		).toContain("uploaded images only");
	});

	test("stale plan errors retain both the recovery action and draft-preservation fact", (): void => {
		expect(() =>
			nextSessionPlan(
				{ ...emptySessionPlan(), revision: 1 },
				{
					...emptySessionPlan(),
					eventId: "practice",
					revision: 0,
					requestId: "fictional-plan-request",
				},
				0,
			),
		).toThrow("Session plan changed. Reopen it; your draft is kept.");
	});
});
