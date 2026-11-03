import { expect, test } from "bun:test";
import {
	type ProgramCommand,
	programCommandPayload,
	validateProgramRequestId,
} from "../src/domain/program-command";
import { defaultProgramRsvp } from "../src/domain/programs";

const action: ProgramCommand = {
	type: "save-program",
	requestId: "request-original",
	expectedRevision: 1,
	memberIds: ["taylor", "alex"],
	draft: {
		id: "club",
		name: "Club",
		archived: false,
		status: "active",
		kind: "hockey",
		rsvp: defaultProgramRsvp(),
	},
};
test("program retry identity ignores transport order and request key", () => {
	expect(programCommandPayload(action)).toBe(
		programCommandPayload({
			...action,
			requestId: "another-request",
			memberIds: ["alex", "taylor"],
		}),
	);
	expect(programCommandPayload(action)).not.toBe(
		programCommandPayload({ ...action, expectedRevision: 2 }),
	);
	expect(programCommandPayload(action)).not.toBe(
		programCommandPayload({
			...action,
			draft: { ...action.draft, name: "Changed" },
		}),
	);
});
test("program request IDs have a bounded safe format", () => {
	expect(() => validateProgramRequestId(crypto.randomUUID())).not.toThrow();
	expect(() => validateProgramRequestId("short")).toThrow();
	expect(() => validateProgramRequestId("x".repeat(121))).toThrow();
});
