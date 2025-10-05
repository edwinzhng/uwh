import { eq } from "drizzle-orm";
import {
	type NewPracticeCoach,
	type PracticeCoach,
	practiceCoaches,
} from "../../db/schema";
import { db } from "../db";

export class PracticeCoachService {
	private static instance: PracticeCoachService;

	static getInstance(): PracticeCoachService {
		if (!PracticeCoachService.instance) {
			PracticeCoachService.instance = new PracticeCoachService();
		}
		return PracticeCoachService.instance;
	}

	async getPracticeCoaches(practiceId: number): Promise<PracticeCoach[]> {
		return await db
			.select()
			.from(practiceCoaches)
			.where(eq(practiceCoaches.practiceId, practiceId));
	}

	async createPracticeCoach(
		practiceCoachData: NewPracticeCoach,
	): Promise<PracticeCoach> {
		const result = await db
			.insert(practiceCoaches)
			.values(practiceCoachData)
			.returning();
		return result[0];
	}

	async updatePracticeCoach(
		id: number,
		practiceCoachData: Partial<NewPracticeCoach>,
	): Promise<PracticeCoach | null> {
		const result = await db
			.update(practiceCoaches)
			.set(practiceCoachData)
			.where(eq(practiceCoaches.id, id))
			.returning();
		return result[0] || null;
	}

	async deletePracticeCoach(id: number): Promise<boolean> {
		const result = await db
			.delete(practiceCoaches)
			.where(eq(practiceCoaches.id, id));
		return result.length > 0;
	}

	async deletePracticeCoachesByPractice(practiceId: number): Promise<boolean> {
		const result = await db
			.delete(practiceCoaches)
			.where(eq(practiceCoaches.practiceId, practiceId));
		return result.length > 0;
	}
}

export const practiceCoachService = PracticeCoachService.getInstance();
