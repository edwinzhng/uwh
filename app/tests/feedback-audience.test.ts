import { expect, test } from "bun:test";
import {
	feedbackAudienceLabel,
	feedbackAudienceNames,
} from "../src/domain/feedback-audience";

test("feedback recipients include only the player and currently linked parents", (): void => {
	const accounts = [
		{ name: "Alexis Smith", personId: "alexis", children: ["rylan", "blake"] },
		{ name: "Brad Smith", personId: "brad", children: ["rylan"] },
		{ name: "Unrelated parent", personId: "other", children: ["other-child"] },
	];
	expect(
		feedbackAudienceLabel(
			feedbackAudienceNames(accounts, "rylan", "Rylan Smith"),
		),
	).toBe("Rylan Smith, Alexis Smith, and Brad Smith");
	expect(
		feedbackAudienceLabel(
			feedbackAudienceNames(accounts, "jordan", "Jordan Fryers"),
		),
	).toBe("Jordan Fryers");
	expect(
		feedbackAudienceNames(
			accounts.map((account) => ({ ...account, children: [] })),
			"rylan",
			"Rylan Smith",
		),
	).toEqual(["Rylan Smith"]);
});
