import {
	SPORTEASY_COOKIE,
	SPORTEASY_SEASON_IDS,
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
		if (!SPORTEASY_COOKIE) {
			throw new Error("SportEasy cookie is not configured");
		}

		const cookie = SPORTEASY_COOKIE;

		try {
			const allResults = await Promise.all(
				SPORTEASY_SEASON_IDS.map(async (seasonId) => {
					const url = `${SPORTEASY_V2_1_BASE_URL}/teams/${SPORTEASY_TEAM_ID}/events/?season_id=${seasonId}`;
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
				}),
			);

			// Flatten and deduplicate by event id
			const eventsMap = new Map<number, SportEasyEvent>();
			for (const events of allResults) {
				for (const event of events) {
					eventsMap.set(event.id, event);
				}
			}
			return Array.from(eventsMap.values());
		} catch (error) {
			console.error("Error fetching SportEasy events:", error);
			throw error;
		}
	}

	async getEventAttendees(
		eventId: number,
	): Promise<SportEasyEventAttendeesResponse> {
		if (!SPORTEASY_COOKIE) {
			throw new Error("SportEasy cookie is not configured");
		}

		const url = `${SPORTEASY_V2_1_BASE_URL}/teams/${SPORTEASY_TEAM_ID}/events/${eventId}`;

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

			const data = (await response.json()) as SportEasyEventAttendeesResponse;
			return data;
		} catch (error) {
			console.error("Error fetching SportEasy event attendees:", error);
			throw error;
		}
	}
}

export const sportEasyService = SportEasyService.getInstance();
