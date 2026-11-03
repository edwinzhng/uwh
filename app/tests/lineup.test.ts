import { expect, test } from "bun:test";
import { initialAppData, primaryAccount } from "../src/demo/app-data";
import { reduceApp } from "../src/domain/app-reducer";
import type { AppData, Member, TeamPlan } from "../src/domain/app-types";
import { visibleAppData } from "../src/domain/app-visibility";
import {
	editLineup,
	lineupIncludesPerson,
	lineupPeople,
	lineupSnapshot,
	normalizeLineup,
	saveLineup,
	validateLineup,
	writeTeamPlan,
} from "../src/domain/lineup";
import { formatTeams, positionLabel } from "../src/domain/player-coaching";

const member = (index: number): Member => ({
	id: `lineup-${index}`,
	name: `Player ${index}`,
	programs: ["club"],
	position: "Forward",
	rating: 50,
	registration: "approved",
	goal: "",
	steps: 0,
});
const rosterFixture = (): AppData => {
	const members = Array.from({ length: 17 }, (_, index) => member(index));
	return {
		...initialAppData,
		members,
		teams: [],
		responses: members.map((entry) => ({
			eventId: "club-thu",
			personId: entry.id,
			response: "going",
			attendance: "unmarked",
		})),
	};
};
const generate = (data = rosterFixture()): AppData =>
	reduceApp(data, primaryAccount, {
		type: "generate-teams",
		eventId: "club-thu",
		separateYouth: false,
		excludedPersonIds: ["lineup-16"],
		expectedRevision: 0,
	});
const planFor = (data: AppData): TeamPlan => {
	const plan = data.teams.find((entry) => entry.eventId === "club-thu");
	if (!plan) throw new Error("Missing lineup fixture.");
	return plan;
};
const first = (ids: string[]): string => {
	const id = ids.at(0);
	if (!id) throw new Error("Missing player fixture.");
	return id;
};

test("generation assigns every attendee to a position group without losing or duplicating players", (): void => {
	const data = generate();
	const plan = planFor(data);
	const snapshot = lineupSnapshot(plan);
	expect(plan.black).toHaveLength(6);
	expect(plan.white).toHaveLength(6);
	expect([...snapshot.blackBench, ...snapshot.whiteBench]).toHaveLength(4);
	expect(lineupPeople(snapshot)).toHaveLength(16);
	expect(new Set(lineupPeople(snapshot)).size).toBe(16);
	expect(lineupPeople(snapshot)).not.toContain("lineup-16");
	expect(lineupIncludesPerson(plan, first(snapshot.blackBench))).toBe(true);
	expect(lineupIncludesPerson(plan, "lineup-16")).toBe(false);
	expect(plan.attendees).toHaveLength(17);
	expect(validateLineup(plan, snapshot)).toBeUndefined();
	expect(plan.revision).toBe(1);
	expect(snapshot.rotationSlots).toHaveLength(4);
	expect(formatTeams(plan, data.members)).not.toContain("Bench");
	expect(formatTeams(plan, data.members)).not.toContain("Rating");
});

test("rotation saves persist on the coach boundary and reject forged assignments atomically", (): void => {
	const data = generate();
	const plan = planFor(data);
	const snapshot = lineupSnapshot(plan);
	const reserve = first(snapshot.blackBench);
	const starter = snapshot.fieldSlots?.find((entry) =>
		snapshot.black.includes(entry.personId),
	);
	if (!starter) throw new Error("Missing starter fixture");
	const next = editLineup(plan, snapshot, {
		kind: "rotation",
		personId: reserve,
		slot: starter.slot,
	});
	const command = {
		type: "save-lineup",
		eventId: plan.eventId,
		expectedRevision: plan.revision ?? 0,
		snapshot: next,
	} as const;
	const saved = reduceApp(data, primaryAccount, command);
	expect(planFor(saved).rotationSlots).toContainEqual({
		personId: reserve,
		slot: starter.slot,
	});
	expect(planFor(saved).rotationSlots).toHaveLength(4);
	expect(planFor(saved).published).toBe(false);
	expect(planFor(saved).revision).toBe(2);
	expect(planFor(saved).black).toEqual(plan.black);
	expect(() => reduceApp(saved, primaryAccount, command)).toThrow("changed");
	expect(() =>
		reduceApp(
			data,
			{ ...primaryAccount, admin: true, coachPrograms: [] },
			command,
		),
	).toThrow();
	expect(() =>
		reduceApp(data, primaryAccount, {
			...command,
			snapshot: {
				...next,
				rotationSlots: [{ personId: starter.personId, slot: starter.slot }],
			},
		}),
	).toThrow("matching position group");
	expect(planFor(data).rotationSlots).toEqual(snapshot.rotationSlots);
});

