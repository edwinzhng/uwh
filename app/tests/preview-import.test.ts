import { expect, test } from "bun:test";
import type { ImportInput } from "../convex/import_plan";
import { initialAppData, primaryAccount } from "../src/demo/app-data";
import {
	commitPreviewImport,
	type PreviewImportState,
	previewImportPlans,
} from "../src/domain/preview-import";
import { defaultSeasonId } from "../src/domain/seasons";

const state: PreviewImportState = {
	data: initialAppData,
	records: {},
	references: {},
};
const input: ImportInput = {
	source: "sample",
	kind: "members",
	seasonId: defaultSeasonId,
	rows: [{ source_id: "new-rowan", name: "Rowan Example" }],
};
const commit = (
	current: PreviewImportState,
	request: ImportInput,
): PreviewImportState =>
	commitPreviewImport(
		current,
		primaryAccount,
		request,
		JSON.stringify(previewImportPlans(current, request)),
	);

test("preview imports add fictional members and preserve IDs on a reviewed retry", (): void => {
	const plans = previewImportPlans(state, input);
	expect(plans.at(0)?.status).toBe("create");
	const saved = commit(state, input);
	expect(
		saved.data.members.find((member) => member.name === "Rowan Example")?.id,
	).toBe("import:sample:new-rowan");
	expect(previewImportPlans(saved, input).at(0)?.status).toBe("skip");
	expect(commit(saved, input).data.members).toHaveLength(
		saved.data.members.length,
	);
	expect(
		state.data.members.some((member) => member.name === "Rowan Example"),
	).toBe(false);
});

test("preview import surfaces row errors and blocks stale or unauthorized commits", (): void => {
	const invalid = { ...input, rows: [{ source_id: "new", name: "" }] };
	expect(previewImportPlans(state, invalid).at(0)?.status).toBe("error");
	expect(() => commit(state, invalid)).toThrow("Fix the highlighted rows");
	const plans = previewImportPlans(state, input);
	expect(() =>
		commitPreviewImport(
			state,
			{ ...primaryAccount, admin: false },
			input,
			JSON.stringify(plans),
		),
	).toThrow("Administrator access");
	const saved = commit(state, input);
	expect(() =>
		commitPreviewImport(saved, primaryAccount, input, JSON.stringify(plans)),
	).toThrow("Records changed after preview");
});

test("preview import resolves registration and payments against the same season ledger", (): void => {
	const member = commit(state, input);
	const registration: ImportInput = {
		...input,
		kind: "registration",
		rows: [
			{
				source_id: "registration-rowan",
				member_id: "new-rowan",
				status: "approved",
				cuga: "yes",
				dues: "160.00",
			},
		],
	};
	const registered = commit(member, registration);
	expect(
		registered.records[`${defaultSeasonId}:import:sample:new-rowan`],
	).toMatchObject({
		registration: "approved",
		cuga: true,
		due: 16000,
		paid: 0,
	});
	const payment: ImportInput = {
		...input,
		kind: "payments",
		rows: [
			{
				source_id: "payment-rowan",
				member_id: "new-rowan",
				amount: "160.00",
				date: "2026-10-25",
				note: "Fictional e-transfer",
			},
		],
	};
	const paid = commit(registered, payment);
	expect(paid.records[`${defaultSeasonId}:import:sample:new-rowan`]?.paid).toBe(
		16000,
	);
	const overpayment = {
		...payment,
		rows: [
			{
				...payment.rows.at(0),
				source_id: "another-payment",
				member_id: "new-rowan",
				amount: "1.00",
				date: "2026-10-25",
				note: "Duplicate",
			},
		],
	};
	expect(previewImportPlans(paid, overpayment).at(0)?.status).toBe("error");
});

test("preview imports retain event links for reviewed attendance", (): void => {
	const member = commit(state, input);
	const event: ImportInput = {
		...input,
		kind: "events",
		rows: [
			{
				source_id: "practice-new",
				title: "Fictional practice",
				date: "2026-11-02",
				start: "19:00",
				end: "20:00",
				venue: "Sample pool",
				type: "training",
			},
		],
	};
	const scheduled = commit(member, event);
	const attendance: ImportInput = {
		...input,
		kind: "attendance",
		rows: [
			{
				source_id: "attendance-rowan",
				member_id: "new-rowan",
				event_id: "practice-new",
				response: "going",
				attendance: "present",
			},
		],
	};
	const attended = commit(scheduled, attendance);
	expect(
		attended.data.responses.some(
			(entry) =>
				entry.personId === "import:sample:new-rowan" &&
				entry.eventId === "import:sample:practice-new-0" &&
				entry.attendance === "present",
		),
	).toBe(true);
});
