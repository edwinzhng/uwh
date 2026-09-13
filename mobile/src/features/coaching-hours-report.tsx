import { useRouter } from "expo-router";
import { type ReactElement, useState } from "react";
import {
	Button,
	EmptyState,
	List,
	ListItem,
	LoadingContent,
	Row,
	Stack,
	Surface,
	Text,
} from "../design-system";
import {
	type CoachingPractice,
	coachingHoursLabel,
	coachingTotals,
} from "../domain/coaching-hours";
import { LocalPage } from "./local-page";

export const CoachingHoursReport = ({
	practices,
	loading,
}: {
	practices: CoachingPractice[];
	loading: boolean;
}): ReactElement => {
	const router = useRouter();
	const [selected, setSelected] = useState<string>();
	const totals = coachingTotals(practices);
	const coach = totals.find((entry) => entry.coachId === selected);
	const history = practices.filter((practice) =>
		practice.coaches.some((entry) => entry.coachId === selected),
	);
	if (loading) return <LoadingContent />;
	return (
		<Stack>
			<Text variant="caption" tone="secondary">
				Completed practices
			</Text>
			<Surface padding="xs">
				<LocalPage items={totals}>
					{(page) => (
						<List>
							{page.map((total) => (
								<ListItem
									key={total.coachId}
									avatar={total.name}
									title={total.name}
									description={`${coachingHoursLabel(total.minutes)} · ${total.practices} ${total.practices === 1 ? "practice" : "practices"}`}
									selected={total.coachId === selected}
									onPress={(): void => setSelected(total.coachId)}
								/>
							))}
							{!page.length ? (
								<EmptyState
									title="No coaching hours yet"
									description="Assign coaches on a practice’s Coaching tab."
								/>
							) : undefined}
						</List>
					)}
				</LocalPage>
			</Surface>
			{coach ? (
				<Stack>
					<Row justify="between">
						<Text variant="h4">{coach.name}</Text>
						<Button
							label="Close history"
							variant="ghost"
							onPress={(): void => setSelected(undefined)}
						/>
					</Row>
					<Surface padding="xs">
						<LocalPage key={selected} items={history}>
							{(page) => (
								<List>
									{page.map((practice) => (
										<ListItem
											key={practice.eventId}
											title={practice.title}
											description={`${practice.date} · ${practice.start} · ${coachingHoursLabel(practice.coaches.find((entry) => entry.coachId === selected)?.durationMinutes ?? 0)}`}
											onPress={(): void =>
												router.push({
													pathname: "/session",
													params: { id: practice.eventId, tab: "coaching" },
												})
											}
										/>
									))}
								</List>
							)}
						</LocalPage>
					</Surface>
				</Stack>
			) : undefined}
		</Stack>
	);
};
