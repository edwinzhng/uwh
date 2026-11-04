import { useLocalSearchParams, useRouter } from "expo-router";
import { type ReactElement, useState } from "react";
import { useApp } from "../demo/app-state";
import { IconButton, Stack, Tabs, ToolbarGroup } from "../design-system";
import { clubPrograms } from "../domain/programs";
import { CalendarExportButton } from "./calendar-export-button";
import { ClubShell } from "./club-shell";
import { EventEditor } from "./event-editor";
import { SchedulePage } from "./schedule-page";
import { useClubNow } from "./use-club-now";
import { useClubToday } from "./use-club-today";
import { useReviewFlow } from "./use-review-flow";

export const AgendaScreen = (): ReactElement => {
	const { data, account } = useApp();
	const router = useRouter();
	const params = useLocalSearchParams<{ program?: string }>();
	const review = useReviewFlow();
	const [create, setCreate] = useState(review === "create-event");
	const now = useClubNow();
	const today = useClubToday();
	const programs = clubPrograms(data).filter((program) => !program.archived);
	const programId = programs.some((program) => program.id === params.program)
		? params.program
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
				<Tabs
					label="Programs"
					value={programId ?? "all"}
					options={[
						{ value: "all", label: "All" },
						...programs.map((program) => ({
							value: program.id,
							label: program.name,
						})),
					]}
					onValueChange={(value): void =>
						router.setParams({ program: value === "all" ? undefined : value })
					}
				/>
				<SchedulePage programId={programId} now={now} />
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
