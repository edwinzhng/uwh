import type { ReactElement } from "react";
import {
	type SessionPerformanceService,
	useLiveSessionPerformance,
	usePreviewSessionPerformance,
} from "../backend/use-session-performance";
import { useApp } from "../demo/app-state";
import { SessionPerformanceEditor } from "./session-performance-editor";

type Props = {
	personId: string;
	eventId?: string;
	kind: "self";
	onClose: () => void;
};
const Task = ({
	personId,
	eventId,
	kind,
	onClose,
	service,
}: Props & { service: SessionPerformanceService }): ReactElement => (
	<SessionPerformanceEditor
		personId={personId}
		kind={kind}
		initialEventId={eventId}
		save={service.save}
		onClose={onClose}
	/>
);
const LiveTask = (props: Props): ReactElement => (
	<Task
		personId={props.personId}
		eventId={props.eventId}
		kind={props.kind}
		onClose={props.onClose}
		service={useLiveSessionPerformance(props.personId, props.kind)}
	/>
);
const PreviewTask = (props: Props): ReactElement => (
	<Task
		personId={props.personId}
		eventId={props.eventId}
		kind={props.kind}
		onClose={props.onClose}
		service={usePreviewSessionPerformance(props.personId, props.kind)}
	/>
);
export const SessionPerformanceTask = (props: Props): ReactElement =>
	useApp().source === "convex" ? (
		<LiveTask
			personId={props.personId}
			eventId={props.eventId}
			kind={props.kind}
			onClose={props.onClose}
		/>
	) : (
		<PreviewTask
			personId={props.personId}
			eventId={props.eventId}
			kind={props.kind}
			onClose={props.onClose}
		/>
	);
