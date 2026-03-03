import type { Player } from "../../db/schema";

interface PlayerWithTeam extends Player {
	team: "black" | "white" | null;
	assignedPositions?: string[];
}

interface GeneratedTeams {
	blackTeam: PlayerWithTeam[];
	whiteTeam: PlayerWithTeam[];
}

const POSITION_ABBREVIATIONS: Record<string, string> = {
	FORWARD: "F",
	WING: "W",
	CENTER: "C",
	FULL_BACK: "FB",
};

type Position = "FORWARD" | "WING" | "CENTER" | "FULL_BACK";

export class TeamGeneratorService {
	private static instance: TeamGeneratorService;

	static getInstance(): TeamGeneratorService {
		if (!TeamGeneratorService.instance) {
			TeamGeneratorService.instance = new TeamGeneratorService();
		}
		return TeamGeneratorService.instance;
	}

	/**
	 * Get display name for a player, including last name if there are duplicate first names
	 */
	private getDisplayName(
		player: PlayerWithTeam,
		duplicateFirstNames: Set<string>,
	): string {
		const nameParts = player.fullName.split(" ");
		const firstName = nameParts[0];

		if (duplicateFirstNames.has(firstName.toLowerCase())) {
			return player.fullName;
		}

		return firstName;
	}

	/**
	 * Find first names that appear multiple times across all players
	 */
	private findDuplicateFirstNames(allPlayers: Player[]): Set<string> {
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

	/**
	 * Build a sorted queue for a position.
	 * Sort order: single-position players first (preference), then by rating descending within each group.
	 */
	private buildPositionQueue(players: Player[], position: Position): Player[] {
		return players
			.filter((p) => p.positions.includes(position))
			.sort((a, b) => {
				const aExclusive = a.positions.length === 1 ? 0 : 1;
				const bExclusive = b.positions.length === 1 ? 0 : 1;
				if (aExclusive !== bExclusive) return aExclusive - bExclusive;
				return b.rating - a.rating;
			});
	}

	/**
	 * Pull the next unassigned player from a queue.
	 * Returns the player and their index, or null if the queue is exhausted.
	 */
	private pullFromQueue(queue: Player[], assigned: Set<number>): Player | null {
		for (const player of queue) {
			if (!assigned.has(player.id)) {
				return player;
			}
		}
		return null;
	}

	/**
	 * Generate balanced teams from a list of players.
	 *
	 * Strategy:
	 *   Phase 1 – Fill base slots (1C, 1FB, 2F, 2W per team). CENTER and FULL_BACK
	 *             are filled first so versatile players aren't consumed by FORWARD/WING
	 *             before the harder-to-fill positions get their pick. Within each
	 *             position, single-position players are preferred over multi-position.
	 *             Falls back to related positions if the primary queue is exhausted.
	 *   Phase 2 – Fill extra slots (1 more C/FB, 2 more F/W per team) using the
	 *             same queue/fallback logic.
	 *   Phase 3 – Any remaining unassigned players are round-robined between
	 *             FORWARD and WING regardless of listed positions.
	 *
	 * Balance rule: for each pair of assignments (one per team), the higher-rated
	 * player goes to whichever team currently has the lower total rating (black on a tie).
	 */
	generateTeams(players: Player[]): GeneratedTeams {
		if (players.length === 0) return { blackTeam: [], whiteTeam: [] };

		const queues: Record<Position, Player[]> = {
			FORWARD: this.buildPositionQueue(players, "FORWARD"),
			WING: this.buildPositionQueue(players, "WING"),
			CENTER: this.buildPositionQueue(players, "CENTER"),
			FULL_BACK: this.buildPositionQueue(players, "FULL_BACK"),
		};

		const fallbacks: Record<Position, Position[]> = {
			FORWARD: ["WING", "CENTER", "FULL_BACK"],
			WING: ["FORWARD", "CENTER", "FULL_BACK"],
			CENTER: ["FULL_BACK", "WING", "FORWARD"],
			FULL_BACK: ["CENTER", "WING", "FORWARD"],
		};

		const assigned = new Set<number>();
		const blackTeam: PlayerWithTeam[] = [];
		const whiteTeam: PlayerWithTeam[] = [];

		const teamRating = (team: PlayerWithTeam[]) =>
			team.reduce((sum, p) => sum + p.rating, 0);

		const pullForPositionWithFallback = (
			position: Position,
		): [Player, Position] | null => {
			const primary = this.pullFromQueue(queues[position], assigned);
			if (primary) return [primary, position];
			for (const fb of fallbacks[position]) {
				const candidate = this.pullFromQueue(queues[fb], assigned);
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

		const pullAny = (): [Player, Position] | null => {
			const remaining = players
				.filter((p) => !assigned.has(p.id))
				.sort((a, b) => b.rating - a.rating);

			for (const player of remaining) {
				// Find the position this player can fill that is most needed
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
			first: [Player, Position],
			second: [Player, Position],
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

		const assignSingle = (player: [Player, Position]) => {
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
			assigned.add(first[0].id);

			const second = pullForPositionWithFallback(position);
			if (!second) {
				assignSingle(first);
				return;
			}
			assigned.add(second[0].id);
			assignPair(first, second);
		};

		const fillSlotAny = (position: Position) => {
			const first = pullForPositionWithFallback(position) ?? pullAny();
			if (!first) return;
			assigned.add(first[0].id);

			const second = pullForPositionWithFallback(position) ?? pullAny();
			if (!second) {
				assignSingle(first);
				return;
			}
			assigned.add(second[0].id);
			assignPair(first, second);
		};

		// Phase 1: FULL_BACK and CENTER first to protect versatile players
		fillSlot("FULL_BACK");
		fillSlot("CENTER");
		fillSlot("FORWARD");
		fillSlot("FORWARD");
		fillSlot("WING");
		fillSlot("WING");

		// Phase 2: extra slots (doubles the base)
		fillSlot("FULL_BACK");
		fillSlot("CENTER");
		fillSlot("FORWARD");
		fillSlot("FORWARD");
		fillSlot("WING");
		fillSlot("WING");

		// Phase 2b: absorb any remaining players into back positions first,
		// ignoring position eligibility — any unassigned player can fill any slot
		fillSlotAny("FULL_BACK");
		fillSlotAny("CENTER");
		fillSlotAny("WING");
		fillSlotAny("FORWARD");

		// Phase 3: truly leftover round-robin F/W
		const unassigned = players
			.filter((p) => !assigned.has(p.id))
			.sort((a, b) => b.rating - a.rating);

		const rrPositions: Position[] = ["FORWARD", "WING"];
		let rrIdx = 0;

		for (const player of unassigned) {
			const assignedPos = rrPositions[rrIdx++ % rrPositions.length];
			const targetTeam: "black" | "white" =
				teamRating(blackTeam) <= teamRating(whiteTeam) ? "black" : "white";
			assigned.add(player.id);
			(targetTeam === "black" ? blackTeam : whiteTeam).push({
				...player,
				team: targetTeam,
				assignedPositions: [assignedPos],
			});
		}

		return { blackTeam, whiteTeam };
	}

	/**
	 * Format a team for Discord/text output
	 */
	formatTeamForDiscord(
		team: PlayerWithTeam[],
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
			CENTER: backPlayers.filter((p) =>
				p.assignedPositions?.includes("CENTER"),
			),
			FULL_BACK: backPlayers.filter((p) =>
				p.assignedPositions?.includes("FULL_BACK"),
			),
		};

		let teamText = `**${teamName} team:**\n`;

		for (const [position, positionPlayers] of Object.entries(positionGroups)) {
			const positionAbbr = POSITION_ABBREVIATIONS[position] || position;
			for (const player of positionPlayers) {
				const displayName = this.getDisplayName(player, duplicateFirstNames);
				teamText += `${positionAbbr} - ${displayName}\n`;
			}
		}

		return teamText;
	}

	/**
	 * Format both teams for Discord message
	 */
	formatTeamsMessage(teams: GeneratedTeams): string {
		const allPlayers = [...teams.blackTeam, ...teams.whiteTeam];
		const duplicateFirstNames = this.findDuplicateFirstNames(allPlayers);

		const blackTeamText = this.formatTeamForDiscord(
			teams.blackTeam,
			"Black",
			duplicateFirstNames,
		);
		const whiteTeamText = this.formatTeamForDiscord(
			teams.whiteTeam,
			"White",
			duplicateFirstNames,
		);

		return `${blackTeamText}\n${whiteTeamText}`;
	}
}

export const teamGeneratorService = TeamGeneratorService.getInstance();
