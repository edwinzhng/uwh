import type {
	MemberMergeConflict,
	MemberMergeCount,
	MemberMergePair,
} from "../src/domain/member-merge";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";

export type MemberMergeContext = MemberMergePair & {
	clubId: Id<"clubs">;
	fillEmptyProfile: boolean;
};
export type MemberMergeModule = {
	counts: MemberMergeCount[];
	conflicts: MemberMergeConflict[];
	fingerprint: string;
	preserved?: { category: string; records: string }[];
	apply: (ctx: MutationCtx) => Promise<void>;
};
