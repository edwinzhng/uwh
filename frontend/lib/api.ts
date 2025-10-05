import { getDefaultStore } from "jotai";
import { apiBaseUrlAtom, errorAtom, isLoadingAtom } from "./atoms";

const store = getDefaultStore();

// Player types
export type Position = 'FORWARD' | 'WING' | 'CENTER' | 'FULL_BACK';

export interface Player {
	id: number;
	fullName: string;
	email: string;
	positions: Position[];
	rating: number;
	youth: boolean;
	createdAt: string;
}

export interface NewPlayer {
	fullName: string;
	email: string;
	positions: Position[];
	rating?: number;
	youth?: boolean;
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
}

export const apiClient = new ApiClient();
