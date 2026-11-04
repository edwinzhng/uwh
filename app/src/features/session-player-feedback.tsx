import { useRouter } from "expo-router";
import { type ReactElement, useState } from "react";
import { useApp } from "../demo/app-state";
import {
	EmptyState,
	List,
	ListItem,
	ResponsiveButtonControl,
	SectionHeading,
	Stack,
	Surface,
} from "../design-system";
import { canCoachMember, canRegister } from "../domain/app-rules";
import type { ClubEvent } from "../domain/app-types";
import { SessionPerformanceTask } from "./session-performance-task";

export const SessionPlayerFeedback = ({
	event,
}: {
	event: ClubEvent;
}): ReactElement => {
	const { data, account } = useApp();
	const router = useRouter();
	const [rating, setRating] = useState<{ personId: string; eventId: string }>();
	const players = data.members.filter(
		(person) => canRegister(person, event) && canCoachMember(account, person),
	);
	return (
		<Stack gap="sm">
			<SectionHeading>Player feedback</SectionHeading>
			<Surface>
				<List separators="full">
					{players.map((person) => (
						<ListItem
							key={person.id}
							title={person.name}
							titleLines={2}
							showChevron={false}
							avatar={person.name}
							avatarId={person.id}
							onPress={(): void =>
								router.push({
									pathname: "/member",
									params: {
										id: person.id,
										tab: "profile",
										event: event.id,
									},
								})
							}
							description={person.goal}
							descriptionLines={2}
							action={
								<ResponsiveButtonControl
									prefix="plus"
									collapseBelow={480}
									label="Feedback"
									variant="secondary"
									compact
									accessibilityLabel={`Feedback for ${person.name}`}
									onPress={(): void =>
										setRating({ personId: person.id, eventId: event.id })
									}
								/>
							}
						/>
					))}
					{!players.length ? (
						<EmptyState
							title="No eligible players"
							description="Player feedback becomes available when players are eligible for this session."
						/>
					) : undefined}
				</List>
			</Surface>
			{rating ? (
				<SessionPerformanceTask
					personId={rating.personId}
					eventId={rating.eventId}
					kind="coach"
					onClose={(): void => setRating(undefined)}
				/>
			) : undefined}
		</Stack>
	);
};
