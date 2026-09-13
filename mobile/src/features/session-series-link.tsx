import { type ReactElement, useState } from "react";
import { useApp } from "../demo/app-state";
import {
	Button,
	Dialog,
	EmptyState,
	LoadingContent,
	Stack,
} from "../design-system";
import { SessionSeriesManager } from "./session-series-manager";
import {
	type SeriesControls,
	useLiveSeries,
	usePreviewSeries,
} from "./use-session-series";

const LiveManager = ({ seriesId }: { seriesId: string }): ReactElement => {
	const controls = useLiveSeries(seriesId);
	return controls.loading ? (
		<LoadingContent />
	) : (
		<SessionSeriesManager seriesId={seriesId} controls={controls} />
	);
};
const PreviewManager = ({ seriesId }: { seriesId: string }): ReactElement => (
	<SessionSeriesManager seriesId={seriesId} controls={usePreviewSeries()} />
);
export const SessionSeriesLink = ({
	seriesId,
	label = "View session series",
}: {
	seriesId: string;
	label?: string;
}): ReactElement => {
	const { source } = useApp();
	const [open, setOpen] = useState(false);
	return (
		<>
			<Button
				label={label}
				variant="secondary"
				onPress={(): void => setOpen(true)}
			/>
			<Dialog title="Session series" isOpen={open} onOpenChange={setOpen}>
				{open ? (
					source === "convex" ? (
						<LiveManager seriesId={seriesId} />
					) : (
						<PreviewManager seriesId={seriesId} />
					)
				) : undefined}
			</Dialog>
		</>
	);
};
const Commitments = ({
	controls,
	personId,
}: {
	controls: SeriesControls;
	personId?: string;
}): ReactElement => {
	const { account } = useApp();
	const series = controls.series.filter((entry) =>
		entry.enrollments.some(
			(enrollment) => enrollment.personId === (personId ?? account.personId),
		),
	);
	return (
		<Stack>
			{controls.loading ? (
				<LoadingContent />
			) : series.length ? (
				series.map((entry) => (
					<SessionSeriesLink
						key={entry.id}
						seriesId={entry.id}
						label={entry.title}
					/>
				))
			) : (
				<EmptyState
					title="No session commitments yet"
					description="Open a recurring session from Schedule to join its series."
				/>
			)}
		</Stack>
	);
};
const LiveCommitments = ({ personId }: { personId?: string }): ReactElement => (
	<Commitments controls={useLiveSeries()} personId={personId} />
);
const PreviewCommitments = ({
	personId,
}: {
	personId?: string;
}): ReactElement => (
	<Commitments controls={usePreviewSeries()} personId={personId} />
);
export const AccountCommitments = ({
	personId,
}: {
	personId?: string;
}): ReactElement =>
	useApp().source === "convex" ? (
		<LiveCommitments personId={personId} />
	) : (
		<PreviewCommitments personId={personId} />
	);
