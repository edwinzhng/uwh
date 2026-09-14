export const defaultClubTimeZone = "America/Edmonton";

const canonicalZones = new Map<string, string>();
export const canonicalTimeZone = (value: string): string => {
	const cached = canonicalZones.get(value);
	if (cached) return cached;
	const canonical = new Intl.DateTimeFormat("en", {
		timeZone: value,
	}).resolvedOptions().timeZone;
	if (canonicalZones.size < 100) canonicalZones.set(value, canonical);
	return canonical;
};

const commonTimeZones = [
	"America/Edmonton",
	"America/Vancouver",
	"America/Regina",
	"America/Winnipeg",
	"America/Toronto",
	"America/Halifax",
	"America/St_Johns",
	"America/Whitehorse",
	"America/Dawson_Creek",
	"America/New_York",
	"America/Chicago",
	"America/Denver",
	"America/Phoenix",
	"America/Los_Angeles",
	"America/Anchorage",
	"America/Mexico_City",
	"America/Sao_Paulo",
	"Europe/London",
	"Europe/Paris",
	"Europe/Berlin",
	"Europe/Helsinki",
	"Africa/Johannesburg",
	"Africa/Cairo",
	"Asia/Dubai",
	"Asia/Kolkata",
	"Asia/Singapore",
	"Asia/Tokyo",
	"Australia/Perth",
	"Australia/Adelaide",
	"Australia/Sydney",
	"Pacific/Auckland",
	"Pacific/Honolulu",
	"UTC",
];

export const validTimeZone = (value: string): boolean => {
	if (value !== "UTC" && !/^[A-Za-z_+-]+(?:\/[A-Za-z0-9_+-]+)+$/.test(value))
		return false;
	try {
		new Intl.DateTimeFormat("en", { timeZone: value }).format(0);
		return true;
	} catch {
		return false;
	}
};

export const timeZoneOptions = [
	...new Set([
		...commonTimeZones,
		...(typeof Intl.supportedValuesOf === "function"
			? Intl.supportedValuesOf("timeZone")
			: []),
	]),
]
	.toSorted()
	.map((value) => ({
		value,
		label:
			value === defaultClubTimeZone
				? "America/Edmonton (Calgary)"
				: value.replaceAll("_", " "),
	}));
