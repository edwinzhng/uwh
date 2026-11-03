import { type ReactElement, useMemo, useState } from "react";
import { Linking } from "react-native";
import { useApp } from "../demo/app-state";
import { Button, FileDownload, Stack, Text } from "../design-system";
import {
	personalCalendarEvents,
	reconcileCalendar,
	renderCalendar,
} from "../domain/calendar-export";
import { HouseholdCalendarDownload } from "./household-calendar-download";
import { useTask } from "./use-task";

type Person = { id: string; name: string; programs: string[] };

const PreviewCalendarDownload = ({
	people,
	onError,
}: {
	people: Person[];
	onError: (error: string) => void;
}): ReactElement => {
	const { data } = useApp();
	const contents = useMemo(
		() =>
			renderCalendar(
				data.clubName,
				people.flatMap((person) =>
					reconcileCalendar(
						[],
						personalCalendarEvents(
							data.events,
							data.responses,
							person.id,
							person.programs,
							false,
						).map((event) => ({
							...event,
							title: `${event.title} · ${person.name}`,
						})),
						data.clubName,
						person.id,
						Date.now(),
					),
				),
			),
		[data, people],
	);
	return (
		<FileDownload
			label="Download .ics file"
			filename="club-calendar.ics"
			contents={contents}
			onError={onError}
		/>
	);
};

export const CalendarDownload = ({
	people,
}: {
	people: Person[];
}): ReactElement => {
	const { source } = useApp();
	const [instructions, setInstructions] = useState(false);
	const [error, setError] = useState<string>();
	const task = useTask();
	return (
		<Stack gap="sm">
			<Text variant="small" tone="secondary">
				A one-time copy of these schedules. Changes made in the app will not
				update this file.
			</Text>
			{source === "convex" ? (
				<HouseholdCalendarDownload
					personIds={people.map((person) => person.id)}
					onError={setError}
				/>
			) : (
				<PreviewCalendarDownload people={people} onError={setError} />
			)}
			<Button
				label={instructions ? "Hide import instructions" : "How to import"}
				variant="ghost"
				onPress={(): void => setInstructions((value) => !value)}
			/>
			{instructions ? (
				<Stack gap="xs">
					<Text variant="small" tone="secondary">
						Open the .ics file in your calendar app. For Google Calendar, import
						the downloaded file from its settings on a computer.
					</Text>
					<Button
						label="Open Google Calendar import"
						variant="secondary"
						isLoading={task.busy}
						onPress={(): void => {
							void task.run(
								async (): Promise<void> =>
									Linking.openURL(
										"https://calendar.google.com/calendar/u/0/r/settings/export",
									),
							);
						}}
					/>
				</Stack>
			) : undefined}
			{error || task.error ? (
				<Text variant="small" tone="danger">
					{error ?? task.error}
				</Text>
			) : undefined}
		</Stack>
	);
};
