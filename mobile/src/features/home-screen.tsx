import { useRouter } from "expo-router";
import { type ReactElement, useEffect, useState } from "react";
import { useApp } from "../demo/app-state";
import { Button, EmptyState, SectionHeading, Stack } from "../design-system";
import {
	homeSchedule,
	householdMembers,
	relevantHouseholdEvent,
} from "../domain/home";
import { ClubShell } from "./club-shell";
import { HomeAttention } from "./home-attention";
import { HomeCoaching } from "./home-coaching";
import { HouseholdEventCard } from "./household-event-card";
import { NoticeBanner } from "./notice-banner";

export const HomeScreen = (): ReactElement => {
	const { data, account } = useApp();
	const router = useRouter();
	const [now, setNow] = useState(Date.now);
	useEffect(() => {
		const timer = setInterval((): void => setNow(Date.now()), 60000);
		return (): void => clearInterval(timer);
	}, []);
	const people = householdMembers(data, account);
	const schedule = homeSchedule(
		data.events.filter((event) => relevantHouseholdEvent(event, people)),
		now,
		data.timeZone,
	);
	return (
		<ClubShell title="Home" subtitle={data.clubName}>
			<NoticeBanner />
			<HomeAttention />
			<HomeCoaching now={now} />
			<Stack gap="sm">
				<SectionHeading
					size="small"
					action={
						<Button
							label="Schedule"
							variant="ghost"
							onPress={(): void => router.navigate("/schedule")}
						/>
					}
				>
					{schedule.thisWeek ? "This week" : "Next session"}
				</SectionHeading>
				{schedule.events.length ? (
					schedule.events.map((event) => (
						<HouseholdEventCard key={event.id} event={event} />
					))
				) : (
					<EmptyState
						title="No upcoming sessions"
						description="Your household’s next sessions will appear here when they’re scheduled."
					/>
				)}
			</Stack>
			{schedule.nextTournament ? (
				<Stack gap="sm">
					<SectionHeading size="small">Next tournament</SectionHeading>
					<HouseholdEventCard event={schedule.nextTournament} />
				</Stack>
			) : undefined}
		</ClubShell>
	);
};
