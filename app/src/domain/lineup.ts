import type { Member, TeamFormation, TeamPlan } from "./app-types";
import type { AgeGroup, Position } from "./player-coaching";

export const formationOptions = [
	{ value: "2-3-1", label: "2 forwards · 3 midfield · 1 back" },
	{ value: "1-3-2", label: "1 forward · 3 midfield · 2 backs" },
	{ value: "3-3", label: "3 forwards · 3 backs" },
] as const;
export const formationPositions = {
	"2-3-1": ["FORWARD", "FORWARD", "WING", "CENTER", "WING", "FULL_BACK"],
	"1-3-2": ["FORWARD", "WING", "CENTER", "WING", "FULL_BACK", "FULL_BACK"],
	"3-3": [
		"FORWARD",
		"FORWARD",
		"FORWARD",
		"FULL_BACK",
		"FULL_BACK",
		"FULL_BACK",
	],
} as const satisfies Record<TeamFormation, readonly Position[]>;
const formationSpotLabels = {
	"2-3-1": [
		"Left forward",
		"Right forward",
		"Left wing",
		"Center",
		"Right wing",
		"Full back",
	],
	"1-3-2": [
		"Center forward",
		"Left wing",
		"Center",
		"Right wing",
		"Left back",
		"Right back",
	],
	"3-3": [
		"Left forward",
		"Center forward",
		"Right forward",
		"Left back",
		"Center back",
		"Right back",
	],
} as const;
const formationSpotNumbers = {
	"2-3-1": [1, 2, 3, 4, 5, 6],
	"1-3-2": [1, 4, 3, 5, 6, 7],
	"3-3": [],
} as const satisfies Record<TeamFormation, readonly number[]>;

export const lineupSlotLabel = (
	formation: TeamFormation,
	slot: number,
): string => {
	const label = formationSpotLabels[formation].at(slot) ?? "Position";
	const number = formationSpotNumbers[formation].at(slot);
	return number === undefined ? label : `${number} · ${label}`;
};

export const lineupSlotAbbreviation = (
	formation: TeamFormation,
	slot: number,
): string => {
	const label = formationSpotLabels[formation].at(slot);
	return (
		label
			?.split(" ")
			.map((word) => word.at(0))
			.join("")
			.toUpperCase() ?? String(slot + 1)
	);
};

export type LineupSide = "black" | "white";
export type LineupLocation = LineupSide | "blackBench" | "whiteBench";
export type LineupSnapshot = {
	excludedPersonIds?: string[];
	captains?: { side: LineupSide; personId: string }[];
	fieldSlots?: { personId: string; slot: number }[];
	rotationSlots?: { personId: string; slot: number }[];
	referees?: { side: LineupSide; personId: string }[];
	black: string[];
	white: string[];
	blackBench: string[];
	whiteBench: string[];
	blackFormation: TeamFormation;
	whiteFormation: TeamFormation;
	positions: { personId: string; position: Position; ageGroup?: AgeGroup }[];
};
export type LineupEdit =
	| {
			kind: "add";
			personId: string;
			side: LineupSide;
			slot: number;
			ageGroup?: AgeGroup;
	  }
	| {
			kind: "captain";
			side: LineupSide;
			personId?: string;
			group?: "adult" | "youth" | "combined";
	  }
	| { kind: "place"; personId: string; side: LineupSide; slot: number }
	| { kind: "rotation"; personId: string; slot?: number }
	| { kind: "referee"; side: LineupSide; personId?: string }
	| { kind: "formation"; side: LineupSide; formation: TeamFormation }
	| {
			kind: "move";
			personId: string;
			location: LineupLocation;
			position: Position;
	  }
	| { kind: "swap"; personId: string; otherId: string };
export const lineupIncludesPerson = (
	plan: TeamPlan,
	personId: string,
): boolean =>
	[
		...plan.black,
		...plan.white,
		...(plan.blackBench ?? []),
		...(plan.whiteBench ?? []),
	].includes(personId);
export const lineupPeople = (snapshot: LineupSnapshot): string[] => [
	...snapshot.black,
	...snapshot.white,
	...snapshot.blackBench,
	...snapshot.whiteBench,
];
export const lineupLocation = (
	snapshot: LineupSnapshot,
	personId: string,
): LineupLocation | undefined =>
	(["black", "white", "blackBench", "whiteBench"] as const).find((location) =>
		snapshot[location].includes(personId),
	);
