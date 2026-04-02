export const fitnessTestUnits = {
	TIME: "TIME",
	COUNT: "COUNT",
	PASS_FAIL: "PASS_FAIL",
} as const;

export type FitnessTestUnit =
	(typeof fitnessTestUnits)[keyof typeof fitnessTestUnits];

export const fitnessTestUnitLabels: Record<FitnessTestUnit, string> = {
	TIME: "Time",
	COUNT: "Count",
	PASS_FAIL: "Pass/Fail",
};

export const fitnessTestUnitOptions: Array<{
	label: string;
	value: FitnessTestUnit;
}> = [
	{ label: "Time", value: fitnessTestUnits.TIME },
	{ label: "Count", value: fitnessTestUnits.COUNT },
	{ label: "Pass/Fail", value: fitnessTestUnits.PASS_FAIL },
];

export const passFailResultValues = {
	PASS: "PASS",
	FAIL: "FAIL",
} as const;

export type PassFailResultValue =
	(typeof passFailResultValues)[keyof typeof passFailResultValues];

export const formatDateInputValue = (timestamp: number): string => {
	const date = new Date(timestamp);
	const year = date.getFullYear();
	const month = `${date.getMonth() + 1}`.padStart(2, "0");
	const day = `${date.getDate()}`.padStart(2, "0");
	return `${year}-${month}-${day}`;
};

export const parseDateInputValue = (value: string): number => {
	const [year, month, day] = value.split("-").map(Number);
	return new Date(year, month - 1, day, 12, 0, 0, 0).getTime();
};

export const getFitnessTestValuePlaceholder = (
	unit: FitnessTestUnit,
): string => {
	if (unit === fitnessTestUnits.TIME) return "e.g. 5:24";
	if (unit === fitnessTestUnits.COUNT) return "e.g. 42";
	return "";
};

export const sanitizeFitnessResultInput = (
	unit: FitnessTestUnit,
	value: string,
): string => {
	if (unit === fitnessTestUnits.COUNT) {
		return value.replace(/\D/g, "");
	}

	if (unit === fitnessTestUnits.TIME) {
		const cleaned = value.replace(/[^\d:]/g, "");
		const [minutes = "", ...secondsParts] = cleaned.split(":");
		if (secondsParts.length === 0) {
			return minutes;
		}

		return `${minutes}:${secondsParts.join("").slice(0, 2)}`;
	}

	return value;
};

export const normalizeFitnessResultValue = (
	unit: FitnessTestUnit,
	value: string,
): string => {
	const trimmedValue = value.trim();
	if (!trimmedValue) return "";

	if (unit === fitnessTestUnits.COUNT) {
		if (!/^\d+$/.test(trimmedValue)) {
			throw new Error("Count results must be whole numbers");
		}

		return `${Number(trimmedValue)}`;
	}

	if (unit === fitnessTestUnits.TIME) {
		const paddedValue = /^\d+$/.test(trimmedValue)
			? `${trimmedValue}:00`
			: /^\d+:$/.test(trimmedValue)
				? `${trimmedValue}00`
				: /^\d+:\d$/.test(trimmedValue)
					? trimmedValue.replace(/:(\d)$/, ":0$1")
					: trimmedValue;

		if (!/^\d+:\d{2}$/.test(paddedValue)) {
			throw new Error("Time results must be minutes or minutes:seconds");
		}

		return paddedValue;
	}

	return trimmedValue;
};

// Chart value helpers — used by fitness chart components

export const timeStringToSeconds = (value: string): number => {
	const [minutes = "0", seconds = "0"] = value.split(":");
	return Number(minutes) * 60 + Number(seconds);
};

export const secondsToTimeString = (totalSeconds: number): string => {
	const m = Math.floor(totalSeconds / 60);
	const s = `${Math.round(totalSeconds % 60)}`.padStart(2, "0");
	return `${m}:${s}`;
};

/** Convert a stored fitness result string to a number for charting. */
export const fitnessValueToNumeric = (
	value: string,
	unit: string,
): number | null => {
	if (unit === fitnessTestUnits.TIME) return timeStringToSeconds(value);
	if (unit === fitnessTestUnits.COUNT) return Number(value);
	if (unit === fitnessTestUnits.PASS_FAIL) return value === "PASS" ? 1 : 0;
	return null;
};

/** Format a numeric chart value for display (axis ticks and tooltips). */
export const formatFitnessValue = (value: number, unit: string): string => {
	if (unit === fitnessTestUnits.TIME) return secondsToTimeString(value);
	if (unit === fitnessTestUnits.PASS_FAIL) return value === 1 ? "Pass" : "Fail";
	return `${value}`;
};

export const getFitnessTestBestLabel = (
	value: string | undefined,
	unit: FitnessTestUnit,
): string => {
	if (!value) return "No prior";
	if (unit === fitnessTestUnits.PASS_FAIL)
		return value === "PASS" ? "Pass" : "Fail";
	return value;
};
