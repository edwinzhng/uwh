import type { ReactElement } from "react";
import { useActivePerson, useApp } from "../demo/app-state";
import {
	AppLayout,
	EmptyState,
	Grid,
	type ScheduleDateLayout,
	Stack,
	Text,
} from "../design-system";
import { ScheduleCardSample } from "./schedule-card-sample";

const options: { layout: ScheduleDateLayout; title: string; detail: string }[] =
	[
		{
			layout: "inline",
			title: "01 · Inline date",
			detail: "Date and time above the title. The smallest footprint.",
		},
		{
			layout: "badge",
			title: "02 · Date badge",
			detail: "A small calendar tile, without the vertical divider.",
		},
		{
			layout: "agenda",
			title: "03 · Title first",
			detail: "Lead with the practice. Keep date and time in one quiet line.",
		},
	];
export const ScheduleCardOptionsScreen = (): ReactElement => {
	const { data, source } = useApp();
	const person = useActivePerson();
	const practice = data.events.find((event) => event.id === "club-thu");
	const past =
		data.events.find((event) => event.id === "carry-source") ??
		data.events.find((event) => event.id === "past");
	if (
		process.env.EXPO_PUBLIC_REVIEW_MODE !== "true" ||
		source !== "preview" ||
		!practice ||
		!past
	)
		return (
			<EmptyState
				title="Review unavailable"
				description="Open this page in the local review build."
			/>
		);
	return (
		<AppLayout
			title="Schedule card options"
			subtitle="Three directions · real cards · independent responses"
		>
			<Grid gap="lg">
				{options.map((option) => (
					<Stack key={`${option.layout}:${person.id}`} gap="md">
						<Stack gap="xs">
							<Text variant="h4">{option.title}</Text>
							<Text variant="small" tone="secondary">
								{option.detail}
							</Text>
						</Stack>
						<Text variant="overline" tone="secondary">
							Past
						</Text>
						<ScheduleCardSample
							event={past}
							state="past"
							dateLayout={option.layout}
						/>
						<Text variant="overline" tone="secondary">
							Attending
						</Text>
						<ScheduleCardSample
							event={practice}
							state="going"
							dateLayout={option.layout}
						/>
						<Text variant="overline" tone="secondary">
							Unanswered
						</Text>
						<ScheduleCardSample
							event={practice}
							state="unanswered"
							dateLayout={option.layout}
						/>
						<Text variant="overline" tone="secondary">
							Not attending
						</Text>
						<ScheduleCardSample
							event={practice}
							state="unavailable"
							dateLayout={option.layout}
						/>
						<Text variant="overline" tone="secondary">
							Partly attending
						</Text>
						<ScheduleCardSample
							event={practice}
							state="partial"
							dateLayout={option.layout}
						/>
						<Text variant="overline" tone="secondary">
							Waitlisted
						</Text>
						<ScheduleCardSample
							event={practice}
							state="waiting"
							dateLayout={option.layout}
						/>
						<Text variant="overline" tone="secondary">
							Cancelled
						</Text>
						<ScheduleCardSample
							event={practice}
							state="cancelled"
							dateLayout={option.layout}
						/>
					</Stack>
				))}
			</Grid>
		</AppLayout>
	);
};
