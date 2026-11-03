import { useLocalSearchParams, useRouter } from "expo-router";
import { type ReactElement, useState } from "react";
import { useApp } from "../demo/app-state";
import { Button, GlassPanel, IconButton, Row, Stack } from "../design-system";
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
				<GlassPanel padding="none" shape="pill" interactive>
					<Row gap="none">
						<CalendarExportButton />
						{account.admin ? (
							<IconButton
								label="New event"
								icon="plus"
								onPress={(): void => setCreate(true)}
							/>
						) : undefined}
					</Row>
				</GlassPanel>
			}
		>
			<Stack gap="md">
				<Row wrap>
					<Button
						label="All programs"
						round
						variant={programId ? "selection" : "solid"}
						isSelected={!programId}
						onPress={(): void => router.setParams({ program: undefined })}
					/>
					{programs.map((program) => (
						<Button
							key={program.id}
							label={program.name}
							round
							variant={programId === program.id ? "solid" : "selection"}
							isSelected={programId === program.id}
							onPress={(): void =>
								router.setParams({
									program: programId === program.id ? undefined : program.id,
								})
							}
						/>
					))}
				</Row>
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
