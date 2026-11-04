import { Temporal } from "@js-temporal/polyfill";
import { usePaginatedQuery, useQuery } from "convex/react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { type ReactElement, useState } from "react";
import { api } from "../../convex/_generated/api";
import { useBackend } from "../backend/context";
import {
	AuthLayout,
	Badge,
	Button,
	Calendar,
	EmptyState,
	formatTimeLocation,
	IconButton,
	InfiniteScroll,
	LoadingContent,
	Row,
	SectionHeading,
	SegmentedControl,
	Stack,
	Surface,
	Text,
} from "../design-system";
import { formatDate } from "../domain/app-rules";
import { eventTimeRange } from "../domain/event-card-presentation";
import { clubDate } from "../domain/event-time";
import * as Clipboard from "../platform/clipboard";

const LivePublicScheduleScreen = (): ReactElement => {
	const { club = "" } = useLocalSearchParams<{ club?: string }>();
	const router = useRouter();
	const [selectedDate, setDate] = useState<string>();
	const [view, setView] = useState("agenda");
	const [copied, setCopied] = useState(false);
	const info = useQuery(api.public_schedule.info, { slug: club });
	const date = selectedDate ?? clubDate(undefined, info?.timeZone);
	const month = Temporal.PlainDate.from(date).with({ day: 1 });
	const { results, status, loadMore } = usePaginatedQuery(
		api.public_schedule.events,
		{
			slug: club,
			from: view === "calendar" ? date : month.toString(),
			to:
				view === "calendar"
					? date
					: month.add({ months: 1 }).subtract({ days: 1 }).toString(),
		},
		{ initialNumItems: 30 },
	);
	return (
		<AuthLayout title={info?.name ?? "Public schedule"}>
			<Stack>
				<SectionHeading
					action={
						<Button
							label="Sign in"
							variant="secondary"
							onPress={(): void => router.replace("/schedule")}
						/>
					}
				>
					Schedule
				</SectionHeading>
				{info === undefined ? (
					<LoadingContent />
				) : !info ? (
					<EmptyState
						title="Schedule unavailable"
						description="Check the club link or contact the club for its public schedule."
					/>
				) : (
					<>
						<SegmentedControl
							label="Schedule view"
							value={view}
							options={[
								{ value: "agenda", label: "Agenda" },
								{ value: "calendar", label: "Calendar" },
							]}
							onValueChange={setView}
						/>
						{view === "calendar" ? (
							<Calendar
								value={date}
								today={clubDate(undefined, info.timeZone)}
								counts={{}}
								onValueChange={setDate}
							/>
						) : (
							<Row justify="between">
								<IconButton
									label="Previous month"
									icon="arrowLeft"
									onPress={(): void =>
										setDate(month.subtract({ months: 1 }).toString())
									}
								/>
								<Text variant="label">
									{month.toLocaleString("en-CA", {
										month: "long",
										year: "numeric",
									})}
								</Text>
								<IconButton
									label="Next month"
									icon="arrowRight"
									onPress={(): void =>
										setDate(month.add({ months: 1 }).toString())
									}
								/>
							</Row>
						)}
						<Button
							label={
								copied
									? "Subscription link copied"
									: "Copy calendar subscription"
							}
							prefix="calendar"
							variant="secondary"
							onPress={(): void => {
								void Clipboard.setStringAsync(info.feedUrl)
									.then(() => setCopied(true))
									.catch(() => setCopied(false));
							}}
						/>
						{results.map((event) => (
							<Surface key={event.id}>
								<Stack gap="xs">
									<Row justify="between" wrap>
										<Text variant="h4">{event.title}</Text>
										{event.cancelled ? (
											<Badge label="Cancelled" kind="danger" />
										) : undefined}
									</Row>
									<Text variant="small">
										{formatDate(event.date)}
										{event.endDate && event.endDate !== event.date
											? `–${formatDate(event.endDate)}`
											: ""}
									</Text>
									<Text variant="small" tone="secondary">
										{formatTimeLocation(
											eventTimeRange(event.start, event.end),
											event.venue,
										)}
									</Text>
								</Stack>
							</Surface>
						))}
						{!results.length ? (
							status === "LoadingFirstPage" ? (
								<LoadingContent />
							) : (
								<EmptyState title="No public events" />
							)
						) : undefined}
						{status === "CanLoadMore" || status === "LoadingMore" ? (
							<InfiniteScroll
								loadMore={(): void => loadMore(30)}
								loading={status === "LoadingMore"}
								revision={results.length}
								disabled={false}
							/>
						) : undefined}
					</>
				)}
			</Stack>
		</AuthLayout>
	);
};

export const PublicScheduleScreen = (): ReactElement => {
	const { club } = useLocalSearchParams<{ club?: string }>();
	const backend = useBackend();
	return backend.available && club ? (
		<LivePublicScheduleScreen />
	) : (
		<AuthLayout title="Public schedule">
			<EmptyState
				title="Schedule unavailable"
				description="Check the club link or contact the club for its public schedule."
			/>
		</AuthLayout>
	);
};
