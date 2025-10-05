import {
	SPORTEASY_COOKIE,
	SPORTEASY_SEASON_ID,
	SPORTEASY_TEAM_ID,
	SPORTEASY_V2_1_BASE_URL,
	SPORTEASY_V2_3_BASE_URL,
	type SportEasyEvent,
	type SportEasyEventsResponse,
	type SportEasyProfile,
	type SportEasyProfilesResponse,
} from "../sporteasy";

export class SportEasyService {
	private static instance: SportEasyService;

	static getInstance(): SportEasyService {
		if (!SportEasyService.instance) {
			SportEasyService.instance = new SportEasyService();
		}
		return SportEasyService.instance;
	}

	async getProfiles(): Promise<SportEasyProfile[]> {
		if (!SPORTEASY_COOKIE) {
			throw new Error("SportEasy cookie is not configured");
		}

		const url = `${SPORTEASY_V2_3_BASE_URL}/teams/${SPORTEASY_TEAM_ID}/profiles/`;

		try {
			const response = await fetch(url, {
				method: "GET",
				headers: {
					Cookie: SPORTEASY_COOKIE,
					"Content-Type": "application/json",
				},
			});

			if (!response.ok) {
				throw new Error(
					`SportEasy API error: ${response.status} ${response.statusText}`,
				);
			}

			const data: SportEasyProfilesResponse = await response.json();
			return data || [];
		} catch (error) {
			console.error("Error fetching SportEasy profiles:", error);
			throw error;
		}
	}

	async getProfileByEmail(email: string): Promise<SportEasyProfile | null> {
		const profiles = await this.getProfiles();
		return profiles.find((p) => p.email === email) || null;
	}

	async getEvents(): Promise<SportEasyEvent[]> {
		if (!SPORTEASY_COOKIE) {
			throw new Error("SportEasy cookie is not configured");
		}

		const url = `${SPORTEASY_V2_1_BASE_URL}/teams/${SPORTEASY_TEAM_ID}/events/?season_id=${SPORTEASY_SEASON_ID}`;

		try {
			const response = await fetch(url, {
				method: "GET",
				headers: {
					Cookie: SPORTEASY_COOKIE,
					"Content-Type": "application/json",
				},
			});

			if (!response.ok) {
				throw new Error(
					`SportEasy API error: ${response.status} ${response.statusText}`,
				);
			}

			const data: SportEasyEventsResponse = await response.json();
			return data.results || [];
		} catch (error) {
			console.error("Error fetching SportEasy events:", error);
			throw error;
		}
	}
}

export const sportEasyService = SportEasyService.getInstance();
