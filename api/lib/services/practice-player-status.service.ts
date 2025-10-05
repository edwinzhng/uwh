import { and, desc, eq } from "drizzle-orm";
import {
	type NewPracticePlayerStatus,
	type PracticePlayerStatus,
	type PracticePlayerStatusType,
	practicePlayerStatuses,
} from "../../db/schema";
import { db } from "../db";

export class PracticePlayerStatusService {
	private static instance: PracticePlayerStatusService;

	static getInstance(): PracticePlayerStatusService {
		if (!PracticePlayerStatusService.instance) {
			PracticePlayerStatusService.instance = new PracticePlayerStatusService();
		}
		return PracticePlayerStatusService.instance;
	}

	async getPracticePlayerStatuses(practiceId: number): Promise<PracticePlayerStatus[]> {
		return await db
			.select()
			.from(practicePlayerStatuses)
			.where(eq(practicePlayerStatuses.practiceId, practiceId))
			.orderBy(desc(practicePlayerStatuses.createdAt));
	}

	async getPracticePlayerStatusesByPlayer(playerId: number): Promise<PracticePlayerStatus[]> {
		return await db
			.select()
			.from(practicePlayerStatuses)
			.where(eq(practicePlayerStatuses.playerId, playerId))
			.orderBy(desc(practicePlayerStatuses.createdAt));
	}

	async getPracticePlayerStatusesByType(
		practiceId: number,
		statusType: PracticePlayerStatusType,
	): Promise<PracticePlayerStatus[]> {
		return await db
			.select()
			.from(practicePlayerStatuses)
			.where(
				and(
					eq(practicePlayerStatuses.practiceId, practiceId),
					eq(practicePlayerStatuses.statusType, statusType),
				),
			)
			.orderBy(desc(practicePlayerStatuses.createdAt));
	}

	async createPracticePlayerStatus(
		practicePlayerStatusData: NewPracticePlayerStatus,
	): Promise<PracticePlayerStatus> {
		const result = await db
			.insert(practicePlayerStatuses)
			.values(practicePlayerStatusData)
			.returning();
		return result[0];
	}

	async updatePracticePlayerStatus(
		id: number,
		practicePlayerStatusData: Partial<NewPracticePlayerStatus>,
	): Promise<PracticePlayerStatus | null> {
		const result = await db
			.update(practicePlayerStatuses)
			.set(practicePlayerStatusData)
			.where(eq(practicePlayerStatuses.id, id))
			.returning();
		return result[0] || null;
	}

	async deletePracticePlayerStatus(id: number): Promise<boolean> {
		const result = await db
			.delete(practicePlayerStatuses)
			.where(eq(practicePlayerStatuses.id, id));
		return result.length > 0;
	}

	async deletePracticePlayerStatusesByPractice(practiceId: number): Promise<boolean> {
		const result = await db
			.delete(practicePlayerStatuses)
			.where(eq(practicePlayerStatuses.practiceId, practiceId));
		return result.length > 0;
	}
}

export const practicePlayerStatusService = PracticePlayerStatusService.getInstance();
