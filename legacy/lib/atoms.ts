import { atom } from "jotai";
import type { Id } from "@/convex/_generated/dataModel";

export const selectedCoachIdAtom = atom<Id<"coaches"> | null>(null);
