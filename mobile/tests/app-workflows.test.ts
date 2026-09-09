import { describe, expect, test } from "bun:test";
import {
	initialAppData,
	previewAccounts,
	primaryAccount,
} from "../src/demo/app-data";
import { reduceApp } from "../src/domain/app-reducer";
import {
	balance,
	canCoach,
	canManagePerson,
	createOccurrences,
	eventResponse,
} from "../src/domain/app-rules";
import type { Account, EventDraft } from "../src/domain/app-types";
import { visibleAppData } from "../src/domain/app-visibility";
import { clubTimestamp, signupState } from "../src/domain/event-time";

const parent: Account = {
	id: "jamie",
	name: "Jamie Rivera",
	personId: "jamie",
	children: ["sam", "mila"],
	coachPrograms: [],
	admin: false,
};
const draft: EventDraft = {
	title: "Training",
	date: "2026-10-25",
	start: "19:45",
	end: "21:00",
	venue: "Pool",
	program: "club",
	kind: "training",
	capacity: 1,
	repeat: "weekly",
	description: "",
};

describe("combined permissions and family context", () => {
	test("all roles coexist without changing the managed person", () => {
		expect(primaryAccount.admin).toBe(true);
		expect(canCoach(primaryAccount, "club")).toBe(true);
		expect(canManagePerson(primaryAccount, "alex")).toBe(true);
		expect(canManagePerson(primaryAccount, "sam")).toBe(true);
		expect(canManagePerson(primaryAccount, "mila")).toBe(true);
		expect(canManagePerson(primaryAccount, "taylor")).toBe(false);
	});
	test("RSVPs are independent by event and person, and cannot retarget unrelated members", () => {
		const next = reduceApp(initialAppData, parent, {
			type: "respond",
			eventId: "club-thu",
			personId: "sam",
			response: "unavailable",
		});
		expect(eventResponse(next, "club-thu", "sam").response).toBe("unavailable");
		expect(eventResponse(next, "youth-thu", "sam").response).toBe("going");
		expect(eventResponse(next, "youth-thu", "mila").response).toBe("going");
		expect(() =>
			reduceApp(next, parent, {
				type: "respond",
				eventId: "club-thu",
				personId: "alex",
				response: "unavailable",
			}),
		).toThrow();
		expect(() =>
			reduceApp(
				{
					...next,
					events: next.events.map((event) =>
						event.id === "club-thu"
							? { ...event, eligiblePersonIds: ["sam"] }
							: event,
					),
				},
				parent,
				{
					type: "respond",
					eventId: "club-thu",
					personId: "mila",
					response: "going",
				},
			),
		).toThrow();
	});
	test("admin permission alone never exposes coaching notes or private chats", () => {
		const admin = previewAccounts.find((account) => account.id === "morgan");
		if (!admin) throw new Error("Missing fixture");
		const visible = visibleAppData(initialAppData, admin);
		expect(visible.feedback).toHaveLength(0);
		expect(visible.plans).toEqual({});
		expect(visible.messages.some((entry) => entry.threadId === "casey")).toBe(
			false,
		);
		expect(visible.members.every((entry) => entry.rating === 0)).toBe(true);
		expect(() =>
			reduceApp(initialAppData, admin, {
				type: "generate-teams",
				eventId: "club-thu",
			}),
		).toThrow();
	});
	test("guardians read only linked published feedback and financial records", () => {
		const visible = visibleAppData(initialAppData, {
			...parent,
			children: ["sam"],
		});
		expect(visible.feedback.map((entry) => entry.id)).toEqual(["f-sam"]);
		expect(
			visible.payments.every(
				(entry) => entry.personId === "sam" || entry.personId === "jamie",
			),
		).toBe(true);
		expect(
			visibleAppData(initialAppData, { ...parent, children: [] }).feedback,
		).toHaveLength(0);
	});
});

