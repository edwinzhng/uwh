import { expect, test } from "bun:test";
import { initialAppData, primaryAccount } from "../src/demo/app-data";
import { reduceApp } from "../src/domain/app-reducer";
import type { ClubEvent, Member, TeamPlan } from "../src/domain/app-types";
import {
	editLineup,
	lineupPeople,
	lineupSnapshot,
	normalizeLineup,
	planWithSnapshot,
	removeLineupPeople,
	validateLineup,
	validateLineupReferees,
} from "../src/domain/lineup";
import {
	carryForwardLineup,
	compatibleCarrySource,
} from "../src/domain/lineup-carry";
import {
	defaultPlayerCoaching,
	formatTeams,
} from "../src/domain/player-coaching";

const players: Member[] = Array.from({ length: 18 }, (_, index) => ({
	id: `player-${index}`,
	name: `Player ${index}`,
	programs: ["club"],
	position: "Forward",
	rating: 50,
	registration: "approved",
	goal: "",
	steps: 0,
}));
const ids = players.slice(0, 16).map((member) => member.id);
const first = (values: string[]): string => {
	const id = values.at(0);
	if (!id) throw new Error("Missing player fixture");
	return id;
};
const event = (id: string, date: string): ClubEvent => ({
	id,
	date,
	title: "Hockey",
	start: "19:00",
	end: "20:00",
	kind: "hockey",
	program: "club",
	venue: "Pool",
	description: "",
	cancelled: false,
	signup: "open",
});
const sourceEvent = event("source", "2026-10-01");
const targetEvent = event("target", "2026-10-08");
const base: TeamPlan = normalizeLineup({
	eventId: sourceEvent.id,
	black: ids.slice(0, 8),
	white: ids.slice(8),
	attendees: ids,
	published: true,
	revision: 3,
	separateYouth: false,
	assignments: ids.map((personId) => ({
		personId,
		position: "FORWARD",
		ageGroup: "adult",
	})),
});
const custom = editLineup(base, lineupSnapshot(base), {
	kind: "swap",
	personId: first(base.black),
	otherId: base.black.at(1) ?? "",
});
const source: TeamPlan = {
	...planWithSnapshot(base, custom),
	referees: [{ side: "black", personId: first(base.black) }],
};
const input = {
	source,
	sourceEvent,
	targetEvent,
	attendees: players,
	profiles: players.map(defaultPlayerCoaching),
	members: players,
	expectedSourceRevision: 3,
	expectedRevision: 0,
};

test("multiple substitutes can share an exact starter spot without duplicating active players", (): void => {
	const snapshot = lineupSnapshot(source);
	const [reserve, secondReserve] = snapshot.blackBench;
	const starter = snapshot.fieldSlots?.find((entry) =>
		snapshot.black.includes(entry.personId),
	);
	if (!reserve || !secondReserve || !starter)
		throw new Error("Missing rotation fixture");
	const one = editLineup(source, snapshot, {
		kind: "rotation",
		personId: reserve,
		slot: starter.slot,
	});
	const two = editLineup(source, one, {
		kind: "rotation",
		personId: secondReserve,
		slot: starter.slot,
	});
	expect(two.black).toEqual(snapshot.black);
	expect(two.fieldSlots).toEqual(snapshot.fieldSlots);
	expect(two.black).toHaveLength(6);
	expect(two.rotationSlots).toEqual(
		expect.arrayContaining([
			{ personId: reserve, slot: starter.slot },
			{ personId: secondReserve, slot: starter.slot },
		]),
	);
	expect(validateLineup(source, two)).toBeUndefined();
	expect(planWithSnapshot(source, two).rotationSlots).toEqual(
		two.rotationSlots,
	);
	expect(
		editLineup(source, two, { kind: "rotation", personId: reserve })
			.rotationSlots,
	).toEqual(
		expect.arrayContaining([{ personId: secondReserve, slot: starter.slot }]),
	);
	expect(() =>
		editLineup(source, two, {
			kind: "rotation",
			personId: starter.personId,
			slot: 0,
		}),
	).toThrow("substitute");
	expect(
		validateLineup(source, {
			...two,
			rotationSlots: [
				...(two.rotationSlots ?? []),
				{ personId: reserve, slot: starter.slot },
			],
		}),
	).toBeDefined();
	for (const slot of [-1, 6, 0.5, Number.NaN])
		expect(() =>
			editLineup(source, snapshot, {
				kind: "rotation",
				personId: reserve,
				slot,
			}),
		).toThrow();
});

