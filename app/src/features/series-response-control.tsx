import { useMutation } from "convex/react";
import { useSetAtom } from "jotai";
import { type ReactElement, useState } from "react";
import { api } from "../../convex/_generated/api";
import { previewDataAtom, useApp } from "../demo/app-state";
import { Button, Dialog, Field, Select, Stack, Text } from "../design-system";
import type { ClubEvent } from "../domain/app-types";
import { clubTimestamp } from "../domain/event-time";
import { QuickResponseButtons } from "./quick-response-buttons";
import { useFormTask } from "./use-form-task";

type Props = {
	event: ClubEvent;
	personId: string;
	unavailable: boolean;
	hideLabel?: boolean;
	quick?: boolean;
	dialogOnly?: boolean;
	onClose?: () => void;
};
type AbsenceChange = {
	eventId: string;
	personId: string;
	unavailable: boolean;
	reason?: string;
};
const Control = ({
	event,
	personId,
	unavailable,
	hideLabel,
	quick = false,
	dialogOnly = false,
	onClose,
	save,
}: Props & { save: (args: AbsenceChange) => Promise<void> }): ReactElement => {
	const { data } = useApp();
	const task = useFormTask();
	const current = data.responses.find(
		(entry) => entry.eventId === event.id && entry.personId === personId,
	);
	const [open, setOpen] = useState(dialogOnly);
	const close = (): void => {
		setOpen(false);
		onClose?.();
	};
	const [reason, setReason] = useState(current?.absenceReason ?? "");
	const scheduled =
		event.opensAt !== undefined &&
		event.opensAt > Date.now() &&
		current?.response !== "going" &&
		!unavailable;
	const locked =
		event.cancelled ||
		clubTimestamp(event.date, event.end, event.timeZone ?? data.timeZone) <=
			Date.now();
	const choose = (value?: string): void => {
		if (task.busy || locked || scheduled) return;
		if (value === "unavailable") {
			task.clear();
			setReason(current?.absenceReason ?? "");
			setOpen(true);
		} else if (value === "expected" && unavailable)
			void task.run(
				async (): Promise<void> =>
					save({ eventId: event.id, personId, unavailable: false }),
			);
	};
	return (
		<Stack gap="xs">
			{dialogOnly ? undefined : quick && (scheduled || locked) ? (
				<Text variant="caption" tone="secondary">
					{scheduled
						? "Invited when registration opens"
						: event.cancelled
							? "Cancelled"
							: "Closed"}
				</Text>
			) : quick ? (
				<QuickResponseButtons
					name={
						data.members.find((person) => person.id === personId)?.name ??
						"Player"
					}
					response={unavailable ? "unavailable" : "going"}
					disabled={task.busy || locked || scheduled}
					onRespond={(going): void =>
						choose(going ? "expected" : "unavailable")
					}
				/>
			) : (
				<Select
					compact={hideLabel}
					hideLabel={hideLabel}
					label={`${data.members.find((person) => person.id === personId)?.name ?? "Player"} · Attendance`}
					value={
						scheduled ? "scheduled" : unavailable ? "unavailable" : "expected"
					}
					isDisabled={task.busy || locked || scheduled}
					options={[
						...(scheduled
							? [
									{
										value: "scheduled",
										label: "Invited when registration opens",
										isDisabled: true,
									},
								]
							: []),
						{ value: "expected", label: "Going", tone: "success" },
						{ value: "unavailable", label: "Not going", tone: "danger" },
					]}
					onValueChange={choose}
				/>
			)}
			<Dialog
				intent="form"
				isDismissDisabled={task.busy}
				title="Not going"
				isOpen={open}
				onOpenChange={(value): void => {
					if (!task.busy) {
						if (!value) close();
						else setOpen(value);
					}
				}}
				footer={
					<Button
						label="Save response"
						isLoading={task.busy}
						onPress={(): void => {
							void task.submit(
								() =>
									!reason.trim()
										? "Add a reason"
										: reason.trim().length > 500
											? "Keep the reason to 500 characters"
											: undefined,
								async (): Promise<void> => {
									await save({
										eventId: event.id,
										personId,
										unavailable: true,
										reason: reason.trim(),
									});
									close();
								},
							);
						}}
					/>
				}
			>
				<Stack>
					<Text>Your coach can see this reason.</Text>
					<Field
						label="Reason for not going"
						value={reason}
						onValueChange={setReason}
						multiline
					/>
					{task.error ? <Text tone="danger">{task.error}</Text> : undefined}
				</Stack>
			</Dialog>
			{!open && task.error ? (
				<Text tone="danger">{task.error}</Text>
			) : undefined}
		</Stack>
	);
};
const LiveControl = (props: Props): ReactElement => {
	const save = useMutation(api.session_series.absence);
	return (
		<Control
			event={props.event}
			personId={props.personId}
			unavailable={props.unavailable}
			hideLabel={props.hideLabel}
			quick={props.quick}
			dialogOnly={props.dialogOnly}
			onClose={props.onClose}
			save={async (args): Promise<void> => {
				await save(args);
			}}
		/>
	);
};
const PreviewControl = (props: Props): ReactElement => {
	const setData = useSetAtom(previewDataAtom);
	return (
		<Control
			event={props.event}
			personId={props.personId}
			unavailable={props.unavailable}
			hideLabel={props.hideLabel}
			quick={props.quick}
			dialogOnly={props.dialogOnly}
			onClose={props.onClose}
			save={async (args): Promise<void> => {
				setData((data) => ({
					...data,
					responses: data.responses.map((response) =>
						response.eventId === args.eventId &&
						response.personId === args.personId
							? {
									...response,
									response: args.unavailable ? "unavailable" : "going",
									absenceReason: args.unavailable ? args.reason : undefined,
									partIds: undefined,
									declinedPartIds: undefined,
								}
							: response,
					),
				}));
			}}
		/>
	);
};
export const SeriesResponseControl = (props: Props): ReactElement =>
	useApp().source === "convex" ? (
		<LiveControl
			event={props.event}
			personId={props.personId}
			unavailable={props.unavailable}
			hideLabel={props.hideLabel}
			quick={props.quick}
			dialogOnly={props.dialogOnly}
			onClose={props.onClose}
		/>
	) : (
		<PreviewControl
			event={props.event}
			personId={props.personId}
			unavailable={props.unavailable}
			hideLabel={props.hideLabel}
			quick={props.quick}
			dialogOnly={props.dialogOnly}
			onClose={props.onClose}
		/>
	);
