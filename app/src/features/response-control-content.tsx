import { atom, useAtomValue, useStore } from "jotai";
import type { ReactElement } from "react";
import { useActivePerson, useApp } from "../demo/app-state";
import { Select, Stack, Text } from "../design-system";
import { canRegister, eventResponse } from "../domain/app-rules";
import type { ClubEvent } from "../domain/app-types";
import type { Response } from "../domain/club";
import { signupState } from "../domain/event-time";
import { partResponse } from "../domain/schedule-agenda";
import { PartResponseControls } from "./part-response-controls";
import { QuickResponseButtons } from "./quick-response-buttons";
import { responseOptions } from "./response-options";
import { SectionResponsePicker } from "./section-response-picker";
import { SeriesResponseControl } from "./series-response-control";
import { useEventNow } from "./use-event-now";
import { useFormTask } from "./use-form-task";

const pendingResponsesAtom = atom<ReadonlySet<string>>(new Set<string>());

export const ResponseControlContent = ({
	event,
	personId,
	partId,
	hideLabel = false,
	firstDivider = true,
	committed = false,
	loading = false,
	quick = false,
}: {
	event: ClubEvent;
	personId?: string;
	partId?: string;
	hideLabel?: boolean;
	firstDivider?: boolean;
	committed?: boolean;
	loading?: boolean;
	quick?: boolean;
}): ReactElement => {
	const { data, dispatch, account, workspaceId } = useApp();
	const store = useStore();
	const pendingResponses = useAtomValue(pendingResponsesAtom);
	const activePerson = useActivePerson();
	const person =
		data.members.find((entry) => entry.id === personId) ?? activePerson;
	const task = useFormTask();
	const requestKey = JSON.stringify([
		workspaceId,
		account.id,
		event.id,
		person.id,
	]);
	const busy = task.busy || pendingResponses.has(requestKey);
	const part =
		partId === undefined
			? undefined
			: event.parts?.find((entry) => entry.id === partId);
	const current = eventResponse(data, event.id, person.id);
	const response = current.response;
	const visibleResponse = part ? partResponse(current, part.id) : response;
	const signup = signupState(event, useEventNow(event));
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
		if (locked || store.get(pendingResponsesAtom).has(requestKey)) return;
		store.set(
			pendingResponsesAtom,
			(current) => new Set([...current, requestKey]),
		);
		try {
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
		} finally {
			store.set(
				pendingResponsesAtom,
				(current) => new Set([...current].filter((key) => key !== requestKey)),
			);
		}
	};
	if (person.archived)
		return (
			<Text variant="small" tone="secondary">
				This profile is archived. Ask a club administrator to restore it before
				signing up.
			</Text>
		);
	if (partId !== undefined && (!part || event.kind === "tournament"))
		return (
			<Text variant="caption" tone="secondary">
				Section unavailable
			</Text>
		);
	if (
		(quick || partId !== undefined) &&
		event.parts?.length &&
		!locked &&
		event.kind !== "tournament"
	)
		return (
			<Stack gap="xxs">
				<PartResponseControls
					event={event}
					current={current}
					name={person.name}
					partId={partId}
					hideLabel={hideLabel}
					firstDivider={firstDivider}
					disabled={busy}
					isPending={(): boolean =>
						store.get(pendingResponsesAtom).has(requestKey)
					}
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
	if (current.seriesExpected && partId === undefined && (!quick || !locked))
		return (
			<SeriesResponseControl
				quick={quick}
				hideLabel={hideLabel}
				event={event}
				personId={person.id}
				unavailable={current.response === "unavailable"}
			/>
		);
	if ((quick || partId !== undefined) && event.kind !== "tournament")
		if (locked)
			return (
				<Text variant="caption" tone="secondary">
					{loading
						? "Loading"
						: event.cancelled
							? "Cancelled"
							: signup === "scheduled"
								? "Not open yet"
								: !canRegister(person, event)
									? "Not eligible for this session"
									: `${visibleResponse === "going" ? "Attending" : visibleResponse === "unavailable" ? "Not attending" : visibleResponse === "waiting" ? "Waitlisted" : "No response"} · Responses closed`}
				</Text>
			);
	if ((quick || partId !== undefined) && event.kind !== "tournament")
		return (
			<Stack gap="xxs">
				<QuickResponseButtons
					name={person.name}
					response={response}
					full={full}
					disabled={locked || busy}
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
				isDisabled={locked || busy}
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
					disabled={locked || busy}
					onChange={(ids): void => {
						void respond("going", ids);
					}}
				/>
			) : undefined}
			{task.error ? <Text tone="danger">{task.error}</Text> : undefined}
		</Stack>
	);
};
