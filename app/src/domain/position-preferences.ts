export const positionPreferenceOptions = [
	{ value: "GOALIE", label: "Goalie" },
	{ value: "CENTER", label: "Centre" },
	{ value: "FORWARD", label: "Forward" },
	{ value: "WING", label: "Wing" },
	{ value: "FULL_BACK", label: "Full back" },
] as const;
export type PositionPreference =
	(typeof positionPreferenceOptions)[number]["value"];
export const positionPreferenceLabel = (value: PositionPreference): string =>
	positionPreferenceOptions.find((option) => option.value === value)?.label ??
	value;
export const positionPreferencesError = (
	values?: readonly PositionPreference[],
): string | undefined =>
	values &&
	(values.length > positionPreferenceOptions.length ||
		new Set(values).size !== values.length ||
		values.some(
			(value) =>
				!positionPreferenceOptions.some((option) => option.value === value),
		))
		? "Choose each position only once."
		: undefined;
