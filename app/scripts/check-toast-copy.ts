import {
	type ToastCopy,
	toastMessages,
} from "../src/design-system/toast-messages";
export const validToastCopy = ({ title, description }: ToastCopy): boolean =>
	title.trim() === title &&
	title.length >= 12 &&
	title.length <= 100 &&
	title.split(/\s+/).length >= 4 &&
	description.trim() === description &&
	description.length >= 20 &&
	description.length <= 180 &&
	title !== description &&
	!/[\r\n]/.test(title + description) &&
	!/\b(successfully|congratulations)\b/i.test(title + description);
if (import.meta.main) {
	const failures = Object.entries(toastMessages).filter(
		([, message]) => !validToastCopy(message),
	);
	if (failures.length) {
		console.error(
			failures
				.map(
					([key]) =>
						`${key}: Use a clear subject-specific title and a concise description`,
				)
				.join("\n"),
		);
		process.exitCode = 1;
	} else console.log("Toast copy passed");
}
