import { getDefaultStore } from "jotai";
import { apiBaseUrlAtom, errorAtom, isLoadingAtom } from "./atoms";

const store = getDefaultStore();

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
}

export const apiClient = new ApiClient();
