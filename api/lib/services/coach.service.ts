import { desc, eq } from "drizzle-orm";
import { type Coach, coaches, type NewCoach } from "../../db/schema";
import { db } from "../db";

export class CoachService {
	private static instance: CoachService;

	static getInstance(): CoachService {
		if (!CoachService.instance) {
			CoachService.instance = new CoachService();
		}
		return CoachService.instance;
	}

	async getCoaches(): Promise<Coach[]> {
		return await db.select().from(coaches).orderBy(desc(coaches.createdAt));
	}

	async getActiveCoaches(): Promise<Coach[]> {
		return await db
			.select()
			.from(coaches)
			.where(eq(coaches.isActive, true))
			.orderBy(desc(coaches.createdAt));
	}

	async getCoachById(id: number): Promise<Coach | null> {
		const result = await db
			.select()
			.from(coaches)
			.where(eq(coaches.id, id))
			.limit(1);
		return result[0] || null;
	}

	async createCoach(coachData: NewCoach): Promise<Coach> {
		const result = await db.insert(coaches).values(coachData).returning();
		return result[0];
	}

	async updateCoach(
		id: number,
		coachData: Partial<NewCoach>,
	): Promise<Coach | null> {
		const result = await db
			.update(coaches)
			.set(coachData)
			.where(eq(coaches.id, id))
			.returning();
		return result[0] || null;
	}

	async deleteCoach(id: number): Promise<boolean> {
		const result = await db.delete(coaches).where(eq(coaches.id, id));
		return result.length > 0;
	}
}

export const coachService = CoachService.getInstance();
