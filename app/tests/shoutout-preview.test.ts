import { expect, test } from "bun:test";
import type { CoachingFeedback } from "../src/domain/app-types";
import { clubShoutoutPreview } from "../src/domain/shoutouts";

const account = { personId: "player", children: [] };

const shoutout = (
	id: string,
	date: string,
	extra: Partial<CoachingFeedback> = {},
): CoachingFeedback => ({
	id,
	date,
	kind: "shoutout",
	personId: "player",
	authorId: "private-author",
	body: "Great support play",
	visibility: "published",
	...extra,
});

test("shoutout previews select newest dates with a deterministic same-day order, not array insertion", (): void => {
	const entries = [
		shoutout("z", "2026-10-30"),
		shoutout("b", "2026-11-01"),
		shoutout("a", "2026-11-01"),
		shoutout("last-in-array", "2026-10-01"),
	];
	expect(
		clubShoutoutPreview(entries, [], account).map((entry) => entry.id),
	).toEqual(["b", "a", "z", "last-in-array"]);
	expect(entries.at(0)?.id).toBe("z");
});

test("shoutout previews keep author anonymity and exclude private coaching records", (): void => {
	const preview = clubShoutoutPreview(
		[
			shoutout("visible", "2026-11-01"),
			shoutout("private", "2026-11-02", { visibility: "private" }),
			shoutout("draft", "2026-11-03", { visibility: "draft" }),
			shoutout("coaching", "2026-11-04", { kind: "coaching" }),
		],
		[{ id: "player", name: "Player Name" }],
		account,
	);
	expect(preview).toHaveLength(1);
	expect(preview.at(0)).toMatchObject({
		id: "visible",
		authorId: "anonymous",
		personName: "Player Name",
	});
	expect(
		clubShoutoutPreview([shoutout("former", "2026-11-01")], [], account).at(0)
			?.personName,
	).toBe("Former player");
});

test("shoutout previews only contain the recipient household and selected profile", (): void => {
	const entries = [
		shoutout("own", "2026-11-01"),
		shoutout("other", "2026-11-02", { personId: "other" }),
		shoutout("child", "2026-11-03", { personId: "child" }),
	];
	expect(
		clubShoutoutPreview(entries, [], account).map((entry) => entry.id),
	).toEqual(["own"]);
	expect(
		clubShoutoutPreview(
			entries,
			[],
			{ ...account, children: ["child"] },
			"child",
		).map((entry) => entry.id),
	).toEqual(["child"]);
	expect(clubShoutoutPreview(entries, [], account, "other")).toEqual([]);
});
