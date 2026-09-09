import { Temporal } from "@js-temporal/polyfill";
import { usePaginatedQuery, useQuery } from "convex/react";
import * as Clipboard from "expo-clipboard";
import { useLocalSearchParams, useRouter } from "expo-router";
import { type ReactElement, useState } from "react";
import { api } from "../../convex/_generated/api";
import {
	AuthLayout,
	Badge,
	Button,
	Calendar,
	IconButton,
	Row,
	SegmentedControl,
	Stack,
	Surface,
	Text,
} from "../design-system";
import { formatDate, formatTime } from "../domain/app-rules";
import { clubDate } from "../domain/event-time";

export const PublicScheduleScreen = (): ReactElement => {
	const { club = "" } = useLocalSearchParams<{ club?: string }>();
	const router = useRouter();
	const [date, setDate] = useState(clubDate);
	const [view, setView] = useState("agenda");
	const [copied, setCopied] = useState(false);
	const month = Temporal.PlainDate.from(date).with({ day: 1 });
	const info = useQuery(api.public_schedule.info, { slug: club });
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
				<Row justify="between">
					<Text variant="h4">Schedule</Text>
					<Button
						label="Sign in"
						variant="secondary"
						onPress={(): void => router.replace("/schedule")}
					/>
				</Row>
				{info === undefined ? (
					<Text>Loading…</Text>
				) : !info ? (
					<Text>This schedule is unavailable.</Text>
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
								today={clubDate()}
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
						<Text variant="caption" tone="secondary">
							Calgary time
						</Text>
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
										<Text variant="label">{event.title}</Text>
										{event.cancelled ? (
											<Badge label="Cancelled" kind="danger" />
										) : undefined}
									</Row>
									<Text variant="small">
										{formatDate(event.date)} · {formatTime(event.start)}–
										{formatTime(event.end)}
									</Text>
									<Text variant="small" tone="secondary">
										{event.venue}
									</Text>
								</Stack>
							</Surface>
						))}
						{!results.length ? (
							<Text tone="secondary">
								{status === "LoadingFirstPage"
									? "Loading…"
									: "No public events."}
							</Text>
						) : undefined}
						{status === "CanLoadMore" || status === "LoadingMore" ? (
							<Button
								label="More events"
								variant="secondary"
								isLoading={status === "LoadingMore"}
								onPress={(): void => loadMore(30)}
							/>
						) : undefined}
					</>
				)}
			</Stack>
		</AuthLayout>
	);
};
