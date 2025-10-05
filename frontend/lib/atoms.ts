import { atom } from "jotai";
import { atomWithStorage } from "jotai/utils";

// User state
export const userAtom = atom<{
	id: number;
	name: string;
	email: string;
} | null>(null);

// API base URL
export const apiBaseUrlAtom = atom(
	process.env.NODE_ENV === "production"
		? "https://uwh-api.up.railway.app"
		: "http://localhost:3101",
);

// Loading states
export const isLoadingAtom = atom(false);
export const errorAtom = atom<string | null>(null);

// Dark mode state with localStorage persistence
export const isDarkModeAtom = atomWithStorage("uwh-dark-mode", true);