const ageGroup = (
	plan: TeamPlan,
	personId: string,
	snapshot?: LineupSnapshot,
): string =>
	plan.separateYouth
		? (snapshot?.positions.find((entry) => entry.personId === personId)
				?.ageGroup ??
			plan.assignments?.find((entry) => entry.personId === personId)
				?.ageGroup ??
			"adult")
		: "combined";
export const lineupSlots = (
	plan: TeamPlan,
	snapshot: LineupSnapshot,
): { personId: string; slot: number }[] =>
	(["black", "white"] as const).flatMap((side) => {
		const formation =
			side === "black" ? snapshot.blackFormation : snapshot.whiteFormation;
		return [
			...new Set(snapshot[side].map((id) => ageGroup(plan, id, snapshot))),
		].flatMap((group) =>
			snapshot[side]
				.filter((id) => ageGroup(plan, id, snapshot) === group)
				.reduce<{ personId: string; slot: number }[]>((slots, personId) => {
					const position = snapshot.positions.find(
						(entry) => entry.personId === personId,
					)?.position;
					const preferred = snapshot.fieldSlots?.find(
						(entry) => entry.personId === personId,
					)?.slot;
					const available = formationPositions[formation].flatMap(
						(value, slot) =>
							value === position && !slots.some((entry) => entry.slot === slot)
								? [slot]
								: [],
					);
					const slot =
						preferred !== undefined && available.includes(preferred)
							? preferred
							: available.at(0);
					if (slot !== undefined) slots.push({ personId, slot });
					return slots;
				}, []),
		);
	});
export const lineupSnapshot = (plan: TeamPlan): LineupSnapshot => {
	const snapshot: LineupSnapshot = {
		captains: plan.captains,
		excludedPersonIds: plan.excludedPersonIds,
		fieldSlots: plan.fieldSlots,
		rotationSlots: plan.rotationSlots,
		referees: plan.referees ?? [],
		black: plan.black,
		white: plan.white,
		blackBench: plan.blackBench ?? [],
		whiteBench: plan.whiteBench ?? [],
		blackFormation: plan.blackFormation ?? "2-3-1",
		whiteFormation: plan.whiteFormation ?? "2-3-1",
		positions: [
			...new Set([
				...plan.black,
				...plan.white,
				...(plan.blackBench ?? []),
				...(plan.whiteBench ?? []),
			]),
		].map((personId) => ({
			personId,
			position:
				plan.assignments?.find((entry) => entry.personId === personId)
					?.position ?? "FORWARD",
		})),
	};
	return positionLineupReserves(plan, {
		...snapshot,
		fieldSlots: snapshot.fieldSlots ?? lineupSlots(plan, snapshot),
	});
};
export const lineupTeamPeople = (
	plan: Pick<TeamPlan, "black" | "white" | "blackBench" | "whiteBench">,
	side: LineupSide,
): string[] => [
	...plan[side],
	...(plan[side === "black" ? "blackBench" : "whiteBench"] ?? []),
];
export const lineupPersonSlot = (
	snapshot: LineupSnapshot,
	personId: string,
): number | undefined =>
	snapshot.fieldSlots?.find((entry) => entry.personId === personId)?.slot ??
	snapshot.rotationSlots?.find((entry) => entry.personId === personId)?.slot;
