import { describe, expect, test } from "bun:test";
import { initialAppData, primaryAccount } from "../src/demo/app-data";
import { reduceApp } from "../src/domain/app-reducer";
import type { AppData, Equipment } from "../src/domain/app-types";
import { equipmentStock } from "../src/domain/equipment";

const item: Equipment = {
	id: "stock-test",
	name: "Fins",
	size: "Medium",
	condition: "ready",
	quantity: 2,
};
const stock: AppData = { ...initialAppData, equipment: [item], loans: [] };
const issue = (data: AppData, id: string): AppData =>
	reduceApp(data, primaryAccount, {
		type: "issue",
		loan: {
			id,
			itemId: item.id,
			personId: "sam",
			due: "2026-10-01",
			returned: false,
		},
	});

describe("equipment quantities", () => {
	test("multiple loans consume stock, retries do not, and returns restore one unit", () => {
		const first = issue(stock, "one");
		expect(equipmentStock(item, first.loans)).toEqual({
			total: 2,
			available: 1,
			onLoan: 1,
		});
		const full = issue(first, "two");
		expect(issue(full, "two").loans).toHaveLength(2);
		expect(() => issue(full, "three")).toThrow("unavailable");
		const returned = reduceApp(full, primaryAccount, {
			type: "return",
			loanId: "one",
		});
		expect(equipmentStock(item, returned.loans).available).toBe(1);
		expect(equipmentStock(item, issue(returned, "three").loans).available).toBe(
			0,
		);
	});
	test("quantity cannot be reduced below outstanding loans", () => {
		const full = issue(issue(stock, "one"), "two");
		expect(() =>
			reduceApp(full, primaryAccount, {
				type: "update-equipment",
				equipment: { ...item, quantity: 1 },
			}),
		).toThrow("Return borrowed items");
		const increased = reduceApp(full, primaryAccount, {
			type: "update-equipment",
			equipment: { ...item, quantity: 3 },
		});
		expect(increased.equipment.at(0)?.quantity).toBe(3);
		expect(issue(increased, "three").loans).toHaveLength(3);
	});
	test("invalid quantities and non-admin changes are rejected", () => {
		for (const quantity of [0, -1, 1.5, NaN, Infinity, 10001]) {
			expect(() =>
				reduceApp(stock, primaryAccount, {
					type: "add-equipment",
					equipment: { ...item, id: "new", quantity },
				}),
			).toThrow("whole number");
		}
		expect(() =>
			reduceApp(
				stock,
				{ ...primaryAccount, admin: false },
				{ type: "update-equipment", equipment: { ...item, quantity: 4 } },
			),
		).toThrow("access");
	});
	test("legacy single items and repair stock remain safe", () => {
		expect(equipmentStock({ ...item, quantity: undefined }, []).total).toBe(1);
		expect(equipmentStock({ ...item, condition: "repair" }, []).available).toBe(
			0,
		);
		expect(() =>
			issue({ ...stock, equipment: [{ ...item, condition: "repair" }] }, "one"),
		).toThrow("unavailable");
	});
});
