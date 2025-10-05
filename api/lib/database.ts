import dotenv from "dotenv";
import { desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import {
	type NewPlayer,
	type Player,
	type Position,
	players,
} from "../db/schema";

dotenv.config();

// Database configuration
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
	throw new Error("Missing DATABASE_URL environment variable.");
}

// Initialize database connection
const client = postgres(connectionString);
export const db = drizzle(client);

// Database operations for players
export class PlayerService {
	private static instance: PlayerService;

	static getInstance(): PlayerService {
		if (!PlayerService.instance) {
			PlayerService.instance = new PlayerService();
		}
		return PlayerService.instance;
	}

	async getPlayers(): Promise<Player[]> {
		return await db.select().from(players).orderBy(desc(players.createdAt));
	}

	async getPlayerById(id: number): Promise<Player | null> {
		const result = await db
			.select()
			.from(players)
			.where(eq(players.id, id))
			.limit(1);
		return result[0] || null;
	}

	async createPlayer(playerData: NewPlayer): Promise<Player> {
		const result = await db.insert(players).values(playerData).returning();
		return result[0];
	}

	async updatePlayer(
		id: number,
		playerData: Partial<NewPlayer>,
	): Promise<Player | null> {
		const result = await db
			.update(players)
			.set({ ...playerData, updatedAt: new Date() })
			.where(eq(players.id, id))
			.returning();
		return result[0] || null;
	}

	async deletePlayer(id: number): Promise<boolean> {
		const result = await db.delete(players).where(eq(players.id, id));
		return result.length > 0;
	}

	async getPlayersByPosition(position: Position): Promise<Player[]> {
		return await db
			.select()
			.from(players)
			.where(eq(players.position, position))
			.orderBy(desc(players.createdAt));
	}
}

export const playerService = PlayerService.getInstance();

// Export types
export type { Player, NewPlayer, Position };
