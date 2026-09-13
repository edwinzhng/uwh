import { useRouter } from "expo-router";
import { type ReactElement, useState } from "react";
import { useActivePerson, useApp } from "../demo/app-state";
import {
	Button,
	DatePicker,
	EmptyState,
	Field,
	LoadingContent,
	Row,
	Select,
	Stack,
	Surface,
	Text,
} from "../design-system";
import { canRegister, formatDate } from "../domain/app-rules";
import { clubDate } from "../domain/event-time";
import { seriesEvents } from "../domain/session-series";
import { useFormTask } from "./use-form-task";
import type { SeriesControls } from "./use-session-series";

export const SessionSeriesManager = ({
	seriesId,
	controls,
}: {
	seriesId: string;
	controls: SeriesControls;
}): ReactElement => {
	const { data, account } = useApp();
	const active = useActivePerson();
	const router = useRouter();
	const series = controls.series.find(
		(entry) => entry.id === seriesId || entry.seriesIds.includes(seriesId),
	);
	const events = series
		? seriesEvents(series, controls.events)
		: controls.events
				.filter((event) => event.seriesId === seriesId)
				.toSorted((a, b) => a.date.localeCompare(b.date));
	const first = events.at(0);
	const today = clubDate(undefined, data.timeZone);
	const [title, setTitle] = useState(
		series?.title ?? first?.title ?? "Session series",
	);
	const [capacity, setCapacity] = useState(
		series?.capacity?.toString() ?? first?.capacity?.toString() ?? "",
	);
	const [personId, setPersonId] = useState(active.id);
	const [start, setStart] = useState(
		first && first.date > today ? first.date : today,
	);
	const [end, setEnd] = useState(today);
	const task = useFormTask();
	const people = data.members.filter(
		(person) =>
			(account.admin ||
				person.id === account.personId ||
				account.children.includes(person.id)) &&
			(!first || canRegister(person, first)),
	);
	const current = series?.enrollments.find(
		(entry) => entry.personId === personId && (!entry.end || entry.end > today),
	);
	if (controls.loading) return <LoadingContent />;
	return (
		<Stack>
			<Text variant="small" tone="secondary">
				{first ? formatDate(first.date) : ""} –{" "}
				{events.at(-1) ? formatDate(events.at(-1)?.date ?? "") : ""} ·{" "}
				{events.filter((event) => !event.cancelled).length} sessions
			</Text>
			{!series ? (
				<Text>
					Enable a committed roster so players enroll once for the term and
					report individual absences.
				</Text>
			) : (
				<Text>
					When registration opens, committed players are automatically invited
					and marked Going. Choose Not going with a reason if you cannot attend;
					coaches can see the reason.
				</Text>
			)}
			{account.admin ? (
				<Surface
					header={
						<Text variant="h4">
							{series ? "Series settings" : "Set up committed roster"}
						</Text>
					}
				>
					<Stack>
						<Field
							label="Series title"
							value={title}
							onValueChange={setTitle}
						/>
						<Field
							label="Committed places (blank for unlimited)"
							inputMode="numeric"
							value={capacity}
							onValueChange={setCapacity}
						/>
						<Button
							label={
								series ? "Save series settings" : "Enable committed roster"
							}
							isLoading={task.busy}
							onPress={(): void => {
								void task.submit(
									() =>
										!title.trim()
											? "Enter a title."
											: capacity &&
													(!Number.isInteger(Number(capacity)) ||
														Number(capacity) < 1)
												? "Enter a positive capacity."
												: undefined,
									async () =>
										controls.configure({
											seriesId: series?.id ?? seriesId,
											title,
											capacity: capacity ? Number(capacity) : undefined,
										}),
								);
							}}
						/>
					</Stack>
				</Surface>
			) : undefined}
			{series ? (
				<Surface header={<Text variant="h4">Commitment</Text>}>
					<Stack>
						<Select
							label="Player"
							value={personId}
							options={people.map((person) => ({
								value: person.id,
								label: person.name,
							}))}
							onValueChange={(value): void => {
								if (value) setPersonId(value);
								task.clear();
							}}
						/>
						{current ? (
							<>
								<Text>
									{current.state === "committed"
										? "Committed"
										: "Invitation pending"}{" "}
									from {formatDate(current.start)}
									{current.end
										? ` until ${formatDate(current.end)} (exclusive)`
										: ""}
								</Text>
								{current.state === "invited" ? (
									<Button
										label="Accept commitment"
										isLoading={task.busy}
										onPress={(): void => {
											void task.run(async () =>
												controls.enroll({
													seriesId: series.id,
													personId,
													start: current.start < today ? today : current.start,
												}),
											);
										}}
									/>
								) : undefined}
								<DatePicker
									label="End commitment from"
									value={end}
									onValueChange={(value): void => setEnd(value ?? "")}
								/>
								<Button
									label={
										current.state === "invited"
											? "Decline invitation"
											: "End commitment"
									}
									variant="secondary"
									isLoading={task.busy}
									onPress={(): void => {
										void task.submit(
											() =>
												!end || end < today
													? "Choose today or a future date."
													: undefined,
											async () =>
												controls.end({
													seriesId: series.id,
													personId,
													date: end,
												}),
										);
									}}
								/>
							</>
						) : (
							<>
								<DatePicker
									label="Join from"
									value={start}
									onValueChange={(value): void => setStart(value ?? "")}
								/>
								<Button
									label={
										account.admin && personId !== account.personId
											? "Enroll player"
											: "Commit to series"
									}
									isLoading={task.busy}
									onPress={(): void => {
										void task.submit(
											() =>
												!personId || !start || start < today
													? "Choose a player and current or future start date."
													: undefined,
											async () =>
												controls.enroll({
													seriesId: series.id,
													personId,
													start,
												}),
										);
									}}
								/>
								{account.admin ? (
									<Button
										label="Invite player to commit"
										variant="secondary"
										isLoading={task.busy}
										onPress={(): void => {
											void task.submit(
												() =>
													!personId || !start || start < today
														? "Choose a player and current or future start date."
														: undefined,
												async () =>
													controls.enroll({
														seriesId: series.id,
														personId,
														start,
														invite: true,
													}),
											);
										}}
									/>
								) : undefined}
								<Text variant="caption" tone="secondary">
									The organizer manages the committed roster. Full series do not
									accept additional commitments.
								</Text>
							</>
						)}
					</Stack>
				</Surface>
			) : undefined}
			{task.error ? <Text tone="danger">{task.error}</Text> : undefined}
			{series ? (
				<Surface header={<Text variant="h4">Roster</Text>}>
					<Stack>
						{series.enrollments
							.filter((entry) => !entry.end || entry.end > today)
							.map((entry) => (
								<Row key={`${entry.personId}:${entry.start}`}>
									<Text>
										{data.members.find((person) => person.id === entry.personId)
											?.name ?? "Player"}
									</Text>
									<Text tone="secondary">
										{entry.state === "committed"
											? "Committed"
											: "Invitation pending"}
									</Text>
								</Row>
							))}
						{!series.enrollments.length ? (
							<EmptyState
								title="No commitments yet"
								description="Invite players to commit to this series or let them join from a session."
							/>
						) : undefined}
					</Stack>
				</Surface>
			) : undefined}
			<Surface header={<Text variant="h4">Sessions</Text>}>
				<Stack>
					{events.map((event) => (
						<Button
							key={event.id}
							label={`${formatDate(event.date)} · ${event.cancelled ? "Cancelled" : event.title}`}
							variant="ghost"
							onPress={(): void =>
								router.push({
									pathname: "/session",
									params: { event: event.id },
								})
							}
						/>
					))}
					{!events.length ? (
						<EmptyState
							title="No sessions in this series"
							description="Sessions will appear here when they are added to this series."
						/>
					) : undefined}
				</Stack>
			</Surface>
		</Stack>
	);
};
