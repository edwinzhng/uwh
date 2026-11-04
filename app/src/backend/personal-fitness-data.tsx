import { usePaginatedQuery } from "convex/react";
import { useAtomValue } from "jotai";
import { type ReactElement, type ReactNode, useEffect } from "react";
import { api } from "../../convex/_generated/api";
import { useApp } from "../demo/app-state";
import { previewFitnessAtom } from "../demo/fitness-state";
import type { Member } from "../domain/app-types";
import {
	type PersonalFitnessRow,
	personalFitnessRows,
} from "../domain/personal-fitness";

type Result = {
	rows: PersonalFitnessRow[];
	loading: boolean;
	loadingMore: boolean;
	more: boolean;
	loadMore: () => void;
};
type Props = {
	member: Member;
	seasonId?: string;
	allTests?: boolean;
	children: (result: Result) => ReactNode;
};
const LivePersonalFitness = ({
	member,
	seasonId,
	allTests = false,
	children,
}: Props): ReactElement => {
	const result = usePaginatedQuery(
		api.fitness.personal,
		{ personId: member.id, seasonId },
		{ initialNumItems: 8 },
	);
	useEffect((): void => {
		if (allTests && result.status === "CanLoadMore") result.loadMore(8);
	}, [allTests, result.status, result.loadMore]);
	return (
		<>
			{children({
				rows: result.results,
				loading: result.status === "LoadingFirstPage",
				more: result.status === "CanLoadMore",
				loadingMore: result.status === "LoadingMore",
				loadMore: (): void => result.loadMore(8),
			})}
		</>
	);
};
const PreviewPersonalFitness = ({
	member,
	seasonId,
	children,
}: Props): ReactElement => {
	const { account } = useApp();
	const state = useAtomValue(previewFitnessAtom);
	return (
		<>
			{children({
				rows: personalFitnessRows(state, account, member, seasonId),
				loading: false,
				loadingMore: false,
				more: false,
				loadMore: (): void => undefined,
			})}
		</>
	);
};
export const PersonalFitnessData = ({
	member,
	seasonId,
	allTests,
	children,
}: Props): ReactElement =>
	useApp().source === "convex" ? (
		<LivePersonalFitness
			member={member}
			seasonId={seasonId}
			allTests={allTests}
		>
			{children}
		</LivePersonalFitness>
	) : (
		<PreviewPersonalFitness member={member} seasonId={seasonId}>
			{children}
		</PreviewPersonalFitness>
	);
