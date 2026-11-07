import type { CoachingGender } from "./player-coaching";

export const fitnessDivisions = [
	"Youth",
	"Elite Men",
	"Elite Women",
	"Masters Men",
	"Masters Women",
] as const;
export type FitnessDivision = (typeof fitnessDivisions)[number];

export const fitnessDivision = (
	birthDate: string | undefined,
	gender: CoachingGender | undefined,
	onDate: string,
): FitnessDivision | undefined => {
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
		date.toISOString().slice(0, 10) !== onDate ||
		birth > date
	)
		return undefined;
	const age =
		date.getUTCFullYear() -
		birth.getUTCFullYear() -
		(onDate.slice(5) < birthDate.slice(5) ? 1 : 0);
	if (age < 19) return "Youth";
	if (gender === "male") return age >= 35 ? "Masters Men" : "Elite Men";
	if (gender === "female") return age >= 33 ? "Masters Women" : "Elite Women";
	return undefined;
};
