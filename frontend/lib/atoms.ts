import { atom } from "jotai";
import { atomWithStorage } from "jotai/utils";

import { API_BASE_URL } from "@/lib/config";

// API base URL
export const apiBaseUrlAtom = atom(API_BASE_URL);

// Loading states
export const isLoadingAtom = atom(false);
export const errorAtom = atom<string | null>(null);

// Active tab/page state
export const activeTabAtom = atomWithStorage("uwh-active-tab", "practices");

// Selected coach for detail view
export const selectedCoachIdAtom = atom<number | null>(null);
