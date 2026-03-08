import { v } from "convex/values";
import { api, internal } from "./_generated/api";
import type { Doc } from "./_generated/dataModel";
import { action, internalAction } from "./_generated/server";

// Keep this logic strictly in the Node environment because of all the random sorting and sorting algorithms
// that might be slow or unsupported in V8 isolate
("use node");

type Position = "FORWARD" | "WING" | "CENTER" | "FULL_BACK";

type TeamPlayer = Doc<"players"> & {
	assignedPositions?: Position[];
	team?: "black" | "white";
};

export interface GenerateTeamsResult {
	adults: { blackTeam: TeamPlayer[]; whiteTeam: TeamPlayer[] };
	youth: { blackTeam: TeamPlayer[]; whiteTeam: TeamPlayer[] };
	presentPlayers: Doc<"players">[];
}

const POSITION_ABBREVIATIONS: Record<string, string> = {
	FORWARD: "F",
	WING: "W",
	CENTER: "C",
	FULL_BACK: "FB",
};

// Copied TeamGeneratorService methods adapted as pure functions
function findDuplicateFirstNames(allPlayers: TeamPlayer[]): Set<string> {
	const firstNameCounts = new Map<string, number>();

	for (const player of allPlayers) {
		const firstName = player.fullName.split(" ")[0].toLowerCase();
		firstNameCounts.set(firstName, (firstNameCounts.get(firstName) || 0) + 1);
	}

	const duplicates = new Set<string>();
	for (const [firstName, count] of firstNameCounts) {
		if (count > 1) {
			duplicates.add(firstName);
		}
	}

	return duplicates;
}

function getDisplayName(
	player: TeamPlayer,
	duplicateFirstNames: Set<string>,
): string {
	const nameParts = player.fullName.split(" ");
	const firstName = nameParts[0];

	if (duplicateFirstNames.has(firstName.toLowerCase())) {
		return player.fullName;
	}

	return firstName;
}

function formatTeamForDiscord(
	team: TeamPlayer[],
	teamName: string,
	duplicateFirstNames: Set<string>,
): string {
	const forwardPlayers = team.filter((p) =>
		p.assignedPositions?.includes("FORWARD"),
	);
	const backPlayers = team.filter(
		(p) => p.assignedPositions && !p.assignedPositions.includes("FORWARD"),
	);

	const positionGroups = {
		FORWARD: forwardPlayers,
		WING: backPlayers.filter((p) => p.assignedPositions?.includes("WING")),
		CENTER: backPlayers.filter((p) => p.assignedPositions?.includes("CENTER")),
		FULL_BACK: backPlayers.filter((p) =>
			p.assignedPositions?.includes("FULL_BACK"),
		),
	};

	let teamText = `**${teamName} team:**\n`;

	for (const [position, positionPlayers] of Object.entries(positionGroups)) {
		const positionAbbr = POSITION_ABBREVIATIONS[position] || position;
		for (const player of positionPlayers) {
			const displayName = getDisplayName(player, duplicateFirstNames);
			teamText += `${positionAbbr} - ${displayName}\n`;
		}
	}

	return teamText;
}

function buildPositionQueue(
	players: TeamPlayer[],
	position: Position,
): TeamPlayer[] {
	return players
		.filter((p) => p.positions.includes(position))
		.sort((a, b) => {
			const aExclusive = a.positions.length === 1 ? 0 : 1;
			const bExclusive = b.positions.length === 1 ? 0 : 1;
			if (aExclusive !== bExclusive) return aExclusive - bExclusive;
			return b.rating - a.rating;
		});
}

function pullFromQueue(
	queue: TeamPlayer[],
	assigned: Set<string>,
): TeamPlayer | null {
	for (const player of queue) {
		if (!assigned.has(player._id)) {
			return player;
		}
	}
	return null;
}

