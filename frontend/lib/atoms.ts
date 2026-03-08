import type { Id } from "@backend/convex/_generated/dataModel";
import { atom } from "jotai";

// Selected coach for detail view
export const selectedCoachIdAtom = atom<Id<"coaches"> | null>(null);
