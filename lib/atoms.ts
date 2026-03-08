import { atom } from "jotai";
import type { Id } from "@/convex/_generated/dataModel";

// Selected coach for detail view
export const selectedCoachIdAtom = atom<Id<"coaches"> | null>(null);