test("accessible move, swap and formation edits keep every included player in one location", (): void => {
	const plan = planFor(generate());
	const snapshot = lineupSnapshot(plan);
	const active = first(snapshot.black);
	const reserve = first(snapshot.blackBench);
	const swapped = editLineup(plan, snapshot, {
		kind: "swap",
		personId: active,
		otherId: reserve,
	});
	expect(swapped.black).toContain(reserve);
	expect(swapped.blackBench).toContain(active);
	expect(validateLineup(plan, swapped)).toBeUndefined();
	const benched = editLineup(plan, snapshot, {
		kind: "move",
		personId: active,
		location: "blackBench",
		position: "FORWARD",
	});
	expect(benched.black).not.toContain(active);
	expect(benched.blackBench).toContain(active);
	const originalPosition = snapshot.positions.find(
		(entry) => entry.personId === active,
	)?.position;
	if (!originalPosition) throw new Error("Missing position fixture.");
	const returned = editLineup(plan, benched, {
		kind: "move",
		personId: active,
		location: "black",
		position: originalPosition,
	});
	expect(returned.black).toContain(active);
	const formation = editLineup(plan, returned, {
		kind: "formation",
		side: "black",
		formation: "3-3",
	});
	expect(formation.blackFormation).toBe("3-3");
	expect(
		formation.black.every((id) =>
			["FORWARD", "FULL_BACK"].includes(
				formation.positions.find((entry) => entry.personId === id)?.position ??
					"",
			),
		),
	).toBe(true);
	expect(validateLineup(plan, formation)).toBeUndefined();
	expect(() =>
		editLineup(plan, snapshot, {
			kind: "move",
			personId: reserve,
			location: "black",
			position: "FORWARD",
		}),
	).toThrow("open position");
});

test("forged duplicates, omitted players, exclusions and position omissions cannot be saved", (): void => {
	const plan = planFor(generate());
	const snapshot = lineupSnapshot(plan);
	const reserve = first(snapshot.blackBench);
	for (const invalid of [
		{
			...snapshot,
			blackBench: [...snapshot.blackBench, first(snapshot.black)],
		},
		{
			...snapshot,
			blackBench: snapshot.blackBench.filter((id) => id !== reserve),
		},
		{
			...snapshot,
			blackBench: [
				...snapshot.blackBench.filter((id) => id !== reserve),
				"lineup-16",
			],
		},
		{ ...snapshot, positions: snapshot.positions.slice(1) },
	])
		expect(() => saveLineup(plan, invalid, plan.revision ?? 0)).toThrow();
	expect(() =>
		editLineup(plan, snapshot, {
			kind: "move",
			personId: "lineup-16",
			location: "blackBench",
			position: "FORWARD",
		}),
	).toThrow("included player");
});

test("each age cohort has independent spots and swaps cannot change a player's authoritative age group", (): void => {
	const base = planFor(generate());
	const mixed = normalizeLineup({
		...base,
		separateYouth: true,
		black: [...base.black, ...(base.blackBench ?? [])],
		blackBench: [],
		white: [...base.white, ...(base.whiteBench ?? [])],
		whiteBench: [],
		assignments: base.assignments?.map((entry, index) => ({
			...entry,
			ageGroup: index % 2 ? "youth" : "adult",
		})),
	});
	expect(mixed.black.length).toBeGreaterThan(6);
	expect(validateLineup(mixed, lineupSnapshot(mixed))).toBeUndefined();
	const adult = mixed.assignments?.find(
		(entry) => entry.ageGroup === "adult",
	)?.personId;
	const youth = mixed.assignments?.find(
		(entry) => entry.ageGroup === "youth",
	)?.personId;
	if (!adult || !youth) throw new Error("Missing age-group fixture.");
	expect(() =>
		editLineup(mixed, lineupSnapshot(mixed), {
			kind: "swap",
			personId: adult,
			otherId: youth,
		}),
	).toThrow("same age group");
});

