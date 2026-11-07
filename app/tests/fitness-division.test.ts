import { expect, test } from "bun:test";
import { fitnessDivision } from "../src/domain/fitness-division";

test("divisions use age on December 31 of the season's starting year", (): void => {
	const seasonStart = "2026-09-01";
	expect(fitnessDivision("2008-12-31", "female", seasonStart)).toBe(
		"U19 Women's",
	);
	expect(fitnessDivision("2008-01-01", "male", seasonStart)).toBe("U19 Men's");
	expect(fitnessDivision("2007-12-31", "female", seasonStart)).toBe(
		"U24 Women's",
	);
	expect(fitnessDivision("2003-12-31", "male", seasonStart)).toBe("U24 Men's");
	expect(fitnessDivision("2002-12-31", "female", seasonStart)).toBe(
		"Elite Women's",
	);
	expect(fitnessDivision("2002-01-01", "male", seasonStart)).toBe(
		"Elite Men's",
	);
	expect(fitnessDivision("1995-12-31", "female", seasonStart)).toBe(
		"Elite Women's",
	);
	expect(fitnessDivision("1994-12-31", "female", seasonStart)).toBe(
		"Masters Women's",
	);
	expect(fitnessDivision("1992-12-31", "male", seasonStart)).toBe(
		"Elite Men's",
	);
	expect(fitnessDivision("1991-12-31", "male", seasonStart)).toBe(
		"Masters Men's",
	);
	expect(fitnessDivision("2008-11-07", undefined, seasonStart)).toBeUndefined();
	expect(fitnessDivision("1991-02-30", "male", seasonStart)).toBeUndefined();
	expect(fitnessDivision("1991-11-06", "other", seasonStart)).toBeUndefined();
	expect(fitnessDivision("2027-01-01", "female", seasonStart)).toBeUndefined();
});
