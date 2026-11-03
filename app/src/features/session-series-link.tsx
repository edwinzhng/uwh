import { type ReactElement, useState } from "react";
import { useApp } from "../demo/app-state";
import { Button, Dialog, LoadingContent } from "../design-system";
import { SessionSeriesManager } from "./session-series-manager";
import { useFormTask } from "./use-form-task";
import { useLiveSeries, usePreviewSeries } from "./use-session-series";

type ManagerProps = {
	seriesId: string;
	task: ReturnType<typeof useFormTask>;
};
const LiveManager = ({ seriesId, task }: ManagerProps): ReactElement => {
	const controls = useLiveSeries(seriesId);
	return controls.loading ? (
		<LoadingContent />
	) : (
		<SessionSeriesManager seriesId={seriesId} controls={controls} task={task} />
	);
};
const PreviewManager = ({ seriesId, task }: ManagerProps): ReactElement => (
	<SessionSeriesManager
		seriesId={seriesId}
		controls={usePreviewSeries()}
		task={task}
	/>
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
	const task = useFormTask();
	return (
		<>
			<Button
				label={label}
				variant="secondary"
				onPress={(): void => {
					task.clear();
					setOpen(true);
				}}
			/>
			<Dialog
				title="Session series"
				intent="form"
				isOpen={open}
				isDismissDisabled={task.busy}
				onOpenChange={(value): void => {
					if (!task.busy) setOpen(value);
				}}
			>
				{open ? (
					source === "convex" ? (
						<LiveManager seriesId={seriesId} task={task} />
					) : (
						<PreviewManager seriesId={seriesId} task={task} />
					)
				) : undefined}
			</Dialog>
		</>
	);
};