export const positionLineupReserves = (
	plan: TeamPlan,
	snapshot: LineupSnapshot,
): LineupSnapshot => {
	const fieldSlots = snapshot.fieldSlots ?? lineupSlots(plan, snapshot);
	const positions = new Map(
		snapshot.positions.map((entry) => [entry.personId, entry]),
	);
	const groups = new Map(
		snapshot.positions.map((entry) => [
			entry.personId,
			ageGroup(plan, entry.personId, snapshot),
		]),
	);
	const groupFor = (id: string): string =>
		groups.get(id) ?? ageGroup(plan, id, snapshot);
	const rotations = [...(snapshot.rotationSlots ?? [])];
	const key = (side: LineupSide, id: string, slot: number): string =>
		`${side}:${groupFor(id)}:${slot}`;
	const counts = new Map<string, number>();
	const assigned = new Set(rotations.map((entry) => entry.personId));
	for (const side of ["black", "white"] as const) {
		const reserves = snapshot[side === "black" ? "blackBench" : "whiteBench"];
		const reserveIds = new Set(reserves);
		const activeIds = new Set(snapshot[side]);
		const slots = fieldSlots.filter((entry) => activeIds.has(entry.personId));
		const formation =
			side === "black" ? snapshot.blackFormation : snapshot.whiteFormation;
		for (const entry of rotations)
			if (reserveIds.has(entry.personId)) {
				const location = key(side, entry.personId, entry.slot);
				counts.set(location, (counts.get(location) ?? 0) + 1);
			}
		for (const personId of reserves) {
			if (assigned.has(personId)) continue;
			const eligible = slots.filter(
				(entry) => groupFor(entry.personId) === groupFor(personId),
			);
			const preferred = positions.get(personId)?.position;
			const matching = eligible.filter(
				(entry) => formationPositions[formation].at(entry.slot) === preferred,
			);
			const target = (matching.length ? matching : eligible).reduce<
				(typeof slots)[number] | undefined
			>(
				(selected, entry) =>
					!selected ||
					(counts.get(key(side, personId, entry.slot)) ?? 0) <
						(counts.get(key(side, personId, selected.slot)) ?? 0)
						? entry
						: selected,
				undefined,
			);
			const position = target
				? formationPositions[formation].at(target.slot)
				: undefined;
			const current = positions.get(personId);
			if (target && position && current) {
				rotations.push({ personId, slot: target.slot });
				assigned.add(personId);
				const location = key(side, personId, target.slot);
				counts.set(location, (counts.get(location) ?? 0) + 1);
				positions.set(personId, { ...current, position });
			}
		}
	}
	return {
		...snapshot,
		rotationSlots: rotations,
		positions: snapshot.positions.map(
			(entry) => positions.get(entry.personId) ?? entry,
		),
	};
};
export const lineupRotationSlots = (
	plan: TeamPlan,
	snapshot: LineupSnapshot,
): NonNullable<LineupSnapshot["rotationSlots"]> => {
	const slots = snapshot.fieldSlots ?? lineupSlots(plan, snapshot);
	return (snapshot.rotationSlots ?? []).filter((entry, index, entries) => {
		const location = lineupLocation(snapshot, entry.personId);
		const side =
			location === "blackBench"
				? "black"
				: location === "whiteBench"
					? "white"
					: undefined;
		if (
			!side ||
			!Number.isInteger(entry.slot) ||
			entry.slot < 0 ||
			entry.slot > 5 ||
			entries.findIndex((other) => other.personId === entry.personId) !== index
		)
			return false;
		const formation =
			side === "black" ? snapshot.blackFormation : snapshot.whiteFormation;
		return (
			snapshot.positions.find((other) => other.personId === entry.personId)
				?.position === formationPositions[formation].at(entry.slot) &&
			slots.some(
				(starter) =>
					starter.slot === entry.slot &&
					snapshot[side].includes(starter.personId) &&
					ageGroup(plan, starter.personId, snapshot) ===
						ageGroup(plan, entry.personId, snapshot),
			)
		);
	});
};
export const removeLineupPeople = (
	plan: TeamPlan,
	personIds: ReadonlySet<string>,
): TeamPlan => {
	const next: TeamPlan = {
		...plan,
		black: plan.black.filter((id) => !personIds.has(id)),
		white: plan.white.filter((id) => !personIds.has(id)),
		blackBench: plan.blackBench?.filter((id) => !personIds.has(id)),
		whiteBench: plan.whiteBench?.filter((id) => !personIds.has(id)),
		attendees: plan.attendees.filter((id) => !personIds.has(id)),
		excludedPersonIds: plan.excludedPersonIds?.filter(
			(id) => !personIds.has(id),
		),
		assignments: plan.assignments?.filter(
			(entry) => !personIds.has(entry.personId),
		),
		fieldSlots: plan.fieldSlots?.filter(
			(entry) => !personIds.has(entry.personId),
		),
		rotationSlots: plan.rotationSlots?.filter(
			(entry) => !personIds.has(entry.personId),
		),
		referees: plan.referees?.filter((entry) => !personIds.has(entry.personId)),
		captains: plan.captains?.filter((entry) => !personIds.has(entry.personId)),
	};
	return normalizeLineup(next);
};
const normalizeSide = (
	plan: TeamPlan,
	snapshot: LineupSnapshot,
	side: LineupSide,
): {
	active: string[];
	bench: string[];
	positions: LineupSnapshot["positions"];
} => {
	const formation =
		side === "black" ? snapshot.blackFormation : snapshot.whiteFormation;
	const active: string[] = [];
	const bench: string[] = [];
	const people = [
		...snapshot[side],
		...snapshot[side === "black" ? "blackBench" : "whiteBench"],
	];
	const positions: LineupSnapshot["positions"] = [];
	for (const group of new Set(
		people.map((id) => ageGroup(plan, id, snapshot)),
	)) {
		const available: Position[] = [...formationPositions[formation]];
		for (const personId of people.filter(
			(id) => ageGroup(plan, id, snapshot) === group,
		)) {
			const preferred = snapshot.positions.find(
				(entry) => entry.personId === personId,
			)?.position;
			const position =
				available.find((value) => value === preferred) ?? available.at(0);
			if (position) {
				active.push(personId);
				positions.push({ personId, position });
				available.splice(available.indexOf(position), 1);
			} else {
				bench.push(personId);
				positions.push({
					personId,
					position:
						preferred &&
						formationPositions[formation].some((value) => value === preferred)
							? preferred
							: formationPositions[formation][0],
				});
			}
		}
	}
	return { active, bench, positions };
};
export const normalizeLineup = (plan: TeamPlan): TeamPlan => {
	const initial = lineupSnapshot(plan);
	const black = normalizeSide(plan, initial, "black");
	const white = normalizeSide(plan, initial, "white");
	const positions = new Map(
		[...black.positions, ...white.positions].map((entry) => [
			entry.personId,
			entry,
		]),
	);
	const normalized: LineupSnapshot = {
		...initial,
		black: black.active,
		white: white.active,
		blackBench: black.bench,
		whiteBench: white.bench,
		positions: initial.positions.map((entry) => ({
			...entry,
			...positions.get(entry.personId),
		})),
	};
	const slotted = { ...normalized, fieldSlots: lineupSlots(plan, normalized) };
	return planWithSnapshot(plan, {
		...slotted,
		rotationSlots: lineupRotationSlots(plan, slotted),
	});
};
export const planWithSnapshot = (
	plan: TeamPlan,
	snapshot: LineupSnapshot,
): TeamPlan => {
	const positioned = positionLineupReserves(plan, snapshot);
	return {
		...plan,
		excludedPersonIds: positioned.excludedPersonIds ?? plan.excludedPersonIds,
		black: positioned.black,
		white: positioned.white,
		blackBench: positioned.blackBench,
		whiteBench: positioned.whiteBench,
		blackFormation: positioned.blackFormation,
		whiteFormation: positioned.whiteFormation,
		fieldSlots: positioned.fieldSlots ?? lineupSlots(plan, positioned),
		rotationSlots: lineupRotationSlots(plan, positioned),
		referees: positioned.referees ?? [],
		captains: positioned.captains,
		assignments: positioned.positions.map((entry) => ({
			...entry,
			ageGroup:
				entry.ageGroup ??
				plan.assignments?.find((value) => value.personId === entry.personId)
					?.ageGroup ??
				"adult",
		})),
	};
};
export const validateLineup = (
	plan: TeamPlan,
	snapshot: LineupSnapshot,
): string | undefined => {
	const people = lineupPeople(snapshot);
	const active = [...snapshot.black, ...snapshot.white];
	const slots = snapshot.fieldSlots ?? lineupSlots(plan, snapshot);
	const captainKeys =
		snapshot.captains?.map(
			(entry) => `${entry.side}:${ageGroup(plan, entry.personId, snapshot)}`,
		) ?? [];
	if (
		new Set(captainKeys).size !== captainKeys.length ||
		snapshot.captains?.some(
			(entry) =>
				![
					...snapshot[entry.side],
					...snapshot[entry.side === "black" ? "blackBench" : "whiteBench"],
				].includes(entry.personId),
		)
	)
		return "Choose one captain from each team.";
	if (
		(snapshot.rotationSlots?.length ?? 0) !==
			snapshot.blackBench.length + snapshot.whiteBench.length ||
		(snapshot.rotationSlots?.length ?? 0) !==
			lineupRotationSlots(plan, snapshot).length
	)
		return "Assign every player to a matching position group.";
	if (
		slots.length !== active.length ||
		new Set(slots.map((entry) => entry.personId)).size !== active.length ||
		slots.some(
			(entry) =>
				!active.includes(entry.personId) ||
				!Number.isInteger(entry.slot) ||
				entry.slot < 0 ||
				entry.slot > 5,
		)
	)
		return "Choose one valid pool position for every active player.";
	if (
		(snapshot.referees?.length ?? 0) > 2 ||
		new Set(snapshot.referees?.map((entry) => entry.side)).size !==
			(snapshot.referees?.length ?? 0) ||
		snapshot.referees?.some((entry) => !entry.personId.trim())
	)
		return "Choose at most one referee for each side.";
	if (snapshot.excludedPersonIds?.some((id) => !plan.attendees.includes(id)))
		return "Only attending players can be excluded.";
	const expected = plan.attendees.filter(
		(id) =>
			!(snapshot.excludedPersonIds ?? plan.excludedPersonIds)?.includes(id),
	);
	if (
		people.length !== new Set(people).size ||
		people.length !== expected.length ||
		expected.some((id) => !people.includes(id))
	)
		return "Keep each included attendee in exactly one team.";
	if (
		snapshot.positions.length !== people.length ||
		new Set(snapshot.positions.map((entry) => entry.personId)).size !==
			people.length ||
		snapshot.positions.some((entry) => !people.includes(entry.personId))
	)
		return "Choose one position for every included player.";
	for (const side of ["black", "white"] as const) {
		const formation =
			side === "black" ? snapshot.blackFormation : snapshot.whiteFormation;
		const groups = [
			...new Set(snapshot[side].map((id) => ageGroup(plan, id, snapshot))),
		];
		for (const group of groups) {
			const occupied = slots.filter(
				(entry) =>
					snapshot[side].includes(entry.personId) &&
					ageGroup(plan, entry.personId, snapshot) === group,
			);
			if (
				new Set(occupied.map((entry) => entry.slot)).size !== occupied.length ||
				occupied.some(
					(entry) =>
						formationPositions[formation].at(entry.slot) !==
						snapshot.positions.find(
							(value) => value.personId === entry.personId,
						)?.position,
				)
			)
				return "Pool spots must be unique and match the selected formation.";
		}
		for (const group of groups)
			for (const position of [
				"FORWARD",
				"WING",
				"CENTER",
				"FULL_BACK",
			] as const) {
				const occupied = snapshot[side].filter(
					(id) =>
						ageGroup(plan, id, snapshot) === group &&
						snapshot.positions.find((entry) => entry.personId === id)
							?.position === position,
				).length;
				if (
					occupied >
					formationPositions[formation].filter((value) => value === position)
						.length
				)
					return "Choose an open position or add a player to a position group.";
			}
	}
	return undefined;
};
const addPositionedPlayer = (
	plan: TeamPlan,
	snapshot: LineupSnapshot,
	edit: Extract<LineupEdit, { kind: "add" }>,
): LineupSnapshot => {
	if (!plan.attendees.includes(edit.personId))
		throw new Error("Choose a player who RSVP’d Yes.");
	const formation =
		edit.side === "black" ? snapshot.blackFormation : snapshot.whiteFormation;
	const position = formationPositions[formation].at(edit.slot);
	if (!Number.isInteger(edit.slot) || !position)
		throw new Error("Choose a pool position.");
	const existing = (snapshot.fieldSlots ?? lineupSlots(plan, snapshot)).find(
		(entry) => entry.personId === edit.personId,
	);
	const existingRotation = snapshot.rotationSlots?.find(
		(entry) => entry.personId === edit.personId,
	);
	const location = lineupLocation(snapshot, edit.personId);
	if (
		(location === edit.side && existing?.slot === edit.slot) ||
		(location === `${edit.side}Bench` && existingRotation?.slot === edit.slot)
	)
		return snapshot;
	const replacement =
		existing && location && (location === "black" || location === "white")
			? snapshot.rotationSlots?.find(
					(entry) =>
						entry.slot === existing.slot &&
						snapshot[
							location === "black" ? "blackBench" : "whiteBench"
						].includes(entry.personId) &&
						ageGroup(plan, entry.personId, snapshot) ===
							ageGroup(plan, edit.personId, snapshot),
				)
			: undefined;
	const cleared: LineupSnapshot = {
		...snapshot,
		excludedPersonIds: (
			snapshot.excludedPersonIds ??
			plan.excludedPersonIds ??
			[]
		).filter((id) => id !== edit.personId),
		black: snapshot.black.filter((id) => id !== edit.personId),
		white: snapshot.white.filter((id) => id !== edit.personId),
		blackBench: snapshot.blackBench.filter(
			(id) => id !== edit.personId && id !== replacement?.personId,
		),
		whiteBench: snapshot.whiteBench.filter(
			(id) => id !== edit.personId && id !== replacement?.personId,
		),
		fieldSlots: (snapshot.fieldSlots ?? lineupSlots(plan, snapshot)).filter(
			(entry) => entry.personId !== edit.personId,
		),
		rotationSlots: snapshot.rotationSlots?.filter(
			(entry) =>
				entry.personId !== edit.personId &&
				entry.personId !== replacement?.personId,
		),
		positions: [
			...snapshot.positions.filter((entry) => entry.personId !== edit.personId),
			{
				personId: edit.personId,
				position,
				...(edit.ageGroup ? { ageGroup: edit.ageGroup } : {}),
			},
		],
	};
	if (replacement && (location === "black" || location === "white")) {
		cleared[location] = [...cleared[location], replacement.personId];
		cleared.fieldSlots = [...(cleared.fieldSlots ?? []), replacement];
	}
	const targetGroup = ageGroup(plan, edit.personId, cleared);
	const occupied = cleared.fieldSlots?.some(
		(entry) =>
			entry.slot === edit.slot &&
			cleared[edit.side].includes(entry.personId) &&
			ageGroup(plan, entry.personId, cleared) === targetGroup,
	);
	const target = occupied
		? edit.side === "black"
			? "blackBench"
			: "whiteBench"
		: edit.side;
	return {
		...cleared,
		[target]: [...cleared[target], edit.personId],
		...(occupied
			? {
					rotationSlots: [
						...(cleared.rotationSlots ?? []),
						{ personId: edit.personId, slot: edit.slot },
					],
				}
			: {
					fieldSlots: [
						...(cleared.fieldSlots ?? []),
						{ personId: edit.personId, slot: edit.slot },
					],
				}),
	};
};
export const editLineup = (
	plan: TeamPlan,
	snapshot: LineupSnapshot,
	edit: LineupEdit,
): LineupSnapshot => {
	const next = ((): LineupSnapshot => {
		if (edit.kind === "captain")
			return {
				...snapshot,
				captains: [
					...(snapshot.captains ?? []).filter(
						(entry) =>
							entry.side !== edit.side ||
							(plan.separateYouth &&
								edit.group !== undefined &&
								ageGroup(plan, entry.personId, snapshot) !== edit.group),
					),
					...(edit.personId
						? [{ side: edit.side, personId: edit.personId }]
						: []),
				],
			};
		if (edit.kind === "referee")
			return {
				...snapshot,
				referees: [
					...(snapshot.referees ?? []).filter(
						(entry) => entry.side !== edit.side,
					),
					...(edit.personId
						? [{ side: edit.side, personId: edit.personId }]
						: []),
				],
			};
		if (edit.kind === "formation")
			return lineupSnapshot(
				normalizeLineup(
					planWithSnapshot(plan, {
						...snapshot,
						fieldSlots: undefined,
						...(edit.side === "black"
							? { blackFormation: edit.formation }
							: { whiteFormation: edit.formation }),
					}),
				),
			);

		if (edit.kind === "add") return addPositionedPlayer(plan, snapshot, edit);
		const location = lineupLocation(snapshot, edit.personId);
		if (!location) throw new Error("Choose an included player.");
		if (edit.kind === "rotation") {
			if (location !== "blackBench" && location !== "whiteBench")
				throw new Error("Choose a substitute");
			const side = location === "blackBench" ? "black" : "white";
			const formation =
				side === "black" ? snapshot.blackFormation : snapshot.whiteFormation;
			const position =
				edit.slot === undefined
					? undefined
					: formationPositions[formation].at(edit.slot);
			if (
				edit.slot !== undefined &&
				(!Number.isInteger(edit.slot) || !position)
			)
				throw new Error("Choose a pool position");
			return {
				...snapshot,
				rotationSlots: [
					...(snapshot.rotationSlots ?? []).filter(
						(entry) => entry.personId !== edit.personId,
					),
					...(edit.slot === undefined
						? []
						: [{ personId: edit.personId, slot: edit.slot }]),
				],
				positions: position
					? snapshot.positions.map((entry) =>
							entry.personId === edit.personId ? { ...entry, position } : entry,
						)
					: snapshot.positions,
			};
		}
		if (edit.kind === "place") {
			const formation =
				edit.side === "black"
					? snapshot.blackFormation
					: snapshot.whiteFormation;
			const position = formationPositions[formation].at(edit.slot);
			if (!Number.isInteger(edit.slot) || !position)
				throw new Error("Choose a pool position.");
			const occupant = (
				snapshot.fieldSlots ?? lineupSlots(plan, snapshot)
			).find(
				(entry) =>
					entry.slot === edit.slot &&
					snapshot[edit.side].includes(entry.personId) &&
					ageGroup(plan, entry.personId, snapshot) ===
						ageGroup(plan, edit.personId, snapshot),
			);
			if (occupant?.personId === edit.personId) return snapshot;
			if (occupant)
				return editLineup(plan, snapshot, {
					kind: "swap",
					personId: edit.personId,
					otherId: occupant.personId,
				});
			const moved = editLineup(plan, snapshot, {
				kind: "move",
				personId: edit.personId,
				location: edit.side,
				position,
			});
			return {
				...moved,
				fieldSlots: [
					...(moved.fieldSlots ?? []).filter(
						(entry) => entry.personId !== edit.personId,
					),
					{ personId: edit.personId, slot: edit.slot },
				],
			};
		}
		if (edit.kind === "move")
			return withLineupSlots(plan, {
				...snapshot,
				rotationSlots: snapshot.rotationSlots?.filter(
					(entry) => entry.personId !== edit.personId,
				),
				black: snapshot.black.filter((id) => id !== edit.personId),
				white: snapshot.white.filter((id) => id !== edit.personId),
				blackBench: snapshot.blackBench.filter((id) => id !== edit.personId),
				whiteBench: snapshot.whiteBench.filter((id) => id !== edit.personId),
				[edit.location]: [
					...snapshot[edit.location].filter((id) => id !== edit.personId),
					edit.personId,
				],
				positions: snapshot.positions.map((entry) =>
					entry.personId === edit.personId
						? { ...entry, position: edit.position }
						: entry,
				),
			});
		const otherLocation = lineupLocation(snapshot, edit.otherId);
		if (!otherLocation || edit.personId === edit.otherId)
			throw new Error("Choose two different included players.");
		if (
			ageGroup(plan, edit.personId, snapshot) !==
			ageGroup(plan, edit.otherId, snapshot)
		)
			throw new Error("Swap players from the same age group.");
		const firstPosition = snapshot.positions.find(
			(entry) => entry.personId === edit.personId,
		)?.position;
		const secondPosition = snapshot.positions.find(
			(entry) => entry.personId === edit.otherId,
		)?.position;
		if (!firstPosition || !secondPosition)
			throw new Error("Choose two positioned players.");
		const swap = (ids: string[]): string[] =>
			ids.map((id) =>
				id === edit.personId
					? edit.otherId
					: id === edit.otherId
						? edit.personId
						: id,
			);
		return {
			...snapshot,
			black: swap(snapshot.black),
			white: swap(snapshot.white),
			blackBench: swap(snapshot.blackBench),
			whiteBench: swap(snapshot.whiteBench),
			fieldSlots: (snapshot.fieldSlots ?? lineupSlots(plan, snapshot)).map(
				(entry) => ({
					...entry,
					personId:
						entry.personId === edit.personId
							? edit.otherId
							: entry.personId === edit.otherId
								? edit.personId
								: entry.personId,
				}),
			),
			rotationSlots: snapshot.rotationSlots?.map((entry) => ({
				...entry,
				personId:
					entry.personId === edit.personId
						? edit.otherId
						: entry.personId === edit.otherId
							? edit.personId
							: entry.personId,
			})),
			positions: snapshot.positions.map((entry) =>
				entry.personId === edit.personId
					? { ...entry, position: secondPosition }
					: entry.personId === edit.otherId
						? { ...entry, position: firstPosition }
						: entry,
			),
		};
	})();
	const withCaptains =
		next.captains === undefined || edit.kind === "captain"
			? next
			: {
					...next,
					captains: next.captains.filter((entry) =>
						[
							...next[entry.side],
							...next[entry.side === "black" ? "blackBench" : "whiteBench"],
						].includes(entry.personId),
					),
				};
	const positioned = positionLineupReserves(
		plan,
		edit.kind === "rotation"
			? withCaptains
			: {
					...withCaptains,
					rotationSlots: lineupRotationSlots(plan, withCaptains),
				},
	);
	const normalized =
		edit.kind === "rotation"
			? positioned
			: {
					...positioned,
					rotationSlots: lineupRotationSlots(plan, positioned),
				};
	const error = validateLineup(plan, normalized);
	if (error) throw new Error(error);
	return normalized;
};
const withLineupSlots = (
	plan: TeamPlan,
	snapshot: LineupSnapshot,
): LineupSnapshot => {
	const fieldSlots = lineupSlots(plan, snapshot);
	if (fieldSlots.length !== snapshot.black.length + snapshot.white.length)
		throw new Error(
			"Choose an open position or add a player to a position group.",
		);
	return { ...snapshot, fieldSlots };
};
export const assignLineupPosition = (
	plan: TeamPlan,
	snapshot: LineupSnapshot,
	personId: string,
	side: LineupSide,
	position: Position,
): LineupSnapshot => {
	const formation =
		side === "black" ? snapshot.blackFormation : snapshot.whiteFormation;
	const slots = formationPositions[formation].flatMap((value, slot) =>
		value === position ? [slot] : [],
	);
	const occupied = (snapshot.fieldSlots ?? lineupSlots(plan, snapshot)).filter(
		(entry) =>
			snapshot[side].includes(entry.personId) &&
			ageGroup(plan, entry.personId, snapshot) ===
				ageGroup(plan, personId, snapshot),
	);
	const current = occupied.find((entry) => entry.personId === personId)?.slot;
	const slot =
		current !== undefined && slots.includes(current)
			? current
			: (slots.find(
					(value) => !occupied.some((entry) => entry.slot === value),
				) ?? slots.at(0));
	if (slot === undefined)
		throw new Error("Choose a position in the selected formation.");
	return editLineup(plan, snapshot, { kind: "place", personId, side, slot });
};
export const validateLineupReferees = (
	snapshot: LineupSnapshot,
	members: readonly Member[],
): string | undefined =>
	snapshot.referees?.some(
		(entry) =>
			!members.some(
				(member) =>
					member.id === entry.personId &&
					!member.archived &&
					!member.mergedInto &&
					member.programs.length > 0,
			),
	)
		? "Choose active club players for referee slots."
		: undefined;
export const writeTeamPlan = (
	previous: TeamPlan | undefined,
	next: TeamPlan,
	expectedRevision?: number,
): TeamPlan => {
	if (
		expectedRevision !== undefined &&
		expectedRevision !== (previous?.revision ?? 0)
	)
		throw new Error("This lineup changed. Reopen it before saving or undoing.");
	return { ...next, revision: (previous?.revision ?? 0) + 1 };
};
export const saveLineup = (
	plan: TeamPlan,
	snapshot: LineupSnapshot,
	expectedRevision: number,
): TeamPlan => {
	const error = validateLineup(plan, snapshot);
	if (error) throw new Error(error);
	return writeTeamPlan(
		plan,
		{ ...planWithSnapshot(plan, snapshot), published: false },
		expectedRevision,
	);
};
