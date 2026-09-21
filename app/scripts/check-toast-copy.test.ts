import { expect, test } from "bun:test";
import {
	resolveToastCopy,
	toastMessages,
} from "../src/design-system/toast-messages";
import { validToastCopy } from "./check-toast-copy";

test("all catalog messages have a subject and useful detail", (): void => {
	for (const message of Object.values(toastMessages))
		expect(validToastCopy(message)).toBe(true);
});
test("rejects vague, missing, excessive or celebratory copy", (): void => {
	for (const title of [
		"Saved name",
		"",
		"x".repeat(101),
		"Your profile was successfully updated",
	])
		expect(
			validToastCopy({
				title,
				description: "Your updated name appears on your account.",
			}),
		).toBe(false);
	expect(
		validToastCopy({ title: "Your account name was updated", description: "" }),
	).toBe(false);
});
test("profile switches retain the subject of each action", (): void => {
	const first = resolveToastCopy("switchedProfile", { subject: "Sam" });
	const second = resolveToastCopy("switchedProfile", { subject: "Edwin" });
	expect(first.title).toBe("You’re now viewing Sam’s profile");
	expect(second.title).toBe("You’re now viewing Edwin’s profile");
});
test("invite messages identify their recipient and preserve delivery wording", (): void => {
	const copy = resolveToastCopy("sentInvite", { subject: "sam@example.com" });
	expect(copy.title).toBe("An invite for sam@example.com is queued");
	expect(copy.description).toContain("delivery status");
});
test("empty subjects fall back to meaningful copy and details can describe the change", (): void => {
	expect(resolveToastCopy("savedName", { subject: "  " })).toEqual(
		toastMessages.savedName,
	);
	expect(
		resolveToastCopy("savedNotifications", {
			subject: "Messages",
			description: "Messages alerts are now disabled for your account.",
		}).description,
	).toContain("disabled");
});