function doGenerateTeams(players: TeamPlayer[]): {
	blackTeam: TeamPlayer[];
	whiteTeam: TeamPlayer[];
} {
	// Re-use logic from TeamGeneratorService for balance
	const queues: Record<Position, TeamPlayer[]> = {
		FORWARD: buildPositionQueue(players, "FORWARD"),
		WING: buildPositionQueue(players, "WING"),
		CENTER: buildPositionQueue(players, "CENTER"),
		FULL_BACK: buildPositionQueue(players, "FULL_BACK"),
	};

	const fallbacks: Record<Position, Position[]> = {
		FORWARD: ["WING", "CENTER", "FULL_BACK"],
		WING: ["FORWARD", "CENTER", "FULL_BACK"],
		CENTER: ["FULL_BACK", "WING", "FORWARD"],
		FULL_BACK: ["CENTER", "WING", "FORWARD"],
	};

	const assigned = new Set<string>();
	const blackTeam: TeamPlayer[] = [];
	const whiteTeam: TeamPlayer[] = [];

	const teamRating = (team: TeamPlayer[]) =>
		team.reduce((sum, p) => sum + p.rating, 0);

	const pullForPositionWithFallback = (
		position: Position,
	): [TeamPlayer, Position] | null => {
		const primary = pullFromQueue(queues[position], assigned);
		if (primary) return [primary, position];
		for (const fb of fallbacks[position]) {
			const candidate = pullFromQueue(queues[fb], assigned);
			if (candidate) return [candidate, fb];
		}
		return null;
	};

	const positionPriority: Position[] = [
		"FULL_BACK",
		"CENTER",
		"WING",
		"FORWARD",
	];

	const pullAny = (): [TeamPlayer, Position] | null => {
		const remaining = players
			.filter((p) => !assigned.has(p._id))
			.sort((a, b) => b.rating - a.rating);

		for (const player of remaining) {
			const pos =
				positionPriority.find((pos) => {
					const blackCount = blackTeam.filter((p) =>
						p.assignedPositions?.includes(pos),
					).length;
					const whiteCount = whiteTeam.filter((p) =>
						p.assignedPositions?.includes(pos),
					).length;
					return blackCount !== whiteCount;
				}) ??
				positionPriority.find((pos) => {
					const blackCount = blackTeam.filter((p) =>
						p.assignedPositions?.includes(pos),
					).length;
					const whiteCount = whiteTeam.filter((p) =>
						p.assignedPositions?.includes(pos),
					).length;
					return blackCount < 2 || whiteCount < 2;
				}) ??
				"FORWARD";
			return [player, pos];
		}
		return null;
	};

	const assignPair = (
		first: [TeamPlayer, Position],
		second: [TeamPlayer, Position],
	) => {
		const [playerA, playerB] =
			first[0].rating >= second[0].rating ? [first, second] : [second, first];

		const weakTeam: "black" | "white" =
			teamRating(blackTeam) <= teamRating(whiteTeam) ? "black" : "white";
		const strongTeam: "black" | "white" =
			weakTeam === "black" ? "white" : "black";

		(weakTeam === "black" ? blackTeam : whiteTeam).push({
			...playerA[0],
			team: weakTeam,
			assignedPositions: [playerA[1]],
		});
		(strongTeam === "black" ? blackTeam : whiteTeam).push({
			...playerB[0],
			team: strongTeam,
			assignedPositions: [playerB[1]],
		});
	};

	const assignSingle = (player: [TeamPlayer, Position]) => {
		const blackCount = blackTeam.filter((p) =>
			p.assignedPositions?.includes(player[1]),
		).length;
		const whiteCount = whiteTeam.filter((p) =>
			p.assignedPositions?.includes(player[1]),
		).length;
		const targetTeam: "black" | "white" =
			blackCount <= whiteCount
				? teamRating(blackTeam) <= teamRating(whiteTeam)
					? "black"
					: "white"
				: blackCount < whiteCount
					? "black"
					: "white";
		(targetTeam === "black" ? blackTeam : whiteTeam).push({
			...player[0],
			team: targetTeam,
			assignedPositions: [player[1]],
		});
	};

	const fillSlot = (position: Position) => {
		const first = pullForPositionWithFallback(position);
		if (!first) return;
		assigned.add(first[0]._id);

		const second = pullForPositionWithFallback(position);
		if (!second) {
			assignSingle(first);
			return;
		}
		assigned.add(second[0]._id);
		assignPair(first, second);
	};

	const fillSlotAny = (position: Position) => {
		const first = pullForPositionWithFallback(position) ?? pullAny();
		if (!first) return;
		assigned.add(first[0]._id);

		const second = pullForPositionWithFallback(position) ?? pullAny();
		if (!second) {
			assignSingle(first);
			return;
		}
		assigned.add(second[0]._id);
		assignPair(first, second);
	};

	fillSlot("FULL_BACK");
	fillSlot("CENTER");
	fillSlot("FORWARD");
	fillSlot("FORWARD");
	fillSlot("WING");
	fillSlot("WING");

	fillSlot("FULL_BACK");
	fillSlot("CENTER");
	fillSlot("FORWARD");
	fillSlot("FORWARD");
	fillSlot("WING");
	fillSlot("WING");

	fillSlotAny("FULL_BACK");
	fillSlotAny("CENTER");
	fillSlotAny("WING");
	fillSlotAny("FORWARD");

	const unassigned = players
		.filter((p) => !assigned.has(p._id))
		.sort((a, b) => b.rating - a.rating);

	const rrPositions: Position[] = ["FORWARD", "WING"];
	let rrIdx = 0;

	for (const player of unassigned) {
		const assignedPos = rrPositions[rrIdx++ % rrPositions.length];
		const targetTeam: "black" | "white" =
			teamRating(blackTeam) <= teamRating(whiteTeam) ? "black" : "white";
		assigned.add(player._id);
		(targetTeam === "black" ? blackTeam : whiteTeam).push({
			...player,
			team: targetTeam,
			assignedPositions: [assignedPos],
		});
	}

	return { blackTeam, whiteTeam };
}

