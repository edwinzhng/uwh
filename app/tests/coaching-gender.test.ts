import { expect, test } from "bun:test";
import { initialAppData } from "../src/demo/app-data";
import {
	balancingProfileChanged,
	defaultPlayerCoaching,
	validatePlayerCoaching,
} from "../src/domain/player-coaching";

test("optional coaching gender never changes team balancing", () => {
	const member = initialAppData.members.at(0);
	if (!member) throw new Error("Missing fixture");
	const original = defaultPlayerCoaching(member);
	const recorded = {
		...original,
		gender: "female" as const,
		revision: original.revision + 1,
	};
	expect(() => validatePlayerCoaching(recorded)).not.toThrow();
	expect(balancingProfileChanged(original, recorded)).toBe(false);
	expect(
		balancingProfileChanged(recorded, { ...recorded, gender: undefined }),
	).toBe(false);
	expect(
		balancingProfileChanged(original, {
			...recorded,
			rating: original.rating + 1,
		}),
	).toBe(true);
	expect(
		balancingProfileChanged(original, { ...recorded, positions: [] }),
	).toBe(true);
});
