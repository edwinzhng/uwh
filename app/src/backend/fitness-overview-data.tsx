import { usePaginatedQuery } from "convex/react";
import { useAtomValue } from "jotai";
import { type ReactElement, type ReactNode, useState } from "react";
import { api } from "../../convex/_generated/api";
import { useApp } from "../demo/app-state";
import { previewFitnessAtom } from "../demo/fitness-state";
import {
	type FitnessOverviewRow,
	previewFitnessOverview,
} from "../domain/fitness-overview";

type Overview = {
	rows: FitnessOverviewRow[];
	loading: boolean;
	more: boolean;
	loadingMore: boolean;
	loadMore: () => void;
};
type Props = {
	seasonId: string;
	personId?: string;
	children: (overview: Overview) => ReactNode;
};
const LiveOverview = ({
	seasonId,
	personId,
	children,
}: Props): ReactElement => {
	const result = usePaginatedQuery(
		api.fitness_overview.read,
		{ seasonId, personId },
		{ initialNumItems: 10 },
	);
	return (
		<>
			{children({
				rows: result.results,
				loading: result.status === "LoadingFirstPage",
				more: result.status === "CanLoadMore",
				loadingMore: result.status === "LoadingMore",
				loadMore: (): void => result.loadMore(10),
			})}
		</>
	);
};
const PreviewOverview = ({
	seasonId,
	personId,
	children,
}: Props): ReactElement => {
	const { data } = useApp();
	const state = useAtomValue(previewFitnessAtom);
	const [limit, setLimit] = useState(10);
	const rows = previewFitnessOverview(state, data.members, seasonId, personId);
	return (
		<>
			{children({
				rows: rows.slice(0, limit),
				loading: false,
				more: rows.length > limit,
				loadingMore: false,
				loadMore: (): void => setLimit((current) => current + 10),
			})}
		</>
	);
};
export const FitnessOverviewData = ({
	seasonId,
	personId,
	children,
}: Props): ReactElement =>
	useApp().source === "convex" ? (
		<LiveOverview seasonId={seasonId} personId={personId}>
			{children}
		</LiveOverview>
	) : (
		<PreviewOverview seasonId={seasonId} personId={personId}>
			{children}
		</PreviewOverview>
	);
