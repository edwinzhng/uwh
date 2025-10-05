import { getDefaultStore } from "jotai";
import { apiBaseUrlAtom, errorAtom, isLoadingAtom } from "./atoms";

const store = getDefaultStore();

// Player types
export type Position = 'FORWARD' | 'WING' | 'CENTER' | 'FULL_BACK';

export interface Player {
	id: number;
	fullName: string;
	email: string | null;
	parentEmail: string | null;
	positions: Position[];
	rating: number;
	youth: boolean;
	sporteasyId: number | null;
	createdAt: string;
}

export interface NewPlayer {
	fullName: string;
	email: string | null;
	parentEmail?: string | null;
	positions: Position[];
	rating?: number;
	youth?: boolean;
}

// Practice types
export interface PracticeCoachDetails {
	id: number;
	coachId: number;
	coachName: string;
	durationMinutes: number;
}

export interface Practice {
	id: number;
	date: string;
	notes: string | null;
	sporteasyId: number | null;
	createdAt: string;
	updatedAt: string;
	practiceCoaches: PracticeCoachDetails[];
}

// Coach types
export interface Coach {
	id: number;
	name: string;
	isActive: boolean;
	createdAt: string;
}

export interface NewCoach {
	name: string;
	isActive?: boolean;
}

// Practice Coach types
export interface PracticeCoach {
	id: number;
	practiceId: number;
	coachId: number;
	durationMinutes: number;
	createdAt: string;
}

export interface SportEasySyncResult {
	total: number;
	imported: number;
	updated: number;
	skipped: number;
	errors?: string[];
}

// Coach statistics types
export interface CoachStatistics {
	coachId: number;
	coachName: string;
	totalHours: number;
	totalMinutes: number;
	practiceCount: number;
}

// SportEasy API types
export interface SportEasyEventAttendee {
	attendance_status: "present" | "absent" | "maybe";
	results: Array<{
		profile: {
			id: number;
		};
	}>;
}

export interface SportEasyEventAttendeesResponse {
	id: number;
	attendees: SportEasyEventAttendee[];
}

export class ApiClient {
	private baseUrl: string;

	constructor() {
		this.baseUrl = store.get(apiBaseUrlAtom);
	}

	private async request<T>(
		endpoint: string,
		options: RequestInit = {},
	): Promise<T> {
		const url = `${this.baseUrl}${endpoint}`;
		console.log(`🌐 API Request: ${url}`);

		store.set(isLoadingAtom, true);
		store.set(errorAtom, null);

		try {
			const response = await fetch(url, {
				headers: {
					"Content-Type": "application/json",
					...options.headers,
				},
				...options,
			});

			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}

			const data = await response.json();
			console.log(`✅ API Response:`, data);
			return data;
		} catch (error) {
			console.error(`❌ API Error:`, error);
			const errorMessage =
				error instanceof Error ? error.message : "An error occurred";
			store.set(errorAtom, errorMessage);
			throw error;
		} finally {
			store.set(isLoadingAtom, false);
		}
	}

	async get<T>(endpoint: string): Promise<T> {
		return this.request<T>(endpoint, { method: "GET" });
	}

	async post<T>(endpoint: string, data: unknown): Promise<T> {
		return this.request<T>(endpoint, {
			method: "POST",
			body: JSON.stringify(data),
		});
	}

	async put<T>(endpoint: string, data: unknown): Promise<T> {
		return this.request<T>(endpoint, {
			method: "PUT",
			body: JSON.stringify(data),
		});
	}

	async delete<T>(endpoint: string): Promise<T> {
		return this.request<T>(endpoint, { method: "DELETE" });
	}

	// Player-specific methods
	async getPlayers(): Promise<Player[]> {
		return this.get<Player[]>("/api/players");
	}

	async getPlayer(id: number): Promise<Player> {
		return this.get<Player>(`/api/players/${id}`);
	}

	async createPlayer(player: NewPlayer): Promise<Player> {
		return this.post<Player>("/api/players", player);
	}

	async updatePlayer(id: number, player: Partial<NewPlayer>): Promise<Player> {
		return this.put<Player>(`/api/players/${id}`, player);
	}

	async deletePlayer(id: number): Promise<{ message: string }> {
		return this.delete<{ message: string }>(`/api/players/${id}`);
	}

	async getPlayersByPosition(position: string): Promise<Player[]> {
		return this.get<Player[]>(`/api/players/position/${position}`);
	}

	// Practice-specific methods
	async getPractices(): Promise<Practice[]> {
		return this.get<Practice[]>("/api/practices");
	}

	async getPastPractices(): Promise<Practice[]> {
		return this.get<Practice[]>("/api/practices/past");
	}

	async createPractice(practice: { date: string; notes?: string }): Promise<Practice> {
		return this.post<Practice>("/api/practices", practice);
	}

	async updatePractice(id: number, practice: { date?: string; notes?: string }): Promise<Practice> {
		return this.put<Practice>(`/api/practices/${id}`, practice);
	}

	async deletePractice(id: number): Promise<{ message: string }> {
		return this.delete<{ message: string }>(`/api/practices/${id}`);
	}

	// Coach-specific methods
	async getCoaches(): Promise<Coach[]> {
		return this.get<Coach[]>("/api/coaches");
	}

	async getCoach(id: number): Promise<Coach> {
		return this.get<Coach>(`/api/coaches/${id}`);
	}

	async createCoach(coach: NewCoach): Promise<Coach> {
		return this.post<Coach>("/api/coaches", coach);
	}

	async updateCoach(id: number, coach: Partial<NewCoach>): Promise<Coach> {
		return this.put<Coach>(`/api/coaches/${id}`, coach);
	}

	async deleteCoach(id: number): Promise<{ message: string }> {
		return this.delete<{ message: string }>(`/api/coaches/${id}`);
	}

	async getCoachStatistics(startDate: string, endDate: string): Promise<CoachStatistics[]> {
		return this.get<CoachStatistics[]>(`/api/coaches/statistics/hours?startDate=${startDate}&endDate=${endDate}`);
	}

	// Practice Coach methods
	async getPracticeCoaches(practiceId: number): Promise<PracticeCoach[]> {
		return this.get<PracticeCoach[]>(`/api/practice-coaches/practice/${practiceId}`);
	}

	async setPracticeCoaches(practiceId: number, coachIds: number[], durationMinutes: number = 90): Promise<PracticeCoach[]> {
		return this.post<PracticeCoach[]>(`/api/practice-coaches/practice/${practiceId}`, { coachIds, durationMinutes });
	}

	// SportEasy sync methods
	async syncSportEasyPlayers(): Promise<SportEasySyncResult> {
		return this.post<SportEasySyncResult>("/api/sporteasy/import", {});
	}

	async syncSportEasyEvents(): Promise<SportEasySyncResult> {
		return this.post<SportEasySyncResult>("/api/sporteasy/import-events", {});
	}

	async getSportEasyEventAttendees(practiceId: number): Promise<SportEasyEventAttendeesResponse> {
		return this.get<SportEasyEventAttendeesResponse>(`/api/sporteasy/events/${practiceId}/attendees`);
	}
}

export const apiClient = new ApiClient();
