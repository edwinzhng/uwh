import { describe, expect, test } from "bun:test";
import { createStore } from "jotai";
import { initialAppData, primaryAccount } from "../src/demo/app-data";
import { previewDataAtom } from "../src/demo/app-state";
import {
	previewCreateEquipmentLoan,
	previewEquipmentGuests,
} from "../src/demo/equipment-loans-state";
import { reduceApp } from "../src/domain/app-reducer";
import type { AppData, ClubEvent, Equipment } from "../src/domain/app-types";
import { visibleAppData } from "../src/domain/app-visibility";
import { equipmentStock } from "../src/domain/equipment";
import {
	availableLoanPractice,
	type EquipmentLoanRequest,
	equipmentLoanError,
	equipmentLoanPayload,
	planEquipmentLoan,
} from "../src/domain/equipment-loans";

const practice: ClubEvent = {
	id: "guest-practice",
	title: "Guest practice",
	date: "2030-01-04",
	start: "19:00",
	end: "20:00",
	venue: "Fictional pool",
	program: "club",
	kind: "training",
	signup: "open",
	description: "",
	cancelled: false,
	timeZone: "UTC",
};
const item: Equipment = {
	id: "guest-fins",
	name: "Fins",
	size: "M",
	condition: "ready",
	quantity: 2,
};
const request: EquipmentLoanRequest = {
	requestId: "guest-loan-request-0001",
	id: "guest-loan",
	itemId: item.id,
	due: "2030-01-10",
	borrower: {
		kind: "guest",
		guestId: "sam",
		eventId: practice.id,
		name: "  Outside Guest  ",
	},
};
const data: AppData = {
	...initialAppData,
	equipment: [item],
	loans: [],
	events: [practice],
};
const plan = (
	input: Partial<Parameters<typeof planEquipmentLoan>[0]> = {},
): ReturnType<typeof planEquipmentLoan> =>
	planEquipmentLoan({
		request,
		account: primaryAccount,
		item,
		loans: [],
		members: data.members,
		practice,
		guests: [],
		now: Date.parse("2030-01-03T12:00Z"),
		...input,
	});

