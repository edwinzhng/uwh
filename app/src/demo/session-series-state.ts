import { atom } from "jotai";
import type { SessionSeries } from "../domain/session-series";
export const previewSessionSeries = atom<SessionSeries[]>([]);
