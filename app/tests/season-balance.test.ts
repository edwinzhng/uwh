import { describe, expect, test } from "bun:test";
import { seasonBalance } from "../src/domain/season-balance";

describe("membership balance presentation", () => {
	test("unpaid dues remain a payable balance", () => {
		expect(seasonBalance({ due: 16_000, paid: 6_000 })).toEqual({
			label: "Balance",
			amount: 10_000,
			status: "Payment due",
			tone: "warning",
		});
	});
	test("a settled account shows paid without duplicating the payment total", () => {
		expect(seasonBalance({ due: 16_000, paid: 16_000 })).toEqual({
			label: "Balance",
			amount: 0,
			status: "Paid in full",
			tone: "success",
		});
	});
	test("zero dues are not labeled paid in full", () => {
		expect(seasonBalance({ due: 0, paid: 0 }).status).toBe("No dues");
	});
	test("overpayment remains explicitly identified as credit", () => {
		expect(seasonBalance({ due: 10_000, paid: 16_000 })).toEqual({
			label: "Account credit",
			amount: 6_000,
			status: "Account credit",
			tone: "success",
		});
		expect(seasonBalance({ due: 0, paid: 1 }).amount).toBe(1);
	});
});
