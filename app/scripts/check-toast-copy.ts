import {
	type ToastCopy,
	toastMessages,
} from "../src/design-system/toast-messages";
export const validToastCopy = ({ title, description }: ToastCopy): boolean =>
	title.trim() === title &&
	title.length >= 8 &&
	title.length <= 52 &&
	title.split(/\s+/).length >= 2 &&
	title.split(/\s+/).length <= 6 &&
	/\b(updated|saved|queued|copied|revoked|enabled|disabled|out|failed)$/i.test(
		title,
	) &&
	!/^your?\b/i.test(title) &&
	(description === undefined ||
		(description.trim() === description &&
			description.length > 0 &&
			description.length <= 100 &&
			title.toLowerCase() !== description.toLowerCase())) &&
	!/[\r\n]/.test(title + (description ?? "")) &&
	!/\b(successfully|congratulations)\b/i.test(title + (description ?? ""));
if (import.meta.main) {
	const failures = Object.entries(toastMessages).filter(
		([, message]) => !validToastCopy(message),
	);
	if (failures.length) {
		console.error(
			failures
				.map(
					([key]) =>
						`${key}: Use a short noun-and-verb title with optional concise context`,
				)
				.join("\n"),
		);
		process.exitCode = 1;
	} else console.log("Toast copy passed");
}