test("rotations stay within the substitute's own side and cohort and safely follow swaps or prune moves", (): void => {
	const snapshot = lineupSnapshot(source);
	const reserve = first(snapshot.blackBench);
	const starter = snapshot.fieldSlots?.find(
		(entry) => snapshot.black.includes(entry.personId) && entry.slot === 1,
	);
	if (!starter) throw new Error("Missing rotation starter");
	const assigned = editLineup(source, snapshot, {
		kind: "rotation",
		personId: reserve,
		slot: starter.slot,
	});
	const swapped = editLineup(source, assigned, {
		kind: "swap",
		personId: reserve,
		otherId: starter.personId,
	});
	expect(swapped.black).toContain(reserve);
	expect(swapped.rotationSlots).toContainEqual({
		personId: starter.personId,
		slot: starter.slot,
	});
	expect(validateLineup(source, swapped)).toBeUndefined();
	const moved = editLineup(source, assigned, {
		kind: "move",
		personId: reserve,
		location: "whiteBench",
		position: "FORWARD",
	});
	expect(validateLineup(source, moved)).toBeUndefined();
	expect(moved.rotationSlots?.some((entry) => entry.personId === reserve)).toBe(
		true,
	);
	const changed = editLineup(source, assigned, {
		kind: "formation",
		side: "black",
		formation: "1-3-2",
	});
	expect(validateLineup(source, changed)).toBeUndefined();
	const vacancy = editLineup(source, snapshot, {
		kind: "move",
		personId: starter.personId,
		location: "blackBench",
		position: "FORWARD",
	});
	expect(() =>
		editLineup(source, vacancy, {
			kind: "rotation",
			personId: reserve,
			slot: starter.slot,
		}),
	).toThrow("matching position group");
	const separated = {
		...source,
		separateYouth: true,
		assignments: source.assignments?.map((entry) =>
			entry.personId === reserve
				? { ...entry, ageGroup: "youth" as const }
				: entry,
		),
	};
	expect(() =>
		editLineup(separated, lineupSnapshot(separated), {
			kind: "rotation",
			personId: reserve,
			slot: starter.slot,
		}),
	).toThrow("matching position group");
});

test("lineup identity erasure removes bench, rotation, physical and referee references and drops orphan rotations", (): void => {
	const snapshot = lineupSnapshot(source);
	const reserve = first(snapshot.blackBench);
	const starter = snapshot.fieldSlots?.find((entry) =>
		snapshot.black.includes(entry.personId),
	);
	if (!starter) throw new Error("Missing rotation starter");
	const plan = planWithSnapshot(
		source,
		editLineup(source, snapshot, {
			kind: "rotation",
			personId: reserve,
			slot: starter.slot,
		}),
	);
	const removedStarter = removeLineupPeople(
		{ ...plan, referees: [{ side: "black", personId: starter.personId }] },
		new Set([starter.personId]),
	);
	expect(
		validateLineup(removedStarter, lineupSnapshot(removedStarter)),
	).toBeUndefined();
	expect(
		removedStarter.assignments?.some(
			(entry) => entry.personId === starter.personId,
		),
	).toBe(false);
	expect(
		removedStarter.fieldSlots?.some(
			(entry) => entry.personId === starter.personId,
		),
	).toBe(false);
	expect(removedStarter.referees).toEqual([]);
	const removedReserve = removeLineupPeople(plan, new Set([reserve]));
	expect(removedReserve.blackBench).not.toContain(reserve);
	expect(
		removedReserve.rotationSlots?.some((entry) => entry.personId === reserve),
	).toBe(false);
	expect(removedReserve.attendees).not.toContain(reserve);
});

test("pool placement preserves exact left/right spots and swaps occupied field or bench positions without duplicates", (): void => {
	const snapshot = lineupSnapshot(source);
	expect(validateLineup(source, snapshot)).toBeUndefined();
	const player = first(source.black);
	const reserve = first(snapshot.whiteBench);
	const place = editLineup(source, snapshot, {
		kind: "place",
		personId: reserve,
		side: "black",
		slot:
			snapshot.fieldSlots?.find((entry) => entry.personId === player)?.slot ??
			0,
	});
	expect(place.black).toContain(reserve);
	expect(place.whiteBench).toContain(player);
	expect(new Set(lineupPeople(place)).size).toBe(16);
	expect(validateLineup(source, place)).toBeUndefined();
	const malformed = {
		...snapshot,
		fieldSlots: snapshot.fieldSlots?.map((entry) =>
			entry.personId === player ? { ...entry, slot: 5 } : entry,
		),
	};
	expect(validateLineup(source, malformed)).toBeDefined();
	expect(() =>
		editLineup(source, snapshot, {
			kind: "place",
			personId: reserve,
			side: "black",
			slot: 0.5,
		}),
	).toThrow("pool position");
	const unchanged = planWithSnapshot(source, snapshot);
	expect(unchanged.fieldSlots).toEqual(source.fieldSlots);
});

