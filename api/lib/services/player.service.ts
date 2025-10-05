import { arrayContains, desc, eq } from "drizzle-orm";
import { type NewPlayer, type Player, type Position, players } from "../../db/schema";
import { db } from "../db";

export class PlayerService {
	private static instance: PlayerService;

	static getInstance(): PlayerService {
		if (!PlayerService.instance) {
			PlayerService.instance = new PlayerService();
		}
		return PlayerService.instance;
	}

	async getPlayers(): Promise<Player[]> {
		const result = await db
			.select()
			.from(players)
			.orderBy(desc(players.createdAt));
		return result.map((player) => ({
			...player,
			positions: JSON.parse(player.positions as string),
		})) as Player[];
	}

	async getPlayerById(id: number): Promise<Player | null> {
		const result = await db
			.select()
			.from(players)
			.where(eq(players.id, id))
			.limit(1);
		if (!result[0]) return null;
		return {
			...result[0],
			positions: JSON.parse(result[0].positions as string),
		} as Player;
	}

	async createPlayer(playerData: NewPlayer): Promise<Player> {
		const dataToInsert = {
			...playerData,
			positions: JSON.stringify(playerData.positions),
		};
		const result = await db.insert(players).values(dataToInsert).returning();
		return {
			...result[0],
			positions: JSON.parse(result[0].positions as string),
		} as Player;
	}

	async updatePlayer(
		id: number,
		playerData: Partial<NewPlayer>,
	): Promise<Player | null> {
		const dataToUpdate: Partial<Player> = {
			...playerData,
		};
		if (playerData.positions) {
			dataToUpdate.positions = JSON.stringify(playerData.positions);
		}
		const result = await db
			.update(players)
			.set(dataToUpdate)
			.where(eq(players.id, id))
			.returning();
		if (!result[0]) return null;
		return {
			...result[0],
			positions: JSON.parse(result[0].positions as string),
		} as Player;
	}

	async deletePlayer(id: number): Promise<boolean> {
		const result = await db.delete(players).where(eq(players.id, id));
		return result.length > 0;
	}

	async getPlayersByPosition(position: Position): Promise<Player[]> {
		return await db
			.select()
			.from(players)
			.where(arrayContains(players.positions, position))
			.orderBy(desc(players.createdAt));
	}
}

export const playerService = PlayerService.getInstance();

