import { expect, test } from "bun:test";
import { fitnessDivision } from "../src/domain/fitness-division";

test("fitness divisions use age on the chosen date and gender without guessing missing information", (): void => {
	const date = "2026-11-06";
	expect(fitnessDivision("2008-11-07", undefined, date)).toBe("Youth");
	expect(fitnessDivision("2007-11-06", "female", date)).toBe("Elite Women");
	expect(fitnessDivision("2006-11-06", "female", date)).toBe("Elite Women");
	expect(fitnessDivision("1993-11-07", "female", date)).toBe("Elite Women");
	expect(fitnessDivision("1993-11-06", "female", date)).toBe("Masters Women");
	expect(fitnessDivision("1991-11-07", "male", date)).toBe("Elite Men");
	expect(fitnessDivision("1991-11-06", "male", date)).toBe("Masters Men");
	expect(fitnessDivision("1991-02-30", "male", date)).toBeUndefined();
	expect(fitnessDivision("1991-11-06", "other", date)).toBeUndefined();
});
