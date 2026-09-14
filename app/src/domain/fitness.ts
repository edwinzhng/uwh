export const fitnessUnits = ["time", "count", "pass_fail"] as const;
export type FitnessUnit = (typeof fitnessUnits)[number];
export type FitnessSummary = { count: number; total: number; best?: number };
export const parseFitnessValue = (
	unit: FitnessUnit,
	input: string,
): number | undefined => {
	const value = input.trim();
	if (!value) return undefined;
	if (unit === "pass_fail") {
		if (value === "pass") return 1;
		if (value === "fail") return 0;
		throw new Error("Choose Pass or Fail.");
	}
	if (unit === "count") {
		if (!/^\d+$/.test(value) || Number(value) > 1000000)
			throw new Error("Enter a whole count between 0 and 1,000,000.");
		return Number(value);
	}
	if (!/^\d{1,4}:[0-5]\d(?:\.\d{1,2})?$/.test(value))
		throw new Error("Enter a time as m:ss, for example 1:24.50.");
	const [minutes, seconds] = value.split(":").map(Number);
	const total = (minutes ?? 0) * 60 + (seconds ?? 0);
	if (total <= 0) throw new Error("Time must be greater than zero.");
	return total;
};
export const formatFitnessValue = (
	unit: FitnessUnit,
	value: number | undefined,
): string => {
	if (value === undefined) return "—";
	if (unit === "pass_fail") return value === 1 ? "Pass" : "Fail";
	if (unit === "count")
		return Number.isInteger(value) ? String(value) : value.toFixed(1);
	const hundredths = Math.round(value * 100);
	const minutes = Math.floor(hundredths / 6000);
	const seconds = ((hundredths % 6000) / 100)
		.toFixed(2)
		.replace(/\.00$/, "")
		.padStart(2, "0");
	return `${minutes}:${Number(seconds) < 10 && seconds.length > 2 ? `0${seconds}` : seconds}`;
};
export const fitnessAverage = (
	unit: FitnessUnit,
	stats: FitnessSummary,
): string =>
	!stats.count
		? "—"
		: unit === "pass_fail"
			? `${Math.round((stats.total / stats.count) * 100)}% pass`
			: formatFitnessValue(unit, stats.total / stats.count);
export const fitnessUnitLabel = (unit: FitnessUnit): string =>
	unit === "time"
		? "Time · lower is better"
		: unit === "count"
			? "Count · higher is better"
			: "Pass / fail";