describe("club workflows", () => {
	test("capacity produces a waitlist and a cancellation promotes the next response", () => {
		const created = reduceApp(initialAppData, primaryAccount, {
			type: "create-event",
			id: "capacity",
			draft,
		});
		const first = reduceApp(created, primaryAccount, {
			type: "respond",
			eventId: "capacity-0",
			personId: "alex",
			response: "going",
		});
		const full = reduceApp(first, parent, {
			type: "respond",
			eventId: "capacity-0",
			personId: "sam",
			response: "going",
		});
		expect(eventResponse(full, "capacity-0", "sam").response).toBe("waiting");
		const cancelled = reduceApp(full, primaryAccount, {
			type: "respond",
			eventId: "capacity-0",
			personId: "alex",
			response: "unavailable",
		});
		expect(eventResponse(cancelled, "capacity-0", "sam").response).toBe(
			"going",
		);
	});
	test("attendance changes require team review before publishing", () => {
		const generated = reduceApp(initialAppData, primaryAccount, {
			type: "generate-teams",
			eventId: "club-thu",
		});
		const changed = reduceApp(generated, primaryAccount, {
			type: "attendance",
			eventId: "club-thu",
			personId: "sam",
			attendance: "absent",
		});
		expect(() =>
			reduceApp(changed, primaryAccount, {
				type: "publish-teams",
				eventId: "club-thu",
			}),
		).toThrow("Lineup changed. Regenerate teams before publishing.");
		expect(eventResponse(changed, "club-thu", "sam").response).toBe("going");
	});
	test("payments cannot overpay, duplicate or be recorded by a parent", () => {
		const payment = {
			id: "payment-test",
			personId: "sam",
			amount: 4000,
			note: "E-transfer",
		};
		const paid = reduceApp(initialAppData, primaryAccount, {
			type: "payment",
			payment,
		});
		expect(balance(paid, "sam")).toBe(0);
		expect(
			reduceApp(paid, primaryAccount, { type: "payment", payment }).payments,
		).toHaveLength(paid.payments.length);
		expect(() =>
			reduceApp(paid, primaryAccount, {
				type: "payment",
				payment: { ...payment, id: "overpay" },
			}),
		).toThrow();
		expect(() =>
			reduceApp(initialAppData, parent, { type: "payment", payment }),
		).toThrow();
	});
	test("payments preserve complete balances when history is paged", () => {
		const paged = {
			...initialAppData,
			payments: [],
			paymentTotals: { sam: 12000 },
		};
		const payment = {
			id: "paged-payment",
			personId: "sam",
			amount: 1000,
			note: "E-transfer",
		};
		const paid = reduceApp(paged, primaryAccount, { type: "payment", payment });
		expect(balance(paid, "sam")).toBe(3000);
		expect(
			balance(
				reduceApp(paid, primaryAccount, { type: "payment", payment }),
				"sam",
			),
		).toBe(3000);
		expect(() =>
			reduceApp(paid, primaryAccount, {
				type: "payment",
				payment: { ...payment, id: "too-much", amount: 4000 },
			}),
		).toThrow();
	});
	test("equipment has one active loan and can be reissued after return", () => {
		const loan = {
			id: "loan-test",
			itemId: "fins-021",
			personId: "sam",
			due: "2026-09-30",
			returned: false,
		};
		const issued = reduceApp(initialAppData, primaryAccount, {
			type: "issue",
			loan,
		});
		expect(() =>
			reduceApp(issued, primaryAccount, {
				type: "issue",
				loan: { ...loan, id: "duplicate", personId: "mila" },
			}),
		).toThrow("unavailable");
		const returned = reduceApp(issued, primaryAccount, {
			type: "return",
			loanId: loan.id,
		});
		expect(
			reduceApp(returned, primaryAccount, {
				type: "issue",
				loan: { ...loan, id: "next" },
			}).loans.filter(
				(entry) => entry.itemId === loan.itemId && !entry.returned,
			),
		).toHaveLength(1);
	});
	test("feedback publishing is explicit and private notes cannot be published directly", () => {
		const saved = reduceApp(initialAppData, primaryAccount, {
			type: "save-feedback",
			feedback: {
				id: "draft",
				personId: "sam",
				authorId: "spoofed",
				body: "Try the second pass.",
				visibility: "draft",
				date: "2026-09-07",
			},
		});
		expect(saved.feedback.find((entry) => entry.id === "draft")?.authorId).toBe(
			primaryAccount.id,
		);
		expect(
			visibleAppData(saved, parent).feedback.some(
				(entry) => entry.id === "draft",
			),
		).toBe(false);
		const published = reduceApp(saved, primaryAccount, {
			type: "publish-feedback",
			id: "draft",
		});
		expect(
			visibleAppData(published, parent).feedback.some(
				(entry) => entry.id === "draft",
			),
		).toBe(true);
		expect(() =>
			reduceApp(initialAppData, primaryAccount, {
				type: "publish-feedback",
				id: "private-sam",
			}),
		).toThrow();
	});
	test("recurrences preserve wall time across DST and reject ambiguous times", () => {
		const events = createOccurrences("dst", draft);
		expect(events).toHaveLength(4);
		expect(events.map((entry) => entry.start)).toEqual([
			"19:45",
			"19:45",
			"19:45",
			"19:45",
		]);
		const first = clubTimestamp("2025-10-26", "19:45");
		const second = clubTimestamp("2025-11-02", "19:45");
		expect(second - first).toBe(169 * 3600000);
		expect(() => clubTimestamp("2026-03-08", "02:30")).toThrow();
		expect(() => clubTimestamp("2025-11-02", "01:30")).toThrow();
		expect(
			clubTimestamp("2026-11-01", "19:45") -
				clubTimestamp("2026-10-25", "19:45"),
		).toBe(168 * 3600000);
		expect(new Date(clubTimestamp("2026-11-01", "19:45")).toISOString()).toBe(
			"2026-11-02T01:45:00.000Z",
		);
		const event = events.at(0);
		if (!event) throw new Error("Missing occurrence");
		expect(signupState({ ...event, opensAt: 100, closesAt: 200 }, 99)).toBe(
			"scheduled",
		);
		expect(signupState({ ...event, opensAt: 100, closesAt: 200 }, 100)).toBe(
			"open",
		);
		expect(signupState({ ...event, opensAt: 100, closesAt: 200 }, 200)).toBe(
			"closed",
		);
	});
});
