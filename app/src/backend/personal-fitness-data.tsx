import { usePaginatedQuery } from "convex/react";
import { useAtomValue } from "jotai";
import type { ReactElement, ReactNode } from "react";
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
	seasonId: string;
	children: (result: Result) => ReactNode;
};
const LivePersonalFitness = ({
	member,
	seasonId,
	children,
}: Props): ReactElement => {
	const result = usePaginatedQuery(
		api.fitness.personal,
		{ personId: member.id, seasonId },
		{ initialNumItems: 8 },
	);
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
	children,
}: Props): ReactElement =>
	useApp().source === "convex" ? (
		<LivePersonalFitness member={member} seasonId={seasonId}>
			{children}
		</LivePersonalFitness>
	) : (
		<PreviewPersonalFitness member={member} seasonId={seasonId}>
			{children}
		</PreviewPersonalFitness>
	);
