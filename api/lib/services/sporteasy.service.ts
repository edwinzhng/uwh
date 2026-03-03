import {
	SPORTEASY_COOKIE,
	SPORTEASY_SEASON_ID,
	SPORTEASY_TEAM_ID,
	SPORTEASY_V2_1_BASE_URL,
	SPORTEASY_V2_3_BASE_URL,
	type SportEasyEvent,
	type SportEasyEventAttendeesResponse,
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

	private async getCookie(): Promise<string> {
		const { settingsService } = await import("./settings.service");
		const dbCookie = await settingsService.getSettingByKey("sporteasy_cookie");
		const cookie = dbCookie?.value || SPORTEASY_COOKIE;

		if (!cookie) {
			throw new Error("SportEasy cookie is not configured in settings or env");
		}

		return cookie;
	}

	async getProfiles(): Promise<SportEasyProfile[]> {
		const cookie = await this.getCookie();
		const url = `${SPORTEASY_V2_3_BASE_URL}/teams/${SPORTEASY_TEAM_ID}/profiles/`;

		try {
			const response = await fetch(url, {
				method: "GET",
				headers: {
					Cookie: cookie,
					"Content-Type": "application/json",
				},
			});

			if (!response.ok) {
				throw new Error(
					`SportEasy API error: ${response.status} ${response.statusText}`,
				);
			}

			const data = (await response.json()) as SportEasyProfilesResponse;
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
		const cookie = await this.getCookie();

		if (!SPORTEASY_SEASON_ID) {
			throw new Error("SportEasy season ID is not configured");
		}

		try {
			const url = `${SPORTEASY_V2_1_BASE_URL}/teams/${SPORTEASY_TEAM_ID}/events/?season_id=${SPORTEASY_SEASON_ID}`;
			const response = await fetch(url, {
				method: "GET",
				headers: {
					Cookie: cookie,
					"Content-Type": "application/json",
				},
			});

			if (!response.ok) {
				throw new Error(
					`SportEasy API error: ${response.status} ${response.statusText}`,
				);
			}

			const data = (await response.json()) as SportEasyEventsResponse;
			return data.results || [];
		} catch (error) {
			console.error("Error fetching SportEasy events:", error);
			throw error;
		}
	}

	async getEventAttendees(
		eventId: number,
	): Promise<SportEasyEventAttendeesResponse> {
		const cookie = await this.getCookie();
		const url = `${SPORTEASY_V2_1_BASE_URL}/teams/${SPORTEASY_TEAM_ID}/events/${eventId}`;

		try {
			const response = await fetch(url, {
				method: "GET",
				headers: {
					Cookie: cookie,
					"Content-Type": "application/json",
				},
			});

			if (!response.ok) {
				throw new Error(
					`SportEasy API error: ${response.status} ${response.statusText}`,
				);
			}

			const data = (await response.json()) as SportEasyEventAttendeesResponse;
			return data;
		} catch (error) {
			console.error("Error fetching SportEasy event attendees:", error);
			throw error;
		}
	}
}

export const sportEasyService = SportEasyService.getInstance();
