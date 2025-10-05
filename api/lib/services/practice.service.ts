import { asc, eq, gte, sql } from "drizzle-orm";
import { type NewPractice, type Practice, practices } from "../../db/schema";
import { db } from "../db";

export class PracticeService {
	private static instance: PracticeService;

	static getInstance(): PracticeService {
		if (!PracticeService.instance) {
			PracticeService.instance = new PracticeService();
		}
		return PracticeService.instance;
	}

	async getPractices(): Promise<Practice[]> {
		// Get the start of today (midnight)
		const today = new Date();
		today.setHours(0, 0, 0, 0);

		return await db
			.select()
			.from(practices)
			.where(gte(practices.date, today))
			.orderBy(asc(practices.date));
	}

	async getPastPractices(): Promise<Practice[]> {
		// Get the start of today (midnight)
		const today = new Date();
		today.setHours(0, 0, 0, 0);

		return await db
			.select()
			.from(practices)
			.where(sql`${practices.date} < ${today}`)
			.orderBy(desc(practices.date));
	}

	async getPracticeById(id: number): Promise<Practice | null> {
		const result = await db
			.select()
			.from(practices)
			.where(eq(practices.id, id))
			.limit(1);
		return result[0] || null;
	}

	async createPractice(practiceData: NewPractice): Promise<Practice> {
		const result = await db.insert(practices).values(practiceData).returning();
		return result[0];
	}

	async updatePractice(
		id: number,
		practiceData: Partial<NewPractice>,
	): Promise<Practice | null> {
		const dataToUpdate = {
			...practiceData,
			updatedAt: new Date(),
		};
		const result = await db
			.update(practices)
			.set(dataToUpdate)
			.where(eq(practices.id, id))
			.returning();
		return result[0] || null;
	}

	async deletePractice(id: number): Promise<boolean> {
		const result = await db.delete(practices).where(eq(practices.id, id));
		return result.length > 0;
	}

	async batchUpsertPractices(practiceData: NewPractice[]): Promise<Practice[]> {
		if (practiceData.length === 0) {
			return [];
		}

		const result = await db
			.insert(practices)
			.values(practiceData)
			.onConflictDoUpdate({
				target: practices.sporteasyId,
				set: {
					date: sql`excluded.date`,
					notes: sql`excluded.notes`,
					updatedAt: sql`excluded.updated_at`,
				},
			})
			.returning();

		return result;
	}
}

export const practiceService = PracticeService.getInstance();

