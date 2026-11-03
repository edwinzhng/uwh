import { useQuery } from "convex/react";
import { useAtomValue } from "jotai";
import type { ReactElement, ReactNode } from "react";
import { api } from "../../convex/_generated/api";
import { useApp } from "../demo/app-state";
import { previewSeasonLedgerAtom } from "../demo/season-ledger-data";
import { registeredMemberCount } from "../domain/club-summary";

type Props = {
	seasonId: string;
	children: (registered: number | undefined) => ReactNode;
};
const LiveSummary = ({ seasonId, children }: Props): ReactElement => {
	const summary = useQuery(api.club.summary, { seasonId });
	return <>{children(summary?.registered)}</>;
};
const PreviewSummary = ({ seasonId, children }: Props): ReactElement => {
	const { data } = useApp();
	const ledger = useAtomValue(previewSeasonLedgerAtom);
	const records = Object.values(ledger.records).filter(
		(record) => record.seasonId === seasonId,
	);
	return (
		<>{children(registeredMemberCount(data.members, seasonId, records))}</>
	);
};
export const ClubSummaryData = ({ seasonId, children }: Props): ReactElement =>
	useApp().source === "convex" ? (
		<LiveSummary seasonId={seasonId}>{children}</LiveSummary>
	) : (
		<PreviewSummary seasonId={seasonId}>{children}</PreviewSummary>
	);