describe("practice-scoped outside equipment borrowers", () => {
	test("keeps a guest separate from a member with the same identifier", () => {
		const result = plan();
		expect(result.guest).toEqual({
			id: "sam",
			eventId: practice.id,
			name: "Outside Guest",
		});
		expect(result.loan.personId).toBeUndefined();
		expect(result.loan.borrower).toEqual({
			kind: "guest",
			guestId: "sam",
			eventId: practice.id,
			name: "Outside Guest",
			practiceTitle: practice.title,
			practiceDate: practice.date,
		});
		const next = { ...data, loans: [result.loan] };
		expect(
			visibleAppData(next, {
				...primaryAccount,
				admin: false,
				personId: "sam",
				children: [],
			}).loans,
		).toEqual([]);
		expect(visibleAppData(next, primaryAccount).loans).toEqual([result.loan]);
		expect(next.members).toEqual(data.members);
		expect(next.responses).toEqual(data.responses);
	});
	test("requires an admin and a current practice", () => {
		expect(() => plan({ account: { admin: false } })).toThrow("Only admins");
		for (const event of [
			undefined,
			{ ...practice, id: "other" },
			{ ...practice, cancelled: true },
			{ ...practice, kind: "tournament" as const },
			{ ...practice, kind: "social" as const },
		])
			expect(() => plan({ practice: event })).toThrow("practice");
		expect(
			availableLoanPractice(practice, Date.parse("2030-01-04T19:30Z")),
		).toBe(true);
		expect(() => plan({ now: Date.parse("2030-01-04T20:00Z") })).toThrow(
			"practice",
		);
	});
	test("validates name, practice, return date, and bounded request IDs", () => {
		const guest = request.borrower;
		if (guest.kind !== "guest") throw new Error("Guest fixture required");
		for (const name of ["", " ", "x".repeat(81), "New\nName"])
			expect(() =>
				plan({ request: { ...request, borrower: { ...guest, name } } }),
			).toThrow("name");
		expect(equipmentLoanError({ ...request, due: "bad" })).toBe(
			"Choose a return date",
		);
		expect(() => plan({ request: { ...request, due: "2030-01-03" } })).toThrow(
			"practice date",
		);
		expect(() => plan({ request: { ...request, requestId: "short" } })).toThrow(
			"Reopen",
		);
		expect(() =>
			plan({ request: { ...request, borrower: { ...guest, guestId: "" } } }),
		).toThrow("Reopen");
	});
	test("reuses only the same guest name and practice", () => {
		const created = plan();
		expect(
			plan({ guests: created.guest ? [created.guest] : [] }).guest,
		).toBeUndefined();
		expect(() =>
			plan({
				guests: [{ id: "sam", eventId: "other", name: "Outside Guest" }],
			}),
		).toThrow("guest again");
		expect(() =>
			plan({
				guests: [{ id: "sam", eventId: practice.id, name: "Different Guest" }],
			}),
		).toThrow("guest again");
	});
	test("shares real stock between guests and members and restores it on return", () => {
		const guest = plan().loan;
		const member = plan({
			request: {
				...request,
				id: "member-loan",
				borrower: { kind: "member", personId: "sam" },
			},
			loans: [guest],
		}).loan;
		expect(equipmentStock(item, [guest, member]).available).toBe(0);
		expect(() =>
			plan({ loans: [guest, member], request: { ...request, id: "third" } }),
		).toThrow("unavailable");
		const returned = reduceApp(
			{ ...data, loans: [guest, member] },
			primaryAccount,
			{ type: "return", loanId: guest.id },
		);
		expect(equipmentStock(item, returned.loans).available).toBe(1);
		expect(() => plan({ item: { ...item, condition: "repair" } })).toThrow(
			"unavailable",
		);
	});
	test("member loans reject archived and merged profiles", () => {
		const memberRequest: EquipmentLoanRequest = {
			...request,
			borrower: { kind: "member", personId: "sam" },
		};
		for (const state of [{ archived: true }, { mergedInto: "alex" }])
			expect(() =>
				plan({
					request: memberRequest,
					members: data.members.map((person) =>
						person.id === "sam" ? { ...person, ...state } : person,
					),
				}),
			).toThrow("Choose a member");
	});
	test("member retry payload changes do not silently succeed", () => {
		const loan = {
			id: "legacy",
			itemId: item.id,
			personId: "sam",
			due: request.due,
			returned: false,
		};
		const first = reduceApp(data, primaryAccount, { type: "issue", loan });
		expect(reduceApp(first, primaryAccount, { type: "issue", loan })).toBe(
			first,
		);
		expect(() =>
			reduceApp(first, primaryAccount, {
				type: "issue",
				loan: { ...loan, personId: "alex" },
			}),
		).toThrow("already in use");
	});
	test("caps new practice borrowers without truncating existing reuse", () => {
		const guests = Array.from({ length: 200 }, (_, index) => ({
			id: `guest-${index}`,
			name: `Guest ${index}`,
			eventId: practice.id,
		}));
		expect(() => plan({ guests })).toThrow("limit");
		const first = guests.at(0);
		if (!first) throw new Error("Guest fixture required");
		expect(
			plan({
				guests,
				request: {
					...request,
					borrower: {
						kind: "guest",
						guestId: first.id,
						name: first.name,
						eventId: practice.id,
					},
				},
			}).guest,
		).toBeUndefined();
	});
});

describe("isolated preview equipment commands", () => {
	test("atomically creates one guest and one loan, exact retries remain harmless", () => {
		const store = createStore();
		store.set(previewDataAtom, data);
		const input = { actorId: primaryAccount.id, request };
		store.set(previewCreateEquipmentLoan, input);
		store.set(previewCreateEquipmentLoan, input);
		expect(store.get(previewDataAtom).loans).toHaveLength(1);
		expect(store.get(previewEquipmentGuests)).toHaveLength(1);
		expect(equipmentLoanPayload(request)).toBe(
			equipmentLoanPayload({
				...request,
				borrower: {
					kind: "guest",
					guestId: "sam",
					name: "Outside Guest",
					eventId: practice.id,
				},
			}),
		);
		expect(() =>
			store.set(previewCreateEquipmentLoan, {
				...input,
				request: { ...request, due: "2030-01-11" },
			}),
		).toThrow("request is already in use");
		expect(() =>
			store.set(previewCreateEquipmentLoan, {
				actorId: "other",
				request: { ...request, id: "other" },
			}),
		).toThrow("Only admins");
		expect(store.get(previewDataAtom).members).toEqual(data.members);
	});
	test("failed stock and invalid guest attempts preserve every atom", () => {
		const store = createStore();
		store.set(previewDataAtom, {
			...data,
			equipment: [{ ...item, quantity: 1 }],
		});
		store.set(previewCreateEquipmentLoan, {
			actorId: primaryAccount.id,
			request,
		});
		const before = store.get(previewDataAtom);
		expect(() =>
			store.set(previewCreateEquipmentLoan, {
				actorId: primaryAccount.id,
				request: { ...request, requestId: "second-loan-request", id: "second" },
			}),
		).toThrow("unavailable");
		expect(store.get(previewDataAtom)).toBe(before);
		expect(store.get(previewEquipmentGuests)).toHaveLength(1);
	});
});
