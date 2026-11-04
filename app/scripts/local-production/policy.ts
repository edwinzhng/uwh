export const localBackendOrigin = "http://127.0.0.1:3330";
export const localSiteOrigin = "http://127.0.0.1:3331";
export const localAppOrigin = "http://127.0.0.1:4300";
export const localPickerOrigin = "http://127.0.0.1:4302";

const excludedTables = new Set([
	"authAccounts",
	"authSessions",
	"authRefreshTokens",
	"authVerificationCodes",
	"authVerifiers",
	"authRateLimits",
	"accountConnections",
	"localEmails",
	"mailLimits",
	"inviteLimits",
	"pushDevices",
	"pushJobs",
	"pushDeliveries",
	"webPushSubscriptions",
	"webPushDeliveries",
	"notificationTests",
	"calendarFeeds",
]);

export const snapshotEntryAllowed = (entry: string): boolean => {
	if (
		!/^[a-zA-Z_][a-zA-Z0-9_]*\/[a-zA-Z0-9_.-]+\/?$/.test(entry) ||
		entry.split("/").some((part) => part === ".." || part === ".")
	)
		return false;
	const table = entry.split("/").at(0) ?? "";
	return (
		!/^auth[A-Z]/.test(table) &&
		!table.startsWith("youtube") &&
		!excludedTables.has(table)
	);
};

export type LocalAccount = { id: string; email: string; name: string };
export const localAccounts = (value: unknown): LocalAccount[] => {
	if (!Array.isArray(value))
		throw new Error("Local account data is unavailable.");
	return value
		.flatMap((entry: unknown): LocalAccount[] => {
			if (
				typeof entry !== "object" ||
				entry === null ||
				!("_id" in entry) ||
				typeof entry._id !== "string" ||
				!("email" in entry) ||
				typeof entry.email !== "string" ||
				!("emailVerificationTime" in entry) ||
				typeof entry.emailVerificationTime !== "number"
			)
				return [];
			return [
				{
					id: entry._id,
					email: entry.email.trim().toLowerCase(),
					name:
						"name" in entry && typeof entry.name === "string"
							? entry.name
							: entry.email,
				},
			];
		})
		.sort((first, second) => first.name.localeCompare(second.name));
};