test("local undo snapshots save against the original revision and never overwrite another coach", (): void => {
	const plan = planFor(generate());
	const before = lineupSnapshot(plan);
	const moved = editLineup(plan, before, {
		kind: "swap",
		personId: first(before.black),
		otherId: first(before.blackBench),
	});
	const saved = saveLineup(plan, moved, plan.revision ?? 0);
	expect(saved.revision).toBe(2);
	expect(saved.published).toBe(false);
	expect(() => saveLineup(saved, before, plan.revision ?? 0)).toThrow(
		"lineup changed",
	);
	expect(saveLineup(saved, before, saved.revision ?? 0).black).toEqual(
		plan.black,
	);
	const legacy = { ...plan, revision: undefined };
	expect(writeTeamPlan(legacy, legacy, 0).revision).toBe(1);
	expect(() => writeTeamPlan(saved, saved, 0)).toThrow("lineup changed");
});

test("saving is coach-only, event-scoped, rejects stale attendance, and unpublishes drafts from player and admin views", (): void => {
	const generated = generate();
	const original = planFor(generated);
	const snapshot = lineupSnapshot(original);
	const action = {
		type: "save-lineup",
		eventId: "club-thu",
		expectedRevision: original.revision ?? 0,
		snapshot,
	} as const;
	const nonCoach = { ...primaryAccount, coachPrograms: [] };
	expect(() => reduceApp(generated, nonCoach, action)).toThrow();
	expect(() =>
		reduceApp(generated, primaryAccount, { ...action, partId: "not-a-part" }),
	).toThrow("part not found");
	expect(() =>
		reduceApp(generated, primaryAccount, {
			...action,
			eventId: "another-event",
		}),
	).toThrow();
	expect(() =>
		reduceApp(
			{
				...generated,
				events: generated.events.map((entry) => ({
					...entry,
					cancelled: true,
				})),
			},
			primaryAccount,
			action,
		),
	).toThrow();
	expect(() =>
		reduceApp(
			{ ...generated, responses: generated.responses.slice(1) },
			primaryAccount,
			action,
		),
	).toThrow("Lineup changed");
	expect(visibleAppData(generated, nonCoach).teams).toHaveLength(0);
	expect(
		visibleAppData(generated, { ...nonCoach, admin: false }).teams,
	).toHaveLength(0);
	const published = reduceApp(generated, primaryAccount, {
		type: "publish-teams",
		eventId: "club-thu",
		expectedRevision: original.revision ?? 0,
	});
	expect(visibleAppData(published, nonCoach).teams).toHaveLength(1);
	expect(
		visibleAppData(published, { ...nonCoach, admin: false }).teams.at(0)
			?.blackBench,
	).toEqual(original.blackBench);
	const edited = reduceApp(published, primaryAccount, {
		...action,
		expectedRevision: planFor(published).revision ?? 0,
	});
	expect(planFor(edited).published).toBe(false);
	expect(visibleAppData(edited, nonCoach).teams).toHaveLength(0);
	expect(() => reduceApp(edited, primaryAccount, action)).toThrow(
		"lineup changed",
	);
});

test("formation labels reserve full back for a single back, including copied teams", (): void => {
	const data = generate();
	const plan = planFor(data);
	expect(positionLabel("FULL_BACK", "2-3-1")).toBe("Full back");
	for (const formation of ["1-3-2", "3-3"] as const) {
		expect(positionLabel("FULL_BACK", formation)).toBe("Back");
		const copy = formatTeams(
			{ ...plan, blackFormation: formation, whiteFormation: formation },
			data.members,
		);
		expect(copy).toContain("Back ·");
		expect(copy).not.toContain("Full back");
	}
	expect(
		formatTeams(
			{ ...plan, blackFormation: "2-3-1", whiteFormation: "2-3-1" },
			data.members,
		),
	).toContain("Full back ·");
});

