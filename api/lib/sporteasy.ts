import "dotenv/config";

// SportEasy API configuration
export const SPORTEASY_V2_3_BASE_URL = "https://api.sporteasy.net/v2.3";
export const SPORTEASY_V2_1_BASE_URL = "https://api.sporteasy.net/v2.1";
export const SPORTEASY_TEAM_ID = "2307567";
export const SPORTEASY_SEASON_ID = "2195139";

export const SPORTEASY_COOKIE = process.env.SPORTEASY_COOKIE;

if (!SPORTEASY_COOKIE) {
	console.warn("Warning: SPORTEASY_COOKIE environment variable is not set");
}

// SportEasy API types
export interface SportEasyParent {
	id: number;
	first_name: string;
	last_name: string;
	email: string;
}

export interface SportEasyProfile {
	id: number;
	last_name: string;
	first_name: string;
	email: string | null;
	parents?: SportEasyParent[];
}

export type SportEasyProfilesResponse = SportEasyProfile[];

export interface SportEasyEvent {
	id: number;
	start_at: string;
	name: string;
}

export interface SportEasyEventsResponse {
	results: SportEasyEvent[];
}
