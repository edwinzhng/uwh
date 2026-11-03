import type { ReactElement } from "react";
import { useActivePerson, useApp } from "../demo/app-state";
import { Select, Stack, Text } from "../design-system";
import { canRegister, eventResponse } from "../domain/app-rules";
import type { ClubEvent } from "../domain/app-types";
import type { Response } from "../domain/club";
import { signupState } from "../domain/event-time";
import { PartResponseControls } from "./part-response-controls";
import { QuickResponseButtons } from "./quick-response-buttons";
import { responseOptions } from "./response-options";
import { SectionResponsePicker } from "./section-response-picker";
import { SeriesResponseControl } from "./series-response-control";
import { useFormTask } from "./use-form-task";

export const ResponseControlContent = ({
	event,
	personId,
	hideLabel = false,
	committed = false,
	loading = false,
	quick = false,
}: {
	event: ClubEvent;
	personId?: string;
	hideLabel?: boolean;
	committed?: boolean;
	loading?: boolean;
	quick?: boolean;
}): ReactElement => {
	const { data, dispatch } = useApp();
	const activePerson = useActivePerson();
	const person =
		data.members.find((entry) => entry.id === personId) ?? activePerson;
	const task = useFormTask();
	const current = eventResponse(data, event.id, person.id);
	const response = current.response;
	const signup = signupState(event, Date.now());
	const locked = Boolean(
		loading ||
			event.cancelled ||
			signup === "scheduled" ||
			signup === "closed" ||
			!canRegister(person, event),
	);
	const full =
		data.responses.filter(
			(entry) =>
				entry.eventId === event.id &&
				(entry.response === "going" || entry.seriesExpected),
		).length >= (event.capacity ?? Infinity);
	const respond = async (
		value: Response,
		partIds?: string[],
		declinedPartIds?: string[],
	): Promise<void> => {
		if (locked) return;
		await task.run(async (): Promise<void> => {
			const saved = await dispatch({
				type: "respond",
				eventId: event.id,
				personId: person.id,
				response: value,
				partIds,
				declinedPartIds,
			});
			if (!saved) throw new Error("Could not save your response. Try again.");
		});
	};
	if (person.archived)
		return (
			<Text variant="small" tone="secondary">
				This profile is archived. Ask a club administrator to restore it before
				signing up.
			</Text>
		);
	if (quick && event.parts?.length && !locked && event.kind !== "tournament")
		return (
			<Stack gap="xxs">
				<PartResponseControls
					event={event}
					current={current}
					name={person.name}
					disabled={task.busy}
					full={full && response !== "going" && !current.seriesExpected}
					onRespond={respond}
				/>
				{task.error ? (
					<Text variant="caption" tone="danger">
						{task.error}
					</Text>
				) : undefined}
			</Stack>
		);
	if (current.seriesExpected)
		return (
			<SeriesResponseControl
				quick={quick}
				hideLabel={hideLabel}
				event={event}
				personId={person.id}
				unavailable={current.response === "unavailable"}
			/>
		);
	if (quick && event.kind !== "tournament")
		if (locked)
			return (
				<Text variant="caption" tone="secondary">
					{loading
						? "Loading"
						: event.cancelled
							? "Cancelled"
							: signup === "scheduled"
								? "Not open yet"
								: "Closed"}
				</Text>
			);
	if (quick && event.kind !== "tournament")
		return (
			<Stack gap="xxs">
				<QuickResponseButtons
					name={person.name}
					response={response}
					full={full}
					disabled={locked || task.busy}
					onRespond={(going): void => {
						if (
							(going && response === "going") ||
							(!going && response === "unavailable")
						)
							return;
						void respond(
							going ? "going" : "unavailable",
							going ? current.partIds : undefined,
						);
					}}
				/>
				{task.error ? (
					<Text variant="caption" tone="danger">
						{task.error}
					</Text>
				) : undefined}
			</Stack>
		);
	return (
		<Stack gap="xs">
			<Select
				compact={hideLabel}
				hideLabel={hideLabel}
				label={`${person.name} · ${event.kind === "tournament" ? "Interest" : "Attendance"}`}
				value={response}
				isDisabled={locked || task.busy}
				options={
					event.kind === "tournament"
						? [
								{
									value: "unanswered",
									label: "Respond",
									tone: "warning",
									isDisabled: true,
								},
								{ value: "going", label: "Interested", tone: "success" },
								{
									value: "unavailable",
									label: "Not interested",
									tone: "danger",
								},
							]
						: responseOptions({ full, response })
				}
				onValueChange={(value): void => {
					if (value === "going" || value === "unavailable") void respond(value);
				}}
			/>
			{response === "going" &&
			!committed &&
			event.kind !== "tournament" &&
			event.parts?.length ? (
				<SectionResponsePicker
					name={person.name}
					parts={event.parts}
					selected={current.partIds}
					disabled={locked || task.busy}
					onChange={(ids): void => {
						void respond("going", ids);
					}}
				/>
			) : undefined}
			{task.error ? <Text tone="danger">{task.error}</Text> : undefined}
		</Stack>
	);
};