test("captains persist through save and undo, include substitutes, and clear when moved to the opposing team", (): void => {
	const plan = planFor(generate());
	const initial = lineupSnapshot(plan);
	const blackCaptain = first(initial.blackBench);
	const whiteCaptain = first(initial.white);
	const black = editLineup(plan, initial, {
		kind: "captain",
		side: "black",
		personId: blackCaptain,
	});
	const both = editLineup(plan, black, {
		kind: "captain",
		side: "white",
		personId: whiteCaptain,
	});
	const saved = saveLineup(plan, both, plan.revision ?? 0);
	expect(saved.captains).toEqual([
		{ side: "black", personId: blackCaptain },
		{ side: "white", personId: whiteCaptain },
	]);
	expect(formatTeams(saved, rosterFixture().members)).toContain(" · Captain");
	const moved = editLineup(saved, lineupSnapshot(saved), {
		kind: "move",
		personId: blackCaptain,
		location: "whiteBench",
		position: "FORWARD",
	});
	expect(moved.captains).toEqual([{ side: "white", personId: whiteCaptain }]);
	expect(() =>
		editLineup(plan, initial, {
			kind: "captain",
			side: "white",
			personId: blackCaptain,
		}),
	).toThrow("captain");
	expect(
		validateLineup(plan, {
			...initial,
			captains: [
				{ side: "black", personId: blackCaptain },
				{ side: "black", personId: first(initial.black) },
			],
		}),
	).toContain("captain");
});

test("direct add restores an excluded Yes attendee into an occupied position without displacing anyone or changing RSVP", (): void => {
	const data = generate();
	const plan = planFor(data);
	const before = lineupSnapshot(plan);
	const snapshot = editLineup(plan, before, {
		kind: "add",
		personId: "lineup-16",
		side: "black",
		slot: 0,
		ageGroup: "adult",
	});
	expect(lineupPeople(snapshot)).toHaveLength(17);
	expect(new Set(lineupPeople(snapshot)).size).toBe(17);
	expect(snapshot.black).toEqual(before.black);
	expect(snapshot.rotationSlots).toContainEqual({
		personId: "lineup-16",
		slot: 0,
	});
	expect(validateLineup(plan, snapshot)).toBeUndefined();
	const saved = reduceApp(data, primaryAccount, {
		type: "save-lineup",
		eventId: plan.eventId,
		expectedRevision: plan.revision ?? 0,
		snapshot,
	});
	expect(planFor(saved).excludedPersonIds).not.toContain("lineup-16");
	expect(saved.responses).toEqual(data.responses);
	expect(() =>
		editLineup(plan, before, {
			kind: "add",
			personId: "not-attending",
			side: "black",
			slot: 0,
		}),
	).toThrow("RSVP’d Yes");
});

test("moving directly into a position promotes a remaining player in the original position and remains undoable", (): void => {
	const plan = planFor(generate());
	const before = lineupSnapshot(plan);
	const reserve = first(before.blackBench);
	const rotation = before.rotationSlots?.find(
		(entry) => entry.personId === reserve,
	);
	const starter = before.fieldSlots?.find(
		(entry) =>
			before.black.includes(entry.personId) && entry.slot === rotation?.slot,
	);
	if (!starter) throw new Error("Missing grouped position fixture");
	const moved = editLineup(plan, before, {
		kind: "add",
		personId: starter.personId,
		side: "white",
		slot: 3,
	});
	expect(moved.black).toContain(reserve);
	expect(moved.fieldSlots).toContainEqual({
		personId: reserve,
		slot: starter.slot,
	});
	expect(lineupPeople(moved).slice().sort()).toEqual(
		lineupPeople(before).slice().sort(),
	);
	expect(validateLineup(plan, moved)).toBeUndefined();
});
