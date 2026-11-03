import type { Member } from "./app-types";
import { contentFingerprint } from "./content-fingerprint";

export type MemberMergeConflict = {
	category: string;
	record: string;
	reason: string;
	resolution: string;
};
export type MemberMergeCount = { label: string; count: number };
export type MemberMergePreview = {
	source: { id: string; name: string };
	target: { id: string; name: string };
	counts: MemberMergeCount[];
	conflicts: MemberMergeConflict[];
	filledFields: string[];
	token: string;
};
export type MemberMergePair = { source: Member; target: Member };
export const memberMergeLimits = { rows: 1000, changes: 3000 } as const;
export const memberMergeFingerprint = (parts: readonly string[]): string =>
	contentFingerprint(JSON.stringify(parts));
export const replaceMergedPerson = (
	ids: string[],
	sourceId: string,
	targetId: string,
): string[] => [...new Set(ids.map((id) => (id === sourceId ? targetId : id)))];
