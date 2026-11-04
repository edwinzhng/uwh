import { expect, test } from "bun:test";
import { initialAppData } from "../src/demo/app-data";
import {
	balancingProfileChanged,
	defaultPlayerCoaching,
	playerRatingLabel,
	validatePlayerCoaching,
} from "../src/domain/player-coaching";

const member = initialAppData.members.at(0);
if (!member) throw new Error("Missing fixture member");

test("an unrecorded imported rating remains zero and explicitly unknown instead of becoming fifty", (): void => {
	const profile = defaultPlayerCoaching({
		...member,
		rating: 0,
		ratingKnown: false,
	});
	expect(profile.rating).toBe(0);
	expect(profile.ratingKnown).toBe(false);
	expect(playerRatingLabel(profile)).toBe("Not rated");
	expect(() => validatePlayerCoaching(profile)).not.toThrow();
	expect(() =>
		validatePlayerCoaching({ ...profile, gender: "female" }),
	).not.toThrow();
});

test("actual recorded zero and other source ratings remain distinct from unknown", (): void => {
	const zero = defaultPlayerCoaching({
		...member,
		rating: 0,
		ratingKnown: true,
	});
	expect(zero.rating).toBe(0);
	expect(playerRatingLabel(zero)).toBe("0");
	expect(() => validatePlayerCoaching(zero)).not.toThrow();
	expect(
		playerRatingLabel(defaultPlayerCoaching({ ...member, rating: 89 })),
	).toBe("89");
});

test("an intentional rating clears unknown state and invalid unknown payloads cannot hide actual values", (): void => {
	const previous = defaultPlayerCoaching({
		...member,
		rating: 0,
		ratingKnown: false,
	});
	const next = { ...previous, rating: 65, ratingKnown: true };
	expect(() => validatePlayerCoaching(next)).not.toThrow();
	expect(playerRatingLabel(next)).toBe("65");
	expect(balancingProfileChanged(previous, next)).toBe(true);
	expect(() => validatePlayerCoaching({ ...previous, rating: 65 })).toThrow();
	expect(() =>
		validatePlayerCoaching({ ...previous, rating: Number.NaN }),
	).toThrow();
});
