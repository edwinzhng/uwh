import { describe, expect, test } from "bun:test";
import {
	type PreviewPoll,
	samePollDraft,
	summarizePoll,
	updatedPollCounts,
	validatePoll,
	validateVote,
} from "../src/domain/chat-polls";

const poll: PreviewPoll = {
	id: "poll",
	threadId: "club",
	createdBy: "coach",
	author: "Coach",
	question: "Practice focus?",
	options: ["Passing", "Support"],
	multiple: false,
	votes: { player: [1], coach: [0] },
};
describe("chat polls", () => {
	test("aggregate vote changes are exactly once and preserve multiple-choice totals", (): void => {
		expect(updatedPollCounts([0, 0], [], [1])).toEqual([0, 1]);
		expect(updatedPollCounts([0, 1], [1], [1])).toEqual([0, 1]);
		expect(updatedPollCounts([0, 1], [1], [0])).toEqual([1, 0]);
		expect(updatedPollCounts([1, 0], [0], [0, 1])).toEqual([1, 1]);
		expect(updatedPollCounts([1, 1], [0, 1], [])).toEqual([0, 0]);
	});
	test("replays accept only the same normalized payload", () => {
		expect(
			samePollDraft(poll, {
				...poll,
				question: " Practice focus? ",
				options: [" Passing ", "Support"],
			}),
		).toBe(true);
		expect(samePollDraft(poll, { ...poll, question: "A new question" })).toBe(
			false,
		);
		expect(
			samePollDraft(poll, { ...poll, options: ["Support", "Passing"] }),
		).toBe(false);
		expect(samePollDraft(poll, { ...poll, closesAt: 1000 })).toBe(false);
	});
	test("rejects empty, duplicate, oversized and expired drafts", () => {
		expect(validatePoll(poll)).toBeUndefined();
		expect(validatePoll({ ...poll, question: " " })).toBeDefined();
		expect(
			validatePoll({ ...poll, options: ["Passing", " passing "] }),
		).toBeDefined();
		expect(validatePoll({ ...poll, options: ["Passing"] })).toBeDefined();
		expect(validatePoll({ ...poll, closesAt: 1000 }, 1000)).toBeDefined();
	});
	test("single-choice votes stay unique and in range", () => {
		expect(validateVote(poll, [1])).toBeUndefined();
		for (const choices of [[], [0, 1], [1, 1], [-1], [2], [0.5], [Number.NaN]])
			expect(validateVote(poll, choices)).toBeDefined();
		expect(validateVote({ ...poll, multiple: true }, [0, 1])).toBeUndefined();
	});
	test("closing deadline and manual close are authoritative", () => {
		expect(validateVote({ ...poll, closesAt: 1000 }, [1], 1000)).toBe(
			"Poll closed",
		);
		expect(validateVote({ ...poll, closedAt: 500 }, [1], 1000)).toBe(
			"Poll closed",
		);
	});
	test("results stay hidden from nonvoters, including staff", () => {
		expect(summarizePoll(poll, "new-player", false).counts).toBeUndefined();
		expect(summarizePoll(poll, "other-coach", true).counts).toBeUndefined();
		expect(summarizePoll(poll, "player", false)).toMatchObject({
			selected: [1],
			counts: [1, 1],
			voters: 2,
		});
		expect(
			summarizePoll({ ...poll, closedAt: 500 }, "new-player", false).counts,
		).toEqual([1, 1]);
	});
	test("only author or staff can close and voter identities are not returned", () => {
		expect(summarizePoll(poll, "player", false).canClose).toBe(false);
		expect(summarizePoll(poll, "coach", false).canClose).toBe(true);
		expect(summarizePoll(poll, "other-coach", true).canClose).toBe(true);
		expect(
			summarizePoll({ ...poll, closedAt: 500 }, "coach", true).canClose,
		).toBe(false);
		expect(summarizePoll(poll, "player", false)).not.toHaveProperty("votes");
	});
});
