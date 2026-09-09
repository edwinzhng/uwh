import { describe, expect, test } from "bun:test";
import {
	fitnessAverage,
	formatFitnessValue,
	parseFitnessValue,
} from "./fitness";

describe("fitness results", () => {
	test("time entry is validated and preserves hundredths", () => {
		expect(parseFitnessValue("time", "1:24.50")).toBe(84.5);
		expect(formatFitnessValue("time", 84.5)).toBe("1:24.50");
		expect(formatFitnessValue("time", 60.05)).toBe("1:00.05");
		expect(formatFitnessValue("time", 59.999)).toBe("1:00");
		for (const value of ["1:60", "0:00", "-1:20", "1", "abc", "1:02.333"])
			expect(() => parseFitnessValue("time", value)).toThrow();
	});
	test("zero counts and failed tests remain real results", () => {
		expect(parseFitnessValue("count", "0")).toBe(0);
		expect(parseFitnessValue("pass_fail", "fail")).toBe(0);
		expect(parseFitnessValue("count", "")).toBeUndefined();
		expect(parseFitnessValue("pass_fail", " ")).toBeUndefined();
		for (const value of ["-1", "1.5", "Infinity", "1000001"])
			expect(() => parseFitnessValue("count", value)).toThrow();
		expect(() => parseFitnessValue("pass_fail", "yes")).toThrow();
	});
	test("averages use seconds or pass proportions and empty stats do not invent zeros", () => {
		expect(fitnessAverage("time", { count: 2, total: 181 })).toBe("1:30.50");
		expect(fitnessAverage("count", { count: 2, total: 7 })).toBe("3.5");
		expect(fitnessAverage("pass_fail", { count: 3, total: 2 })).toBe(
			"67% pass",
		);
		expect(fitnessAverage("count", { count: 0, total: 0 })).toBe("—");
		expect(formatFitnessValue("count", undefined)).toBe("—");
	});
});
