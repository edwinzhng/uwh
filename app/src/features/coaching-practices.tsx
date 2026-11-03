import { useRouter } from "expo-router";
import type { ReactElement } from "react";
import { useApp } from "../demo/app-state";
import {
	Button,
	List,
	ListItem,
	SectionHeading,
	Stack,
	Surface,
	Text,
} from "../design-system";
import { formatDate } from "../domain/app-rules";
import { clubTimestamp } from "../domain/event-time";
import { programName } from "../domain/programs";

export const CoachingPractices = (): ReactElement => {
	const { data } = useApp();
	const router = useRouter();
	const practices = data.events
		.filter(
			(event) =>
				!event.cancelled &&
				event.kind !== "social" &&
				event.kind !== "meeting" &&
				clubTimestamp(event.endDate ?? event.date, event.end, event.timeZone) >=
					Date.now(),
		)
		.slice()
		.sort(
			(left, right) =>
				left.date.localeCompare(right.date) ||
				left.start.localeCompare(right.start),
		)
		.slice(0, 6);
	return (
		<Stack gap="sm">
			<SectionHeading
				action={
					<Button
						label="Schedule"
						variant="ghost"
						compact
						onPress={(): void => router.push("/schedule")}
					/>
				}
			>
				Practices
			</SectionHeading>
			<Text variant="small" tone="secondary">
				Assign coaches to a specific practice, or set program defaults below.
			</Text>
			{practices.length ? (
				<Surface>
					<List>
						{practices.map((event) => (
							<ListItem
								key={event.id}
								title={event.title}
								titleLines={2}
								description={`${formatDate(event.date)} · ${event.start} · ${programName(data, event.program)}`}
								descriptionLines={2}
								onPress={(): void =>
									router.push({
										pathname: "/session",
										params: { id: event.id, tab: "coaching" },
									})
								}
							/>
						))}
					</List>
				</Surface>
			) : (
				<Text variant="small" tone="secondary">
					No upcoming practices. Open Schedule to choose another date.
				</Text>
			)}
		</Stack>
	);
};
