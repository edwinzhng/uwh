import { expect, test } from "bun:test";
import {
	resolveToastCopy,
	toastMessages,
} from "../src/design-system/toast-messages";
import { validToastCopy } from "./check-toast-copy";

test("catalog messages use concise titles and optional context", (): void => {
	for (const message of Object.values(toastMessages))
		expect(validToastCopy(message)).toBe(true);
});
test("rejects vague, missing, excessive or celebratory copy", (): void => {
	for (const title of [
		"Saved name",
		"",
		"x".repeat(53),
		"Your profile was successfully updated",
	])
		expect(
			validToastCopy({
				title,
				description: "Alex Rivera",
			}),
		).toBe(false);
	expect(
		validToastCopy({ title: "Account name updated", description: "" }),
	).toBe(false);
	expect(validToastCopy({ title: "Password updated" })).toBe(true);
	expect(
		validToastCopy({
			title: "Profile view updated",
			description: "Profile view updated",
		}),
	).toBe(false);
});
test("profile switches retain the subject of each action", (): void => {
	const first = resolveToastCopy("switchedProfile", { subject: "Sam" });
	const second = resolveToastCopy("switchedProfile", { subject: "Edwin" });
	expect(first.title).toBe("Profile view updated");
	expect(first.description).toBe("Sam");
	expect(second.title).toBe("Profile view updated");
	expect(second.description).toBe("Edwin");
});
test("invite messages identify their recipient and preserve delivery wording", (): void => {
	const copy = resolveToastCopy("sentInvite", { subject: "sam@example.com" });
	expect(copy.title).toBe("Invite queued");
	expect(copy.description).toBe("sam@example.com");
});
test("empty subjects fall back to meaningful copy and details can describe the change", (): void => {
	expect(resolveToastCopy("savedName", { subject: "  " })).toEqual(
		toastMessages.savedName,
	);
	expect(
		resolveToastCopy("savedNotifications", {
			subject: "Messages",
			description: "Messages · Off",
		}).description,
	).toBe("Messages · Off");
});
