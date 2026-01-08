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

export class TeamGeneratorService {
	private static instance: TeamGeneratorService;

	static getInstance(): TeamGeneratorService {
		if (!TeamGeneratorService.instance) {
			TeamGeneratorService.instance = new TeamGeneratorService();
		}
		return TeamGeneratorService.instance;
	}

	/**
	 * Assign positions to a team of players based on their preferences
	 */
	private assignPositionsToTeam(teamPlayers: PlayerWithTeam[]): PlayerWithTeam[] {
		const positionRequirements = {
			FORWARD: 2,
			WING: 2,
			CENTER: 1,
			FULL_BACK: 1,
		};

		// Sort players by preference: single position players first, then by rating
		const sortedPlayers = [...teamPlayers].sort((a, b) => {
			if (a.positions.length !== b.positions.length) {
				return a.positions.length - b.positions.length;
			}
			return b.rating - a.rating;
		});

		const assignedPlayers: PlayerWithTeam[] = [];
		const positionCounts = { FORWARD: 0, WING: 0, CENTER: 0, FULL_BACK: 0 };

		// First pass: assign players who can only play one position
		for (const player of sortedPlayers) {
			if (player.positions.length === 1) {
				const position = player.positions[0];
				if (
					positionCounts[position as keyof typeof positionCounts] <
					positionRequirements[position as keyof typeof positionRequirements]
				) {
					assignedPlayers.push({ ...player, assignedPositions: [position] });
					positionCounts[position as keyof typeof positionCounts]++;
				}
			}
		}

		// Second pass: assign remaining players to fill required positions
		for (const player of sortedPlayers) {
			if (
				player.positions.length > 1 &&
				!assignedPlayers.find((p) => p.id === player.id)
			) {
				for (const position of player.positions) {
					if (
						positionCounts[position as keyof typeof positionCounts] <
						positionRequirements[position as keyof typeof positionRequirements]
					) {
						assignedPlayers.push({ ...player, assignedPositions: [position] });
						positionCounts[position as keyof typeof positionCounts]++;
						break;
					}
				}
			}
		}

		// Third pass: round robin for remaining players
		const unassignedPlayers = sortedPlayers.filter(
			(player) => !assignedPlayers.find((p) => p.id === player.id),
		);
		const roundRobinPositions = ["FORWARD", "WING", "CENTER", "FULL_BACK"];
		let positionIndex = 0;

		for (const player of unassignedPlayers) {
			let assigned = false;
			for (let i = 0; i < roundRobinPositions.length && !assigned; i++) {
				const position =
					roundRobinPositions[(positionIndex + i) % roundRobinPositions.length];
				if (player.positions.includes(position)) {
					assignedPlayers.push({ ...player, assignedPositions: [position] });
					positionCounts[position as keyof typeof positionCounts]++;
					positionIndex = (positionIndex + i + 1) % roundRobinPositions.length;
					assigned = true;
				}
			}

			// If no position found, assign to first available position
			if (!assigned && player.positions.length > 0) {
				const position = player.positions[0];
				assignedPlayers.push({ ...player, assignedPositions: [position] });
				positionCounts[position as keyof typeof positionCounts]++;
			}
		}

		return assignedPlayers;
	}

	/**
	 * Generate balanced teams from a list of players
	 */
	generateTeams(players: Player[]): GeneratedTeams {
		if (players.length === 0) {
			return { blackTeam: [], whiteTeam: [] };
		}

		// Sort players by rating (descending)
		const sortedPlayers = [...players].sort((a, b) => b.rating - a.rating);

		// Assign teams alternating by player order
		const blackTeam: PlayerWithTeam[] = [];
		const whiteTeam: PlayerWithTeam[] = [];

		sortedPlayers.forEach((player, index) => {
			const playerWithTeam: PlayerWithTeam = { ...player, team: null };
			if (index % 2 === 0) {
				playerWithTeam.team = "black";
				blackTeam.push(playerWithTeam);
			} else {
				playerWithTeam.team = "white";
				whiteTeam.push(playerWithTeam);
			}
		});

		// Balance teams by rating if needed
		const blackRating = blackTeam.reduce((sum, p) => sum + p.rating, 0);
		const whiteRating = whiteTeam.reduce((sum, p) => sum + p.rating, 0);

		if (Math.abs(blackRating - whiteRating) > 2 && blackTeam.length > 0 && whiteTeam.length > 0) {
			const blackHighest = blackTeam.reduce((max, p) =>
				p.rating > max.rating ? p : max,
			);
			const whiteHighest = whiteTeam.reduce((max, p) =>
				p.rating > max.rating ? p : max,
			);

			// Swap teams for these players
			blackHighest.team = "white";
			whiteHighest.team = "black";
		}

		// Assign positions to each team
		const blackTeamWithPositions = this.assignPositionsToTeam(blackTeam);
		const whiteTeamWithPositions = this.assignPositionsToTeam(whiteTeam);

		return {
			blackTeam: blackTeamWithPositions,
			whiteTeam: whiteTeamWithPositions,
		};
	}

	/**
	 * Format a team for Discord/text output
	 */
	formatTeamForDiscord(team: PlayerWithTeam[], teamName: string): string {
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
				const firstName = player.fullName.split(" ")[0];
				teamText += `${positionAbbr} - ${firstName}\n`;
			}
		}

		return teamText;
	}

	/**
	 * Format both teams for Discord message
	 */
	formatTeamsMessage(teams: GeneratedTeams): string {
		const blackTeamText = this.formatTeamForDiscord(teams.blackTeam, "Black");
		const whiteTeamText = this.formatTeamForDiscord(teams.whiteTeam, "White");

		return `${blackTeamText}\n${whiteTeamText}`;
	}
}

export const teamGeneratorService = TeamGeneratorService.getInstance();

