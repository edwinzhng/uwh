import { useMutation, usePaginatedQuery } from "convex/react";
import { useAtomValue, useSetAtom } from "jotai";
import { api } from "../../convex/_generated/api";
import { previewDataAtom, useApp } from "../demo/app-state";
import {
	previewGoalReflectionCommandAtom,
	previewGoalReflectionsAtom,
} from "../demo/goal-reflections-state";
import { canReadProgress } from "../domain/app-rules";
import type {
	GoalReflection,
	GoalReflectionDraft,
} from "../domain/goal-reflections";

export type GoalReflectionService = {
	reflections: GoalReflection[];
	loading: boolean;
	canLoadMore: boolean;
	loadingMore: boolean;
	loadMore: () => void;
	record: (draft: GoalReflectionDraft) => Promise<void>;
};

export const useGoalReflections = (personId: string): GoalReflectionService => {
	const page = usePaginatedQuery(
		api.goal_reflections.list,
		{ personId },
		{ initialNumItems: 3 },
	);
	const record = useMutation(api.goal_reflections.record);
	return {
		reflections: page.results,
		loading: page.status === "LoadingFirstPage",
		canLoadMore: page.status === "CanLoadMore",
		loadingMore: page.status === "LoadingMore",
		loadMore: (): void => page.loadMore(10),
		record: async (draft): Promise<void> => {
			await record(draft);
		},
	};
};

export const usePreviewGoalReflections = (
	personId: string,
): GoalReflectionService => {
	const history = useAtomValue(previewGoalReflectionsAtom);
	const data = useAtomValue(previewDataAtom);
	const { account } = useApp();
	const member = data.members.find((entry) => entry.id === personId);
	const command = useSetAtom(previewGoalReflectionCommandAtom);
	return {
		reflections:
			member && canReadProgress(account, member)
				? history
						.filter((entry) => entry.personId === personId)
						.slice()
						.sort((left, right) => right.createdAt - left.createdAt)
				: [],
		loading: false,
		canLoadMore: false,
		loadingMore: false,
		loadMore: (): void => {},
		record: async (draft): Promise<void> => command(draft),
	};
};
