import { atom } from "jotai";
import { atomWithStorage } from "jotai/utils";

// API base URL
export const apiBaseUrlAtom = atom(
	process.env.NODE_ENV === "production"
		? "https://uwh-api.up.railway.app"
		: "http://localhost:3101",
);

// Loading states
export const isLoadingAtom = atom(false);
export const errorAtom = atom<string | null>(null);

// Active tab/page state
export const activeTabAtom = atomWithStorage("uwh-active-tab", "practices");

// Selected coach for detail view
export const selectedCoachIdAtom = atom<number | null>(null);
