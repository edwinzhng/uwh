import { eq } from "drizzle-orm";
import { type Setting, settings } from "../../db/schema";
import { db } from "../db";

export class SettingsService {
	private static instance: SettingsService;

	static getInstance(): SettingsService {
		if (!SettingsService.instance) {
			SettingsService.instance = new SettingsService();
		}
		return SettingsService.instance;
	}

	async getSettingByKey(key: string): Promise<Setting | null> {
		const result = await db
			.select()
			.from(settings)
			.where(eq(settings.key, key))
			.limit(1);

		return result[0] || null;
	}

	async upsertSetting(key: string, value: string): Promise<Setting> {
		const result = await db
			.insert(settings)
			.values({
				key,
				value,
				updatedAt: new Date(),
			})
			.onConflictDoUpdate({
				target: settings.key,
				set: {
					value,
					updatedAt: new Date(),
				},
			})
			.returning();

		return result[0];
	}
}

export const settingsService = SettingsService.getInstance();
