import type {
	SessionPerformanceEntry,
	SessionPerformanceKind,
} from "./session-performance";

export type SessionPerformanceDraft = {
	key: string;
	rating?: string;
	comments: string;
	revision: number;
};

export const sessionPerformanceDraft = (
	stored: SessionPerformanceDraft | undefined,
	personId: string,
	eventId: string,
	kind: SessionPerformanceKind,
	current?: SessionPerformanceEntry,
): SessionPerformanceDraft => {
	const key = `${personId}:${eventId}:${kind}`;
	return stored?.key === key
		? stored
		: {
				key,
				rating: current?.rating.toString(),
				comments: current?.comments ?? "",
				revision: current?.revision ?? 0,
			};
};
