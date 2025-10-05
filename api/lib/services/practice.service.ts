import { asc, desc, eq, gte, lt, sql } from "drizzle-orm";
import {
	coaches,
	type NewPractice,
	type Practice,
	type PracticeCoach,
	practiceCoaches,
	practices,
} from "../../db/schema";
import { db } from "../db";

export type PracticeCoachWithDetails = Pick<
	PracticeCoach,
	"id" | "coachId" | "durationMinutes"
> & {
	coachName: string;
};

export type PracticeWithCoaches = Practice & {
	practiceCoaches: PracticeCoachWithDetails[];
};

export class PracticeService {
	private static instance: PracticeService;

	static getInstance(): PracticeService {
		if (!PracticeService.instance) {
			PracticeService.instance = new PracticeService();
		}
		return PracticeService.instance;
	}

	async getPractices(): Promise<PracticeWithCoaches[]> {
		// Get the start of today (midnight)
		const today = new Date();
		today.setHours(0, 0, 0, 0);

		const rows = await db
			.select({
				practice: practices,
				practiceCoachId: practiceCoaches.id,
				coachId: practiceCoaches.coachId,
				coachName: coaches.name,
				durationMinutes: practiceCoaches.durationMinutes,
			})
			.from(practices)
			.leftJoin(practiceCoaches, eq(practices.id, practiceCoaches.practiceId))
			.leftJoin(coaches, eq(practiceCoaches.coachId, coaches.id))
			.where(gte(practices.date, today))
			.orderBy(asc(practices.date));

		// Group by practice ID and aggregate coaches
		const practiceMap = new Map<number, PracticeWithCoaches>();

		for (const row of rows) {
			if (!practiceMap.has(row.practice.id)) {
				practiceMap.set(row.practice.id, {
					...row.practice,
					practiceCoaches: [],
				});
			}

			const practice = practiceMap.get(row.practice.id);
			if (!practice) continue;

			// Only add coach if it exists (left join might return null)
			if (row.practiceCoachId && row.coachId && row.coachName) {
				practice.practiceCoaches.push({
					id: row.practiceCoachId,
					coachId: row.coachId,
					coachName: row.coachName,
					durationMinutes: row.durationMinutes ?? 90,
				});
			}
		}

		return Array.from(practiceMap.values());
	}

	async getPastPractices(): Promise<PracticeWithCoaches[]> {
		// Get the start of today (midnight)
		const today = new Date();
		today.setHours(0, 0, 0, 0);

		const rows = await db
			.select({
				practice: practices,
				practiceCoachId: practiceCoaches.id,
				coachId: practiceCoaches.coachId,
				coachName: coaches.name,
				durationMinutes: practiceCoaches.durationMinutes,
			})
			.from(practices)
			.leftJoin(practiceCoaches, eq(practices.id, practiceCoaches.practiceId))
			.leftJoin(coaches, eq(practiceCoaches.coachId, coaches.id))
			.where(lt(practices.date, today))
			.orderBy(desc(practices.date));

		// Group by practice ID and aggregate coaches
		const practiceMap = new Map<number, PracticeWithCoaches>();

		for (const row of rows) {
			if (!practiceMap.has(row.practice.id)) {
				practiceMap.set(row.practice.id, {
					...row.practice,
					practiceCoaches: [],
				});
			}

			const practice = practiceMap.get(row.practice.id);
			if (!practice) continue;

			// Only add coach if it exists (left join might return null)
			if (row.practiceCoachId && row.coachId && row.coachName) {
				practice.practiceCoaches.push({
					id: row.practiceCoachId,
					coachId: row.coachId,
					coachName: row.coachName,
					durationMinutes: row.durationMinutes ?? 90,
				});
			}
		}

		return Array.from(practiceMap.values());
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
