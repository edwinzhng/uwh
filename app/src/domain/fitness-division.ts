import type { CoachingGender } from "./player-coaching";

export const fitnessDivisions = [
	"U19 Women's",
	"U19 Men's",
	"U24 Women's",
	"U24 Men's",
	"Elite Men's",
	"Elite Women's",
	"Masters Men's",
	"Masters Women's",
] as const;
export type FitnessDivision = (typeof fitnessDivisions)[number];

export const ageAtSeasonYearEnd = (
	birthDate: string | undefined,
	onDate: string,
): number | undefined => {
	if (
		!birthDate ||
		!/^\d{4}-\d{2}-\d{2}$/.test(birthDate) ||
		!/^\d{4}-\d{2}-\d{2}$/.test(onDate)
	)
		return undefined;
	const birth = new Date(`${birthDate}T00:00:00Z`);
	const date = new Date(`${onDate}T00:00:00Z`);
	if (
		Number.isNaN(birth.getTime()) ||
		Number.isNaN(date.getTime()) ||
		birth.toISOString().slice(0, 10) !== birthDate ||
		date.toISOString().slice(0, 10) !== onDate
	)
		return undefined;
	const cutoff = new Date(Date.UTC(date.getUTCFullYear(), 11, 31));
	if (birth > cutoff) return undefined;
	return cutoff.getUTCFullYear() - birth.getUTCFullYear();
};

export const fitnessDivision = (
	birthDate: string | undefined,
	gender: CoachingGender | undefined,
	onDate: string,
): FitnessDivision | undefined => {
	const age = ageAtSeasonYearEnd(birthDate, onDate);
	if (age === undefined) return undefined;
	if (gender === "male")
		return age < 19
			? "U19 Men's"
			: age < 24
				? "U24 Men's"
				: age >= 35
					? "Masters Men's"
					: "Elite Men's";
	if (gender === "female")
		return age < 19
			? "U19 Women's"
			: age < 24
				? "U24 Women's"
				: age >= 32
					? "Masters Women's"
					: "Elite Women's";
	return undefined;
};