export const generateTeams = action({
	args: {
		practiceId: v.id("practices"),
		excludedPlayerIds: v.optional(v.array(v.id("players"))),
		combineYouth: v.optional(v.boolean()),
	},
	handler: async (ctx, args): Promise<GenerateTeamsResult> => {
		const eventDetail = await ctx.runAction(
			internal.sporteasy.getEventAttendees,
			{
				practiceId: args.practiceId,
			},
		);

		const attendingSporteasyIds = new Set(
			eventDetail.attendees
				.filter((a) => a.attendance_status === "present")
				.flatMap((a) => a.results.map((r) => r.profile.id)),
		);

		const allPlayersRaw = (await ctx.runQuery(
			api.players.getPlayers,
		)) as Doc<"players">[];

		const excludedIds = new Set(args.excludedPlayerIds || []);
		const presentPlayers = allPlayersRaw.filter(
			(p) =>
				p.sporteasyId &&
				attendingSporteasyIds.has(p.sporteasyId) &&
				!excludedIds.has(p._id),
		);

		if (presentPlayers.length === 0) {
			return {
				adults: { blackTeam: [], whiteTeam: [] },
				youth: { blackTeam: [], whiteTeam: [] },
				presentPlayers: [],
			};
		}

		if (args.combineYouth) {
			const { blackTeam, whiteTeam } = doGenerateTeams(presentPlayers);
			return {
				adults: { blackTeam, whiteTeam },
				youth: { blackTeam: [], whiteTeam: [] },
				presentPlayers,
			};
		}

		const adultPlayers = presentPlayers.filter((p) => !p.youth);
		const youthPlayers = presentPlayers.filter((p) => p.youth);

		const adults = doGenerateTeams(adultPlayers);
		const youth = doGenerateTeams(youthPlayers);

		return {
			adults,
			youth,
			presentPlayers,
		};
	},
});

export const generateTeamsAndMessage = internalAction({
	args: { players: v.any() },
	handler: async (_ctx, args) => {
		const players = args.players as TeamPlayer[];
		if (players.length === 0) return "**No players to generate teams for.**";

		const { blackTeam, whiteTeam } = doGenerateTeams(players);

		// Format output
		const duplicateFirstNames = findDuplicateFirstNames(players);

		const blackTeamText = formatTeamForDiscord(
			blackTeam,
			"Black",
			duplicateFirstNames,
		);
		const whiteTeamText = formatTeamForDiscord(
			whiteTeam,
			"White",
			duplicateFirstNames,
		);

		return `${blackTeamText}\n${whiteTeamText}`;
	},
});
