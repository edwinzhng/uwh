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
	Text,
	TimeSelector,
} from "../design-system";
import { validateEvent } from "../domain/app-rules";
import type { ClubEvent, EventDraft } from "../domain/app-types";
import {
	eventDraft,
	recurrenceChoices,
	seriesTargets,
} from "../domain/event-recurrence";
import { clubDate } from "../domain/event-time";
import { EventOptions } from "./event-options";

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
	const { data, dispatch, busy } = useApp();
	const [draft, setDraft] = useState<EventDraft>(() =>
		event
			? eventDraft(event)
			: {
					title: "",
					date: initialDate ?? clubDate(),
					start: "19:45",
					end: "21:00",
					venue: "MNP Community & Sport Centre",
					program: "club",
					kind: "training",
					capacity: 24,
					repeat: "once",
					occurrences: 4,
					description: "",
					seasonId:
						data.seasons.find(
							(season) =>
								season.start <= (initialDate ?? clubDate()) &&
								season.end >= (initialDate ?? clubDate()),
						)?.id ?? data.seasons.at(-1)?.id,
				},
	);
	const [editId] = useState(newId);
	const [error, setError] = useState<string>();
	const [confirm, setConfirm] = useState(false);
	const [scope, setScope] = useState<"single" | "series" | "following">(
		"single",
	);
	const prepared = {
		...draft,
		rebuild: Boolean(
			event &&
				(scope !== "single" || (!event.seriesId && draft.repeat !== "once")),
		),
	};
	const targets = event ? seriesTargets(data.events, event, scope) : [];
	const removed = data.responses.filter(
		(response) =>
			targets.some((event) => event.id === response.eventId) &&
			(response.response === "going" || response.response === "waiting") &&
			draft.eligiblePersonIds &&
			!draft.eligiblePersonIds.includes(response.personId),
	).length;
	const save = async (): Promise<void> => {
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
					: { type: "create-event", id: newId(), draft },
			)
		)
			onClose();
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
						isLoading={busy}
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
						<Select
							label="Type"
							value={draft.kind}
							options={[
								{ value: "training", label: "Training" },
								{ value: "hockey", label: "Hockey" },
								{ value: "social", label: "Social" },
							]}
							onValueChange={(kind): void => {
								if (kind) setDraft({ ...draft, kind });
							}}
						/>
					</Grid>
					<DatePicker
						label="Date"
						value={draft.date}
						onValueChange={(date): void =>
							setDraft({ ...draft, date: date ?? "" })
						}
					/>
					<Grid gap="md">
						<TimeSelector
							label="Starts"
							value={draft.start}
							onValueChange={(start): void =>
								setDraft({ ...draft, start: start ?? "" })
							}
						/>
						<TimeSelector
							label="Ends"
							value={draft.end}
							onValueChange={(end): void =>
								setDraft({ ...draft, end: end ?? "" })
							}
						/>
					</Grid>
					<Text variant="caption" tone="secondary">
						Calgary time
					</Text>
					<Field
						label="Venue"
						value={draft.venue}
						onValueChange={(venue): void => setDraft({ ...draft, venue })}
					/>
					{!event || scope !== "single" || !event.seriesId ? (
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
								<Field
									label="Occurrences"
									inputMode="numeric"
									value={String(draft.occurrences ?? 4)}
									onValueChange={(value): void =>
										setDraft({ ...draft, occurrences: Number(value) })
									}
								/>
							) : undefined}
						</Grid>
					) : undefined}
					<EventOptions draft={draft} onChange={setDraft} />
					{error ? (
						<Text variant="small" tone="danger">
							{error}
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
							isLoading={busy}
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
							Rebuilds {draft.repeat === "once" ? 1 : draft.occurrences} events
							from {draft.date}. Existing RSVPs stay with their events. Extra
							events are cancelled. Individual edits are kept.
						</Text>
					) : undefined}
					{removed > 0 ? (
						<Text variant="small" tone="warning">
							{removed} registrations will be removed because those players are
							no longer eligible.
						</Text>
					) : undefined}
					{error ? (
						<Text variant="small" tone="danger">
							{error}
						</Text>
					) : undefined}
				</Stack>
			</Dialog>
		</>
	);
};
