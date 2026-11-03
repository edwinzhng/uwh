import { type ReactElement, useState } from "react";
import { useActivePerson, useApp } from "../demo/app-state";
import {
	AppLayout,
	EmptyState,
	Grid,
	type HistoryControlTreatment,
	HistorySection,
	Stack,
	Text,
} from "../design-system";
import type { ClubEvent } from "../domain/app-types";
import { clubTimestamp } from "../domain/event-time";
import { eventFinished } from "../domain/schedule-agenda";
import { ScheduleCardSample } from "./schedule-card-sample";

const HistoryOption = ({
	events,
	treatment,
	title,
}: {
	events: ClubEvent[];
	treatment: HistoryControlTreatment;
	title: string;
}): ReactElement => {
	const [count, setCount] = useState(1);
	const visible = events.slice(0, count).reverse();
	return (
		<Stack gap="md">
			<Text variant="h4">{title}</Text>
			<HistorySection
				treatment={treatment}
				loading={false}
				revision={visible.length}
				loadMore={
					count < events.length
						? (): void => setCount((current) => current + 3)
						: undefined
				}
			>
				<Stack gap="xs">
					{visible.map((event) => (
						<ScheduleCardSample
							key={event.id}
							event={event}
							state="past"
							dateLayout="badge"
						/>
					))}
				</Stack>
			</HistorySection>
		</Stack>
	);
};
export const HistoryControlOptionsScreen = (): ReactElement => {
	const { data, source } = useApp();
	const person = useActivePerson();
	const now = Date.now();
	const events = data.events
		.filter((event) => eventFinished(event, now))
		.slice()
		.sort(
			(a, b) =>
				clubTimestamp(b.date, b.start, b.timeZone) -
					clubTimestamp(a.date, a.start, a.timeZone) ||
				b.id.localeCompare(a.id),
		);
	if (process.env.EXPO_PUBLIC_REVIEW_MODE !== "true" || source !== "preview")
		return (
			<EmptyState
				title="Review unavailable"
				description="Open this page in the local review build."
			/>
		);
	return (
		<AppLayout title="History controls">
			{events.length ? (
				<Grid gap="lg">
					<HistoryOption
						key={`heading:${person.id}`}
						events={events}
						treatment="heading"
						title="Heading"
					/>
					<HistoryOption
						key={`inline:${person.id}`}
						events={events}
						treatment="inline"
						title="Inline"
					/>
					<HistoryOption
						key={`divider:${person.id}`}
						events={events}
						treatment="divider"
						title="Divider"
					/>
				</Grid>
			) : (
				<EmptyState title="No past practices" />
			)}
		</AppLayout>
	);
};
