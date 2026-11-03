import { atom } from "jotai";
import type { SessionCheckIn } from "../domain/session-checkins";

export const previewSessionCheckinsAtom = atom<SessionCheckIn[]>([]);
