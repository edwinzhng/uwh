import { useLocalSearchParams, useRouter } from "expo-router";
import { type ReactElement, useState } from "react";
import { useApp } from "../demo/app-state";
import { IconButton, Stack, ToolbarGroup } from "../design-system";
import { CalendarExportButton } from "./calendar-export-button";
import { ClubShell } from "./club-shell";
import { EventEditor } from "./event-editor";
import { ScheduleDayTabs } from "./schedule-day-tabs";
import { SchedulePage } from "./schedule-page";
import { useClubNow } from "./use-club-now";
import { useClubToday } from "./use-club-today";
import { useReviewFlow } from "./use-review-flow";

export const AgendaScreen = (): ReactElement => {
	const { account } = useApp();
	const router = useRouter();
	const params = useLocalSearchParams<{ weekday?: string }>();
	const review = useReviewFlow();
	const [create, setCreate] = useState(review === "create-event");
	const now = useClubNow();
	const today = useClubToday();
	const selectedDay = Number(params.weekday);
	const weekday =
		params.weekday !== undefined &&
		Number.isInteger(selectedDay) &&
		selectedDay >= 0 &&
		selectedDay <= 6
			? selectedDay
			: undefined;
	return (
		<ClubShell
			title="Schedule"
			toolbarLeading={
				<ToolbarGroup label="Schedule actions">
					<CalendarExportButton />
					{account.admin ? (
						<IconButton
							label="New event"
							roleTone="admin"
							icon="plus"
							onPress={(): void => setCreate(true)}
						/>
					) : undefined}
				</ToolbarGroup>
			}
		>
			<Stack gap="md">
				<ScheduleDayTabs
					value={weekday}
					now={now}
					onChange={(day): void =>
						router.setParams({
							weekday: day === undefined ? undefined : String(day),
							program: undefined,
						})
					}
				/>
				<SchedulePage weekday={weekday} now={now} />
			</Stack>
			{account.admin && create ? (
				<EventEditor
					open
					initialDate={today}
					onClose={(): void => setCreate(false)}
				/>
			) : undefined}
		</ClubShell>
	);
};
