import { expect, test } from "bun:test";
import { initialAppData } from "../src/demo/app-data";
import {
	defaultPreviewSeasonRecord,
	nextPreviewSeasonRecord,
} from "../src/domain/preview-season-ledger";
import { defaultSeasonId } from "../src/domain/seasons";

test("season previews reconcile fictional balances without carrying them into another season", (): void => {
	const record = defaultPreviewSeasonRecord(
		initialAppData,
		"sam",
		defaultSeasonId,
	);
	expect(record.due).toBe(
		initialAppData.charges
			.filter((entry) => entry.personId === "sam")
			.reduce((sum, entry) => sum + entry.amount, 0),
	);
	expect(
		defaultPreviewSeasonRecord(initialAppData, "sam", "next"),
	).toMatchObject({
		registration: "missing",
		cuga: false,
		due: 0,
		paid: 0,
	});
});

test("preview ledger uses production amount validation and rejects stale edits", (): void => {
	const record = {
		...defaultPreviewSeasonRecord(initialAppData, "sam", defaultSeasonId),
		due: 16000,
		paid: 0,
	};
	const payment = {
		kind: "payment",
		amount: 8000,
		note: "Fictional e-transfer",
		date: "2026-10-25",
	} as const;
	const paid = nextPreviewSeasonRecord(record, payment, record.revision);
	expect(paid).toMatchObject({ paid: 8000, revision: 1 });
	expect(() => nextPreviewSeasonRecord(paid, payment, 0)).toThrow(
		"record changed",
	);
	expect(() =>
		nextPreviewSeasonRecord(paid, { ...payment, amount: 9000 }, 1),
	).toThrow("Payment exceeds");
	expect(() =>
		nextPreviewSeasonRecord(
			paid,
			{ ...payment, kind: "refund", amount: 9000 },
			1,
		),
	).toThrow("Refund exceeds");
	expect(() =>
		nextPreviewSeasonRecord(paid, { ...payment, date: "2026-02-30" }, 1),
	).toThrow("Choose a date");
});
