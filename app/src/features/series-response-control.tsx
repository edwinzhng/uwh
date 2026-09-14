import { useMutation } from "convex/react";
import { useSetAtom } from "jotai";
import { type ReactElement, useState } from "react";
import { api } from "../../convex/_generated/api";
import { previewDataAtom, useApp } from "../demo/app-state";
import { Button, Dialog, Field, Select, Stack, Text } from "../design-system";
import type { ClubEvent } from "../domain/app-types";
import { clubTimestamp } from "../domain/event-time";
import { useFormTask } from "./use-form-task";

type Props = {
	event: ClubEvent;
	personId: string;
	unavailable: boolean;
	hideLabel?: boolean;
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
	save,
}: Props & { save: (args: AbsenceChange) => Promise<void> }): ReactElement => {
	const { data } = useApp();
	const task = useFormTask();
	const current = data.responses.find(
		(entry) => entry.eventId === event.id && entry.personId === personId,
	);
	const [open, setOpen] = useState(false);
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
	return (
		<Stack gap="xs">
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
				onValueChange={(value): void => {
					if (value === "unavailable") {
						task.clear();
						setReason(current?.absenceReason ?? "");
						setOpen(true);
					} else if (value === "expected")
						void task.run(
							async (): Promise<void> =>
								save({ eventId: event.id, personId, unavailable: false }),
						);
				}}
			/>
			<Dialog
				title="Not going"
				isOpen={open}
				onOpenChange={(value): void => {
					if (!task.busy) setOpen(value);
				}}
				footer={
					<Button
						label="Save response"
						isLoading={task.busy}
						onPress={(): void => {
							void task.submit(
								() =>
									!reason.trim() || reason.trim().length > 500
										? "Add a reason (up to 500 characters)."
										: undefined,
								async (): Promise<void> => {
									await save({
										eventId: event.id,
										personId,
										unavailable: true,
										reason: reason.trim(),
									});
									setOpen(false);
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
		/>
	) : (
		<PreviewControl
			event={props.event}
			personId={props.personId}
			unavailable={props.unavailable}
			hideLabel={props.hideLabel}
		/>
	);
