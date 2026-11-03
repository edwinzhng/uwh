import { useMutation, useQuery } from "convex/react";
import { useAtomValue, useSetAtom } from "jotai";
import { useMemo } from "react";
import { api } from "../../convex/_generated/api";
import {
	type MemberMergeCommand,
	type MemberMergeInput,
	mergePreviewMemberAtom,
	previewMemberMergePlanAtom,
} from "../demo/member-merge-state";
import type { MemberMergePreview } from "../domain/member-merge";

export type MemberMergeService = {
	preview?: MemberMergePreview;
	loading: boolean;
	merge: (command: MemberMergeCommand) => Promise<string>;
};
export const useLiveMemberMerge = (
	input: MemberMergeInput,
): MemberMergeService => {
	const preview = useQuery(api.member_merges.preview, input);
	const merge = useMutation(api.member_merges.merge);
	return {
		preview,
		loading: preview === undefined,
		merge: async (command): Promise<string> => merge(command),
	};
};
export const usePreviewMemberMerge = (
	input: MemberMergeInput,
): MemberMergeService => {
	const state = useMemo(
		() =>
			previewMemberMergePlanAtom({
				sourceId: input.sourceId,
				targetId: input.targetId,
				fillEmptyProfile: input.fillEmptyProfile,
			}),
		[input.sourceId, input.targetId, input.fillEmptyProfile],
	);
	const preview = useAtomValue(state);
	const merge = useSetAtom(mergePreviewMemberAtom);
	return {
		preview,
		loading: false,
		merge: async (command): Promise<string> => merge(command),
	};
};
