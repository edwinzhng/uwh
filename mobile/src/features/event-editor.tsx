import { useSetAtom } from "jotai";
import { type ReactElement, useState } from "react";
import { newId, useApp } from "../demo/app-state";
import {
	Button,
	DatePicker,
	Dialog,
	Field,
	Grid,
	Row,
	Select,
	Stack,
	Surface,
	Text,
} from "../design-system";
import { validateEvent } from "../domain/app-rules";
import type { ClubEvent, EventDraft } from "../domain/app-types";
import { toggleEventParts } from "../domain/event-part-draft";
import {
	eventDraft,
	recurrenceChoices,
	seriesTargets,
} from "../domain/event-recurrence";
import { clubDate } from "../domain/event-time";
import { practiceEvent } from "../domain/event-types";
import { EventOptions } from "./event-options";
import { EventPartsEditor } from "./event-parts-editor";
import { EventTimeFields } from "./event-time-fields";
import { RecurrencePreview } from "./recurrence-preview";
import { TournamentOptions } from "./tournament-options";
import { useFormTask } from "./use-form-task";
import { previewSessionSeries } from "./use-session-series";

export const EventEditor = ({
	open,
	onClose,
	initialDate,
	event,
}: {
	open: boolean;
	onClose: () => void;
	initialDate?: string;
	event?: ClubEvent;
}): ReactElement => {
	const { data, dispatch, busy, source } = useApp();
	const setPreviewSeries = useSetAtom(previewSessionSeries);
	const [creationId] = useState(newId);
	const initialEventDate = initialDate ?? clubDate(undefined, data.timeZone);
	const [draft, setDraft] = useState<EventDraft>(() =>
		event
			? eventDraft(event)
			: toggleEventParts(
					{
						title: "",
						date: initialEventDate,
						timeZone: data.timeZone,
						start: "19:45",
						end: "21:00",
						venue: data.venues?.at(0) ?? "",
						program: "club",
						kind: "training",
						capacity: undefined,
						repeat: "once",
						occurrences: 4,
						description: "",
						seasonId:
							data.seasons.find(
								(season) =>
									season.start <= initialEventDate &&
									season.end >= initialEventDate,
							)?.id ?? data.seasons.at(-1)?.id,
					},
					true,
				),
	);
	const [editId] = useState(newId);
	const task = useFormTask();
	const [error, setError] = useState<string>();
	const [confirm, setConfirm] = useState(false);
	const [scope, setScope] = useState<"single" | "series" | "following">(
		"single",
	);
	const targets = event ? seriesTargets(data.events, event, scope) : [];
	const anchor = scope === "series" ? (targets.at(0) ?? event) : event;
	const scheduleChanged = Boolean(
		anchor &&
			(draft.date !== (anchor.seriesDate ?? anchor.date) ||
				draft.repeat !== (anchor.repeat ?? "once") ||
				(draft.repeatInterval ?? 1) !== (anchor.repeatInterval ?? 1) ||
				draft.repeatUntil !== anchor.repeatUntil ||
				Boolean(draft.excludedDates?.length) ||
				(draft.occurrences !== undefined &&
					draft.occurrences !== targets.length)),
	);
	const prepared = {
		...draft,
		rebuild: Boolean(
			event &&
				((scope !== "single" && scheduleChanged) ||
					(!event.seriesId && draft.repeat !== "once")),
		),
	};
	const removed = data.responses.filter(
		(response) =>
			targets.some((event) => event.id === response.eventId) &&
			(response.response === "going" || response.response === "waiting") &&
			draft.eligiblePersonIds &&
			!draft.eligiblePersonIds.includes(response.personId),
	).length;
	const resetParts = data.responses.filter(
		(response) =>
			targets.some((entry) => entry.id === response.eventId) &&
			response.partIds?.some(
				(id) => !draft.parts?.some((part) => part.id === id),
			),
	).length;
	const save = async (): Promise<void> => {
		await task.submit(
			() =>
				validateEvent(
					event && !prepared.rebuild ? { ...draft, repeat: "once" } : draft,
				),
			async (): Promise<void> => {
				const issue = validateEvent(
					event && !prepared.rebuild ? { ...draft, repeat: "once" } : draft,
				);
				setError(issue);
				if (issue) return;
				if (
					await dispatch(
						event
							? {
									type: "edit-event",
									eventId: event.id,
									draft: prepared,
									scope,
									editId,
								}
							: { type: "create-event", id: creationId, draft },
					)
				) {
					if (
						!event &&
						source === "preview" &&
						draft.committedRoster &&
						draft.repeat !== "once"
					)
						setPreviewSeries((series) => [
							...series.filter((entry) => entry.id !== creationId),
							{
								id: creationId,
								seriesIds: [creationId],
								title: draft.title,
								capacity: draft.capacity,
								waitlist: false,
								enrollments: [],
							},
						]);
					onClose();
				}
			},
		);
	};
	return (
		<>
			<Dialog
				staffRole="admin"
				title={event ? "Edit event" : "New event"}
				isOpen={open}
				onOpenChange={(value): void => {
					if (!value && !busy) onClose();
				}}
				footer={
					<Button
						label={event ? "Save" : "Create event"}
						isLoading={busy || task.busy}
						onPress={(): void => {
							const issue = validateEvent(
								event && !prepared.rebuild
									? { ...draft, repeat: "once" }
									: draft,
							);
							setError(issue);
							if (!issue) {
								if (event) setConfirm(true);
								else void save();
							}
						}}
					/>
				}
			>
				<Stack>
					{event?.seriesId ? (
						<Select
							label="Apply to"
							value={scope}
							options={[
								{ value: "single", label: "This event" },
								{ value: "following", label: "This and following" },
								{ value: "series", label: "Whole series" },
							]}
							onValueChange={(value): void => {
								if (!value) return;
								const entries = seriesTargets(data.events, event, value);
								const anchor =
									value === "series" ? (entries.at(0) ?? event) : event;
								setScope(value);
								setDraft({
									...draft,
									date:
										value === "series"
											? (anchor.seriesDate ?? anchor.date)
											: anchor.date,
									repeat: anchor.repeat ?? "weekly",
									occurrences: entries.length,
								});
							}}
						/>
					) : undefined}
					<Surface header={<Text variant="h4">Event details</Text>}>
						<Stack gap="sm">
							<Select
								label="Event type"
								value={draft.kind === "hockey" ? "training" : draft.kind}
								options={[
									{ value: "training", label: "Practice" },
									{ value: "social", label: "Social" },
									{ value: "meeting", label: "Meeting" },
									{ value: "tournament", label: "Tournament" },
								]}
								onValueChange={(kind): void => {
									if (kind)
										setDraft({
											...draft,
											kind,
											committedRoster:
												kind === "training" ? draft.committedRoster : false,
											parts: undefined,
											repeat: kind === "tournament" ? "once" : draft.repeat,
											endDate: undefined,
											responseDeadline: undefined,
											tournamentRoster: undefined,
											capacity:
												kind === "tournament" ? undefined : draft.capacity,
										});
								}}
							/>
							<Field
								label="Title"
								value={draft.title}
								onValueChange={(title): void => setDraft({ ...draft, title })}
							/>
							<Grid gap="md">
								<Select
									label="Season"
									value={draft.seasonId}
									options={data.seasons.map((season) => ({
										value: season.id,
										label: season.name,
									}))}
									onValueChange={(seasonId): void =>
										setDraft({ ...draft, seasonId })
									}
								/>
							</Grid>
							<DatePicker
								label="Date"
								value={draft.date}
								onValueChange={(date): void =>
									setDraft({ ...draft, date: date ?? "" })
								}
							/>
							{draft.kind !== "tournament" &&
							(!event || scope !== "single" || !event.seriesId) ? (
								<Grid gap="md">
									<Select
										label="Repeat"
										value={draft.repeat}
										options={recurrenceChoices}
										onValueChange={(repeat): void => {
											if (repeat) setDraft({ ...draft, repeat });
										}}
									/>
									{draft.repeat !== "once" ? (
										<Stack gap="sm">
											<Field
												label={
													draft.repeat === "monthly"
														? "Every X months"
														: draft.repeat === "daily"
															? "Every X days"
															: draft.repeat === "fortnightly"
																? "Every X two-week cycles"
																: "Every X weeks"
												}
												inputMode="numeric"
												value={String(draft.repeatInterval ?? 1)}
												onValueChange={(value): void =>
													setDraft({ ...draft, repeatInterval: Number(value) })
												}
											/>
											<Select
												label="Series ends"
												value={draft.repeatUntil ? "date" : "count"}
												options={[
													{ value: "count", label: "After a number of events" },
													{ value: "date", label: "On a date" },
												]}
												onValueChange={(value): void =>
													setDraft({
														...draft,
														repeatUntil:
															value === "date" ? draft.date : undefined,
													})
												}
											/>
											{draft.repeatUntil ? (
												<DatePicker
													label="End date"
													value={draft.repeatUntil}
													onValueChange={(repeatUntil): void =>
														setDraft({
															...draft,
															repeatUntil: repeatUntil ?? draft.date,
														})
													}
												/>
											) : (
												<Field
													label="Number of events"
													inputMode="numeric"
													value={String(draft.occurrences ?? 4)}
													onValueChange={(value): void =>
														setDraft({ ...draft, occurrences: Number(value) })
													}
												/>
											)}
										</Stack>
									) : undefined}
								</Grid>
							) : undefined}
						</Stack>
					</Surface>
					{!event || scope !== "single" ? (
						<RecurrencePreview
							draft={draft}
							onChange={setDraft}
							creating={!event && practiceEvent(draft)}
						/>
					) : undefined}
					{draft.kind === "tournament" ? (
						<TournamentOptions draft={draft} onChange={setDraft} />
					) : practiceEvent(draft) ? (
						<EventPartsEditor draft={draft} onChange={setDraft} />
					) : (
						<EventTimeFields draft={draft} onChange={setDraft} />
					)}
					<Surface header={<Text variant="h4">Location</Text>}>
						<Stack gap="sm">
							{practiceEvent(draft) && !data.venues?.length ? (
								<Text variant="caption" tone="secondary">
									Configure venues in Club settings before creating an event.
								</Text>
							) : undefined}
							{!practiceEvent(draft) ? (
								<Field
									label={
										draft.kind === "tournament"
											? "Venue and city"
											: "Location or meeting link"
									}
									value={draft.venue}
									onValueChange={(venue): void => setDraft({ ...draft, venue })}
								/>
							) : (
								<Select
									label="Venue"
									options={[
										...new Set([
											...(data.venues ?? []),
											...(event?.venue ? [event.venue] : []),
										]),
									].map((venue) => ({ label: venue, value: venue }))}
									value={draft.venue}
									onValueChange={(venue): void =>
										setDraft({ ...draft, venue: venue ?? "" })
									}
								/>
							)}
						</Stack>
					</Surface>
					<Surface header={<Text variant="h4">Registration</Text>}>
						<EventOptions draft={draft} onChange={setDraft} />
					</Surface>
					{error || task.error ? (
						<Text variant="small" tone="danger">
							{error ?? task.error}
						</Text>
					) : undefined}
				</Stack>
			</Dialog>
			<Dialog
				staffRole="admin"
				title="Save changes"
				isOpen={confirm && open}
				onOpenChange={setConfirm}
				footer={
					<Row>
						<Button
							label="Back"
							variant="ghost"
							onPress={(): void => setConfirm(false)}
						/>
						<Button
							label="Save changes"
							isLoading={busy || task.busy}
							onPress={(): void => {
								void save();
							}}
						/>
					</Row>
				}
			>
				<Stack>
					{scope !== "single" ? (
						<Text variant="caption" tone="secondary">
							{prepared.rebuild
								? `Updates the recurrence from ${draft.date}.`
								: "Updates the selected events while keeping their dates and cancelled practices."}{" "}
							Existing RSVPs and individual edits are kept.
						</Text>
					) : undefined}
					{removed > 0 ? (
						<Text variant="small" tone="warning">
							{removed} registrations will be removed because those players are
							no longer eligible.
						</Text>
					) : undefined}
					{resetParts > 0 ? (
						<Text variant="small" tone="warning">
							{resetParts} partial registrations will reset to Not responded.
						</Text>
					) : undefined}
					{error || task.error ? (
						<Text variant="small" tone="danger">
							{error ?? task.error}
						</Text>
					) : undefined}
				</Stack>
			</Dialog>
		</>
	);
};
