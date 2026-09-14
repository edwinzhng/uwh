import { toastMessages } from "../src/design-system/toast-messages";
export const validToastCopy = (message: string): boolean =>
	/^(Queued|Revoked|Saved|Updated|Sent|Created|Deleted|Removed|Added|Copied|Joined|Left|Switched|Signed|Enabled|Disabled|Blocked|Unblocked|Cancelled|Restored|Retry) [a-z][a-z ]{1,38}$/.test(
		message,
	) &&
	message.split(" ").length <= 5 &&
	!/\b(successfully|please|your|the|just|now)\b/.test(message);
if (import.meta.main) {
	const failures = Object.entries(toastMessages).filter(
		([, message]) => !validToastCopy(message),
	);
	if (failures.length) {
		console.error(
			failures
				.map(
					([key]) =>
						`${key}: Use a short verb + action without punctuation or filler`,
				)
				.join("\n"),
		);
		process.exitCode = 1;
	} else console.log("Toast copy passed");
}