test("referees stay within their team while keeping playing roles and published copy", (): void => {
	const snapshot = editLineup(source, lineupSnapshot(source), {
		kind: "referee",
		side: "black",
		personId: first(source.black),
	});
	expect(lineupPeople(snapshot)).toEqual(lineupPeople(lineupSnapshot(source)));
	expect(validateLineup(source, snapshot)).toBeUndefined();
	expect(validateLineupReferees(snapshot, players)).toBeUndefined();
	expect(
		validateLineupReferees(
			snapshot,
			players.map((member) => ({ ...member, archived: true })),
		),
	).toBeDefined();
	expect(
		validateLineupReferees(
			{ ...snapshot, referees: [{ side: "black", personId: "another-club" }] },
			players,
		),
	).toBeDefined();
	expect(
		validateLineup(source, {
			...snapshot,
			referees: [
				{ side: "black", personId: "a" },
				{ side: "black", personId: "b" },
			],
		}),
	).toBeDefined();
	expect(formatTeams(planWithSnapshot(source, snapshot), players)).toContain(
		`Referee · ${players.find((member) => member.id === first(source.black))?.name}`,
	);
	expect(
		editLineup(source, snapshot, { kind: "referee", side: "white" }).referees,
	).toHaveLength(1);
});

test("carry-forward creates a separate unpublished draft from current eligibility and preserves custom spots and bench intent", (): void => {
	const old = structuredClone(source);
	const absent = source.black.at(2);
	const archived = source.whiteBench?.at(-1);
	const roster = players.map((member) => ({
		...member,
		archived: member.id === archived,
	}));
	const carried = carryForwardLineup({
		...input,
		attendees: roster.filter((member) => member.id !== absent),
		members: roster,
	});
	expect(carried.eventId).toBe(targetEvent.id);
	expect(carried.published).toBe(false);
	expect(carried.revision).toBe(1);
	expect(source).toEqual(old);
	expect(lineupPeople(lineupSnapshot(carried))).not.toContain(absent);
	expect(lineupPeople(lineupSnapshot(carried))).not.toContain(archived);
	expect(lineupPeople(lineupSnapshot(carried))).toContain(
		players.at(-1)?.id ?? "missing-player",
	);
	expect(carried.blackBench).toContain(first(source.blackBench ?? []));
	const retained = first(source.black);
	expect(
		carried.fieldSlots?.find((entry) => entry.personId === retained)?.slot,
	).toBe(source.fieldSlots?.find((entry) => entry.personId === retained)?.slot);
	expect(validateLineup(carried, lineupSnapshot(carried))).toBeUndefined();
	expect(carried.excludedPersonIds).toEqual([]);
});

test("carry-forward rejects replacement, stale source versions, unpublished or incompatible history and empty attendance", (): void => {
	expect(() =>
		carryForwardLineup({
			...input,
			previous: { ...source, eventId: targetEvent.id },
		}),
	).toThrow("already has");
	expect(() =>
		carryForwardLineup({ ...input, expectedSourceRevision: 2 }),
	).toThrow("source lineup changed");
	expect(() =>
		carryForwardLineup({ ...input, source: { ...source, published: false } }),
	).toThrow("published lineup");
	expect(() =>
		carryForwardLineup({
			...input,
			source: { ...source, coachingStale: true },
		}),
	).toThrow("published lineup");
	expect(() =>
		carryForwardLineup({ ...input, attendees: players.slice(0, 1) }),
	).toThrow("two current attendees");
	expect(
		compatibleCarrySource(sourceEvent, { ...targetEvent, program: "another" }),
	).toBe(false);
	expect(
		compatibleCarrySource(sourceEvent, { ...targetEvent, date: "2026-09-01" }),
	).toBe(false);
	expect(
		compatibleCarrySource(sourceEvent, { ...targetEvent, kind: "training" }),
	).toBe(false);
	expect(
		compatibleCarrySource(sourceEvent, { ...targetEvent, cancelled: true }),
	).toBe(false);
	expect(compatibleCarrySource(sourceEvent, targetEvent, "missing-part")).toBe(
		false,
	);
});

test("carry and referee writes remain coach-only, source-scoped and based on authoritative current attendance", (): void => {
	const data = {
		...initialAppData,
		members: players,
		events: [sourceEvent, targetEvent],
		teams: [source],
		responses: players.map((member) => ({
			eventId: targetEvent.id,
			personId: member.id,
			response: "going" as const,
			attendance: "unmarked" as const,
		})),
	};
	const action = {
		type: "carry-lineup",
		eventId: targetEvent.id,
		sourceEventId: sourceEvent.id,
		expectedSourceRevision: 3,
		expectedRevision: 0,
	} as const;
	expect(() =>
		reduceApp(data, { ...primaryAccount, coachPrograms: [] }, action),
	).toThrow();
	expect(() =>
		reduceApp(data, primaryAccount, { ...action, sourceEventId: "other-club" }),
	).toThrow("unavailable");
	const next = reduceApp(data, primaryAccount, action);
	expect(next.teams).toHaveLength(2);
	expect(next.teams.at(0)).toEqual(source);
	const carried = next.teams.at(-1);
	if (!carried) throw new Error("Missing carried lineup");
	expect(() => reduceApp(next, primaryAccount, action)).toThrow("already has");
	expect(() =>
		reduceApp(next, primaryAccount, {
			type: "save-lineup",
			eventId: targetEvent.id,
			expectedRevision: carried.revision ?? 0,
			snapshot: {
				...lineupSnapshot(carried),
				referees: [{ side: "black", personId: "other-club" }],
			},
		}),
	).toThrow("active club players");
});
