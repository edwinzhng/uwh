import { expect, test } from "bun:test";
import type { TeamPlan } from "../src/domain/app-types";
import {
	lineupSnapshot,
	normalizeLineup,
	validateLineup,
} from "../src/domain/lineup";
import {
	commitLineupDraft,
	currentLineupSnapshot,
	initialLineupDraft,
	lineupDraftChanged,
	receiveGeneratedLineup,
	receiveLineupPlan,
	stageLineupEdit,
	undoLineupEdit,
} from "../src/features/lineup-editor-state";

const ids = Array.from({ length: 16 }, (_, index) => `inline-${index}`);
const plan: TeamPlan = normalizeLineup({
	eventId: "inline-fixture",
	partId: "hockey",
	black: ids.slice(0, 8),
	white: ids.slice(8),
	attendees: ids,
	revision: 4,
	published: true,
	separateYouth: false,
	assignments: ids.map((personId) => ({
		personId,
		position: "FORWARD",
		ageGroup: "adult",
	})),
});
const staged = (): ReturnType<typeof initialLineupDraft> =>
	stageLineupEdit(initialLineupDraft(plan), {
		kind: "formation",
		side: "black",
		formation: "1-3-2",
	});

test("inline lineup changes stay local and preserve the captured revision until explicit save", (): void => {
	const initial = initialLineupDraft(plan);
	const draft = staged();
	expect(lineupDraftChanged(initial)).toBe(false);
	expect(lineupDraftChanged(draft)).toBe(true);
	expect(draft.base).toBe(plan);
	expect(draft.base.revision).toBe(4);
	expect(draft.base.published).toBe(true);
	expect(currentLineupSnapshot(draft).blackFormation).toBe("1-3-2");
	expect(undoLineupEdit(draft)).toEqual(initial);
	expect(validateLineup(plan, currentLineupSnapshot(draft))).toBeUndefined();
});

test("concurrent server updates retain the dirty draft and old revision rather than silently overwriting it", (): void => {
	const draft = staged();
	const latest = { ...plan, revision: 5, published: false };
	expect(receiveLineupPlan(draft, latest)).toBe(draft);
	expect(currentLineupSnapshot(receiveLineupPlan(draft, latest))).toEqual(
		currentLineupSnapshot(draft),
	);
	const clean = receiveLineupPlan(initialLineupDraft(plan), latest);
	expect(clean.base).toBe(latest);
	expect(lineupDraftChanged(clean)).toBe(false);
});

test("confirmed save ends the local history, bumps revision and unpublishes without accepting lagging query data", (): void => {
	const draft = staged();
	const committed = commitLineupDraft(draft);
	expect(committed.base.revision).toBe(5);
	expect(committed.base.published).toBe(false);
	expect(lineupDraftChanged(committed)).toBe(false);
	expect(committed.history).toHaveLength(1);
	expect(currentLineupSnapshot(committed)).toEqual(
		currentLineupSnapshot(draft),
	);
	expect(receiveLineupPlan(committed, plan)).toBe(committed);
	expect(undoLineupEdit(committed)).toBe(committed);
});

test("regeneration only replaces edits after its new server revision arrives and never resets later edits on revisiting a tab", (): void => {
	const draft = staged();
	expect(receiveGeneratedLineup(draft, plan, 5)).toBe(draft);
	const generated = { ...plan, published: false, revision: 5 };
	const accepted = receiveGeneratedLineup(draft, generated, 5);
	expect(accepted.base).toBe(generated);
	expect(currentLineupSnapshot(accepted)).toEqual(lineupSnapshot(generated));
	const revised = stageLineupEdit(accepted, {
		kind: "formation",
		side: "white",
		formation: "1-3-2",
	});
	expect(lineupDraftChanged(revised)).toBe(true);
	expect(receiveGeneratedLineup(revised, generated, 5)).toBe(revised);
});

test("local undo stays bounded and no-op placement does not create extra unsaved work", (): void => {
	const initial = initialLineupDraft(plan);
	const occupant = lineupSnapshot(plan).fieldSlots?.find((entry) =>
		plan.black.includes(entry.personId),
	);
	if (!occupant) throw new Error("Missing inline fixture");
	expect(
		stageLineupEdit(initial, {
			kind: "place",
			personId: occupant.personId,
			side: "black",
			slot: occupant.slot,
		}),
	).toBe(initial);
	const many = Array.from({ length: 80 }, (_, index) => index).reduce(
		(draft, index) =>
			stageLineupEdit(draft, {
				kind: "formation",
				side: "black",
				formation: index % 2 === 0 ? "1-3-2" : "2-3-1",
			}),
		initial,
	);
	expect(many.history).toHaveLength(50);
});

test("bench drops after a swap retain every other player's pool slot", (): void => {
	const initial = initialLineupDraft(plan);
	const first = plan.black.at(0),
		second = plan.black.at(3);
	if (!first || !second) throw new Error("Missing positioned fixture players");
	const swapped = stageLineupEdit(initial, {
		kind: "swap",
		personId: first,
		otherId: second,
	});
	const before = currentLineupSnapshot(swapped);
	const position = before.positions.find(
		(entry) => entry.personId === first,
	)?.position;
	if (!position) throw new Error("Missing player position");
	const benched = stageLineupEdit(swapped, {
		kind: "move",
		personId: first,
		location: "blackBench",
		position,
	});
	const after = currentLineupSnapshot(benched);
	expect(after.blackBench).toContain(first);
	expect(after.fieldSlots).toEqual(
		before.fieldSlots?.filter((entry) => entry.personId !== first),
	);
});
