import { type ReactElement, useState } from "react";
import {
	useLiveCoachingSchedule,
	usePreviewCoachingSchedule,
	type WeeklyCoachingState,
} from "../backend/use-coaching-schedule";
import { useApp } from "../demo/app-state";
import {
	List,
	ListItem,
	LoadingContent,
	Stack,
	Surface,
	Text,
} from "../design-system";
import { programCoachesFor } from "../domain/coaching-schedule";
import { clubPrograms } from "../domain/programs";
import { ProgramCoachingEditor } from "./program-coaching-editor";
import { useReviewFlow } from "./use-review-flow";

const WeeklyRoster = ({
	state,
}: {
	state: WeeklyCoachingState;
}): ReactElement => {
	const [open, setOpen] = useState(useReviewFlow() === "weekly-coaches");
	const { data, account } = useApp();
	const [selectedProgram, setSelectedProgram] = useState<string>();
	const programs = clubPrograms(data).filter((program) => !program.archived);
	const schedule = state.schedule;
	const names = (ids: string[]): string =>
		ids
			.map(
				(id) =>
					state.coaches.find((coach) => coach.coachId === id)?.name ??
					"Former coach",
			)
			.join(" · ") || "No coaches assigned";
	return (
		<Stack gap="sm">
			<Text variant="small" tone="secondary">
				Choose a program to set its default coaches.
			</Text>
			<Surface>
				{state.loading || !schedule ? (
					<LoadingContent />
				) : (
					<List>
						{programs.map((program) => (
							<ListItem
								key={program.id}
								title={program.name}
								accessibilityLabel={
									account.admin || account.coachPrograms.includes(program.id)
										? `Edit coaches for ${program.name}`
										: `${program.name} coaches`
								}
								description={names(programCoachesFor(schedule, program.id))}
								onPress={
									account.admin || account.coachPrograms.includes(program.id)
										? (): void => {
												setSelectedProgram(program.id);
												setOpen(true);
											}
										: undefined
								}
							/>
						))}
						<ListItem
							title="Backup coaches"
							description={names(schedule.backupCoachIds)}
							onPress={(): void => {
								setSelectedProgram("backup");
								setOpen(true);
							}}
						/>
					</List>
				)}
			</Surface>
			{schedule &&
			schedule.programs === undefined &&
			schedule.days.some((day) => day.coachIds.length) ? (
				<Text variant="small" tone="secondary">
					Choose program defaults instead of the previous weekday roster. Saved
					practice assignments and hours stay unchanged.
				</Text>
			) : undefined}
			{open && schedule ? (
				<ProgramCoachingEditor
					state={state}
					initialProgramId={selectedProgram}
					schedule={schedule}
					onClose={(): void => setOpen(false)}
				/>
			) : undefined}
		</Stack>
	);
};
const LiveWeeklyRoster = (): ReactElement => (
	<WeeklyRoster state={useLiveCoachingSchedule()} />
);
const PreviewWeeklyRoster = (): ReactElement => (
	<WeeklyRoster state={usePreviewCoachingSchedule()} />
);
export const ProgramCoachingRoster = (): ReactElement => {
	const { source } = useApp();
	return source === "convex" ? <LiveWeeklyRoster /> : <PreviewWeeklyRoster />;
};
