import { type ReactElement, useState } from "react";
import {
	type PerformanceEditorService,
	type SessionPerformanceService,
	useLivePerformanceEditor,
	usePreviewPerformanceEditor,
} from "../backend/use-session-performance";
import { useApp } from "../demo/app-state";
import {
	Button,
	Dialog,
	EmptyState,
	InfiniteScroll,
	LoadingContent,
	Select,
	Stack,
} from "../design-system";
import { formatDate } from "../domain/app-rules";
import type { SessionPerformanceKind } from "../domain/session-performance";
import { SessionPerformanceFields } from "./session-performance-fields";
import { useFormTask } from "./use-form-task";
import { useSessionPerformanceForm } from "./use-session-performance-form";

type EditorProps = {
	personId: string;
	kind: SessionPerformanceKind;
	eventId: string;
	setEventId: (eventId: string) => void;
	save: SessionPerformanceService["save"];
	onClose: () => void;
};
const EditorDialog = ({
	personId,
	kind,
	eventId,
	setEventId,
	save,
	onClose,
	service,
}: EditorProps & { service: PerformanceEditorService }): ReactElement => {
	const task = useFormTask();
	const { data } = useApp();
	const person = data.members.find((entry) => entry.id === personId);
	const form = useSessionPerformanceForm({
		personId,
		eventId,
		kind,
		current: service.current,
		task,
		save,
		onClose,
	});
	const sessions =
		service.current &&
		!service.sessions.some((entry) => entry.id === service.current?.eventId)
			? [
					{
						id: service.current.eventId,
						title: service.current.eventTitle,
						date: service.current.eventDate,
						sessionNumber: service.current.sessionNumber,
					},
					...service.sessions,
				]
			: service.sessions;
	return (
		<Dialog
			intent="form"
			isDismissDisabled={task.busy}
			footer={
				!service.loading &&
				!service.loadingCurrent &&
				eventId &&
				!form.readOnly ? (
					<Button
						label={form.submitLabel}
						isLoading={task.busy}
						onPress={form.submit}
					/>
				) : (
					false
				)
			}
			title={`${kind === "coach" ? "Coach rating" : "Session reflection"}${person ? ` · ${person.name}` : ""}`}
			isOpen
			onOpenChange={(open): void => {
				if (!open && !task.busy) onClose();
			}}
		>
			<Stack>
				{service.loading ? (
					<LoadingContent />
				) : sessions.length ? (
					<Select
						listFooter={
							<InfiniteScroll
								loadMore={service.canLoadMore ? service.loadMore : undefined}
								loading={service.loadingMore}
								revision={service.sessions.length}
								disabled={task.busy}
							/>
						}
						label="Session"
						value={eventId || undefined}
						onValueChange={(id): void => {
							task.clear();
							setEventId(id ?? "");
						}}
						isDisabled={task.busy}
						placeholder="Choose a session"
						options={sessions.map((entry) => ({
							value: entry.id,
							label: [
								entry.sessionNumber === undefined
									? undefined
									: `Session ${entry.sessionNumber}`,
								formatDate(entry.date),
								entry.title,
							]
								.filter(Boolean)
								.join(" · "),
						}))}
					/>
				) : (
					<EmptyState
						title="No eligible sessions"
						description="Choose a scheduled practice for this player once one is available."
					/>
				)}

				{service.loadingCurrent ? (
					<LoadingContent />
				) : eventId ? (
					<SessionPerformanceFields kind={kind} task={task} form={form} />
				) : undefined}
			</Stack>
		</Dialog>
	);
};
const LiveEditor = (props: EditorProps): ReactElement => (
	<EditorDialog
		personId={props.personId}
		kind={props.kind}
		eventId={props.eventId}
		setEventId={props.setEventId}
		save={props.save}
		onClose={props.onClose}
		service={useLivePerformanceEditor(
			props.personId,
			props.kind,
			props.eventId,
		)}
	/>
);
const PreviewEditor = (props: EditorProps): ReactElement => (
	<EditorDialog
		personId={props.personId}
		kind={props.kind}
		eventId={props.eventId}
		setEventId={props.setEventId}
		save={props.save}
		onClose={props.onClose}
		service={usePreviewPerformanceEditor(
			props.personId,
			props.kind,
			props.eventId,
		)}
	/>
);
export const SessionPerformanceEditor = ({
	personId,
	kind,
	initialEventId,
	save,
	onClose,
}: Omit<EditorProps, "eventId" | "setEventId"> & {
	initialEventId?: string;
}): ReactElement => {
	const [eventId, setEventId] = useState(initialEventId ?? "");
	return useApp().source === "convex" ? (
		<LiveEditor
			personId={personId}
			kind={kind}
			eventId={eventId}
			setEventId={setEventId}
			save={save}
			onClose={onClose}
		/>
	) : (
		<PreviewEditor
			personId={personId}
			kind={kind}
			eventId={eventId}
			setEventId={setEventId}
			save={save}
			onClose={onClose}
		/>
	);
};
