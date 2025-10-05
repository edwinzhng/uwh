import { arrayContains, desc, eq, sql } from "drizzle-orm";
import {
	type NewPlayer,
	type Player,
	type Position,
	players,
} from "../../db/schema";
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

		return result;
	}

	async getPlayerById(id: number): Promise<Player | null> {
		const result = await db
			.select()
			.from(players)
			.where(eq(players.id, id))
			.limit(1);

		return result.at(0) ?? null;
	}

	async createPlayer(playerData: NewPlayer): Promise<Player> {
		const dataToInsert = {
			...playerData,
			positions: playerData.positions,
		};
		const result = await db.insert(players).values(dataToInsert).returning();
		return result.at(0) ?? null;
	}

	async updatePlayer(
		id: number,
		playerData: Partial<NewPlayer>,
	): Promise<Player | null> {
		const result = await db
			.update(players)
			.set(playerData)
			.where(eq(players.id, id))
			.returning();
		return result.at(0) ?? null;
	}

	async batchUpsertPlayers(playerData: NewPlayer[]): Promise<Player[]> {
		if (playerData.length === 0) {
			return [];
		}

		const result = await db
			.insert(players)
			.values(playerData)
			.onConflictDoUpdate({
				target: players.sporteasyId,
				set: {
					fullName: sql`excluded.full_name`,
					email: sql`excluded.email`,
					parentEmail: sql`excluded.parent_email`,
					positions: sql`excluded.positions`,
					rating: sql`excluded.rating`,
					youth: sql`excluded.youth`,
				},
			})
			.returning();

		return result;
	}

	async deletePlayer(id: number): Promise<boolean> {
		const result = await db
			.delete(players)
			.where(eq(players.id, id))
			.returning();
		return result.length > 0;
	}

	async getPlayersByPosition(position: Position): Promise<Player[]> {
		return await db
			.select()
			.from(players)
			.where(arrayContains(players.positions, [position]))
			.orderBy(desc(players.createdAt));
	}
}

export const playerService = PlayerService.getInstance();
