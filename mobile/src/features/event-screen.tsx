import { useLocalSearchParams, useRouter } from "expo-router";
import { type ReactElement, useState } from "react";
import { useApp } from "../demo/app-state";
import {
	Badge,
	Button,
	Dialog,
	EmptyState,
	Row,
	SegmentedControl,
	Stack,
	Surface,
	TabContent,
	Tabs,
	Text,
} from "../design-system";
import { canCoach, formatDate, formatTime } from "../domain/app-rules";
import { eventKindLabel, practiceEvent } from "../domain/event-types";
import { ClubShell } from "./club-shell";
import { EventEditor } from "./event-editor";
import { ResponseControl } from "./response-control";
import { SessionCoaching } from "./session-coaching";
import { SessionDiscussionButton } from "./session-discussion-button";
import { SessionGuestManager } from "./session-guest-manager";
import { SessionPeople } from "./session-people";
import { SessionSeriesLink } from "./session-series-link";
import { TeamPanel } from "./team-panel";
import { TournamentPeople } from "./tournament-people";
import { TournamentSummary } from "./tournament-summary";

export const EventScreen = (): ReactElement => {
	const {
		event: eventId,
		id: legacyId,
		tab: selectedTab,
		part: selectedPart,
	} = useLocalSearchParams<{
		id?: string;
		event?: string;
		tab?: string;
		part?: string;
	}>();
	const id = eventId ?? legacyId;
	const { data, account, dispatch, busy } = useApp();
	const router = useRouter();
	const event = data.events.find((entry) => entry.id === id);
	const partId = event?.parts?.some((part) => part.id === selectedPart)
		? selectedPart
		: undefined;
	const tab = selectedTab ?? "overview";
	const setTab = (tab: string): void => router.setParams({ tab });
	const [cancel, setCancel] = useState(false);
	const [edit, setEdit] = useState(false);
	const coach = event
		? practiceEvent(event) && canCoach(account, event.program)
		: false;
	const activeTab =
		tab === "people"
			? "people"
			: tab === "coaching" && coach
				? "coaching"
				: "overview";
	return (
		<ClubShell
			tabs={
				<Tabs
					page
					label="Event"
					hideLabel
					value={activeTab}
					onValueChange={setTab}
					options={[
						{ value: "overview", label: "Overview" },
						{
							value: "people",
							label:
								event?.kind === "tournament" ? "Availability" : "Attendance",
						},
						...(coach
							? [
									{
										value: "coaching",
										label: "Coaching",
										staffRole: "coach" as const,
									},
								]
							: []),
					]}
				/>
			}
			title={event?.title ?? "Event not found"}
			subtitle={
				event
					? formatDate(event.date) +
						" · " +
						formatTime(event.start) +
						"–" +
						(event.endDate && event.endDate !== event.date
							? `${formatDate(event.endDate)} ${formatTime(event.end)}`
							: formatTime(event.end))
					: undefined
			}
			back={
				<Row>
					<Button
						label="Schedule"
						prefix="arrowLeft"
						variant="ghost"
						onPress={(): void => router.navigate("/schedule")}
					/>
				</Row>
			}
			action={
				account.admin && event && !event.cancelled ? (
					<Row gap="xs">
						<Button
							label="Cancel event"
							variant="ghost"
							onPress={(): void => setCancel(true)}
						/>
						<Button
							label="Edit"
							staffRole="admin"
							prefix="edit"
							variant="secondary"
							onPress={(): void => setEdit(true)}
						/>
					</Row>
				) : undefined
			}
		>
			{event ? (
				<>
					{event.parts?.length ? (
						<SegmentedControl
							label="Practice part"
							value={partId ?? "all"}
							onValueChange={(part): void => router.setParams({ part })}
							options={[
								{ value: "all", label: "All" },
								...event.parts.map((part) => ({
									value: part.id,
									label: part.title,
								})),
							]}
						/>
					) : undefined}
					<TabContent value={activeTab}>
						{activeTab === "overview" ? (
							<Stack>
								<Surface>
									<Stack>
										<Row gap="xs" wrap>
											<Badge
												label={
													data.seasons.find(
														(season) =>
															season.id === (event.seasonId ?? "2026-2027"),
													)?.name ?? "2026–2027"
												}
											/>
											<Badge label={eventKindLabel(event.kind)} />
											{event.seriesId ? <Badge label="Recurring" /> : undefined}
										</Row>
										<Text variant="h4">{event.venue}</Text>
										<Text variant="small">{event.description}</Text>
										{event.parts?.map((part) => (
											<Text key={part.id} variant="small" tone="secondary">
												{part.title} · {formatTime(part.start)}–
												{formatTime(part.end)}
											</Text>
										))}
										<ResponseControl event={event} />
										<SessionDiscussionButton event={event} />
										{account.admin && event.seriesId ? (
											<SessionGuestManager event={event} />
										) : undefined}
										{event.seriesId ? (
											<SessionSeriesLink seriesId={event.seriesId} />
										) : undefined}
									</Stack>
								</Surface>
								{event.kind === "tournament" ? (
									<TournamentSummary event={event} />
								) : practiceEvent(event) ? (
									<TeamPanel event={event} partId={partId} readOnly />
								) : undefined}
							</Stack>
						) : activeTab === "people" ? (
							event.kind === "tournament" ? (
								<TournamentPeople event={event} />
							) : (
								<SessionPeople
									key={`${event.id}:${partId}`}
									event={event}
									partId={partId}
								/>
							)
						) : (
							<>
								<SessionCoaching
									key={`${event.id}:${partId}`}
									event={event}
									partId={partId}
								/>
							</>
						)}
					</TabContent>
					<Dialog
						title="Cancel this event?"
						isOpen={cancel}
						onOpenChange={setCancel}
						footer={
							<Row>
								<Button
									label="Keep event"
									variant="ghost"
									onPress={(): void => setCancel(false)}
								/>
								<Button
									label="Cancel event"
									variant="danger"
									isLoading={busy}
									onPress={(): void => {
										void dispatch({
											type: "cancel-event",
											eventId: event.id,
										}).then((saved) => {
											if (saved) setCancel(false);
										});
									}}
								/>
							</Row>
						}
					>
						<Text variant="small">
							{event.title} · {formatDate(event.date)}. Attendance history will
							be kept.
						</Text>
					</Dialog>
					{edit && account.admin ? (
						<EventEditor
							key={event.id}
							event={event}
							open
							onClose={(): void => setEdit(false)}
						/>
					) : undefined}
				</>
			) : (
				<EmptyState
					title="Event unavailable"
					description="Return to Schedule to choose another event."
				/>
			)}
		</ClubShell>
	);
};
