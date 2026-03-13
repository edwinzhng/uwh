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

export const getFitnessTestBestLabel = (
	value: string | undefined,
	unit: FitnessTestUnit,
): string => {
	if (!value) return "No prior";
	if (unit === fitnessTestUnits.PASS_FAIL)
		return value === "PASS" ? "Pass" : "Fail";
	return value;
};
