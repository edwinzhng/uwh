export const localEmailAllowed = ({
	email,
	mode,
	backendUrl,
	allowedEmails,
}: {
	email: string;
	mode: string | undefined;
	backendUrl: string | undefined;
	allowedEmails: string | undefined;
}): boolean =>
	mode === "local" &&
	/^http:\/\/(127\.0\.0\.1|localhost):\d+(?:\/|$)/.test(backendUrl ?? "") &&
	(email.endsWith("@example.test") ||
		(allowedEmails ?? "")
			.split(",")
			.some(
				(allowed) =>
					allowed.trim().toLowerCase() === email.trim().toLowerCase() &&
					Boolean(allowed.trim()),
			));
