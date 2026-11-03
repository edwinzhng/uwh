import { useRouter } from "expo-router";
import { type ReactElement, useState } from "react";
import { useApp } from "../demo/app-state";
import {
	Combobox,
	EmptyState,
	IconButton,
	List,
	ListItem,
	LoadingContent,
	Row,
	SectionHeading,
	Stack,
	SummaryCard,
	Surface,
	Text,
} from "../design-system";
import { formatDate, formatTime } from "../domain/app-rules";
import {
	type CoachingPractice,
	type CoachOption,
	coachingHoursLabel,
} from "../domain/coaching-hours";
import { CoachingHoursEditor } from "./coaching-hours-editor";
import { coachingReportTotals } from "./coaching-hours-summary";
import { LocalPage } from "./local-page";
import type { HoursCorrection } from "./use-coaching-hours";

export const CoachingHoursReport = ({
	practices,
	coaches,
	loading,
	correct,
}: {
	practices: CoachingPractice[];
	coaches: CoachOption[];
	loading: boolean;
	correct: HoursCorrection;
}): ReactElement => {
	const router = useRouter();
	const [editing, setEditing] = useState<{
		eventId: string;
		coachId: string;
	}>();
	const editingPractice = practices.find(
		(practice) => practice.eventId === editing?.eventId,
	);
	const editingAssignment = editingPractice?.coaches.find(
		(entry) => entry.coachId === editing?.coachId,
	);
	const { account } = useApp();
	const [selected, setSelected] = useState<string | undefined>(account.id);
	const totals = coachingReportTotals(practices, coaches);
	const coach =
		totals.find((entry) => entry.coachId === selected) ?? totals.at(0);
	const history = practices.filter((practice) =>
		practice.coaches.some((entry) => entry.coachId === coach?.coachId),
	);
	if (loading) return <LoadingContent />;
	if (!coach)
		return (
			<EmptyState
				title="No coaches yet"
				description="Program coaches will appear here when coaching access is assigned."
			/>
		);
	return (
		<Stack gap="lg">
			{editing && editingPractice?.durationEditable && editingAssignment ? (
				<CoachingHoursEditor
					key={`${editing.eventId}:${editing.coachId}`}
					assignment={editingAssignment}
					scheduledMinutes={
						editingPractice.practiceDurationMinutes ??
						editingAssignment.durationMinutes
					}
					isDisabled={false}
					onSave={(minutes) =>
						correct(
							editing.eventId,
							editing.coachId,
							minutes,
							editingAssignment.durationMinutes,
						)
					}
					onClose={(): void => setEditing(undefined)}
				/>
			) : undefined}
			<Combobox
				label="Coach"
				value={coach.coachId}
				options={totals.map((total) => ({
					value: total.coachId,
					label: total.name,
					person: {
						id: coaches.find((entry) => entry.coachId === total.coachId)
							?.personId,
						name: total.name,
					},
				}))}
				onValueChange={setSelected}
			/>
			<SummaryCard title="Hours coached" variant="metric">
				<Text
					variant="number"
					accessibilityLabel={coachingHoursLabel(coach.minutes)}
				>
					{new Intl.NumberFormat("en-CA", { maximumFractionDigits: 2 }).format(
						coach.minutes / 60,
					)}
				</Text>
				<Text variant="caption" tone="secondary">
					{coach.practices}{" "}
					{coach.practices === 1 ? "completed practice" : "completed practices"}
				</Text>
			</SummaryCard>
			<Stack gap="sm">
				<SectionHeading>Practices coached</SectionHeading>
				{history.length ? (
					<Surface>
						<LocalPage key={coach.coachId} items={history}>
							{(page) => (
								<List>
									{page.map((practice) => (
										<ListItem
											key={practice.eventId}
											title={practice.title}
											titleLines={2}
											description={`${formatDate(practice.date)} · ${formatTime(practice.start)}`}
											trailing={
												<Row gap="xs">
													<Text variant="label">
														{coachingHoursLabel(
															practice.coaches.find(
																(entry) => entry.coachId === coach.coachId,
															)?.durationMinutes ?? 0,
														)}
													</Text>
													{practice.durationEditable ? (
														<IconButton
															label={`Edit ${coach.name} coaching hours for ${practice.title}`}
															icon="edit"
															onPress={(): void =>
																setEditing({
																	eventId: practice.eventId,
																	coachId: coach.coachId,
																})
															}
														/>
													) : undefined}
												</Row>
											}
											onPress={
												practice.durationEditable
													? undefined
													: (): void =>
															router.push({
																pathname: "/session",
																params: {
																	event: practice.eventId,
																	tab: "coaching",
																},
															})
											}
										/>
									))}
								</List>
							)}
						</LocalPage>
					</Surface>
				) : (
					<EmptyState
						title="No completed practices"
						description={`${coach.name} has no recorded coaching hours this season.`}
					/>
				)}
			</Stack>
		</Stack>
	);
};
