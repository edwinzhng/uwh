import { useRouter } from "expo-router";
import { type ReactElement, useState } from "react";
import { useApp } from "../demo/app-state";
import {
	EmptyState,
	List,
	ListItem,
	ResponsiveButtonControl,
	Row,
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
						<Row key={person.id} gap="xs">
							<Stack grow gap="none">
								<ListItem
									title={person.name}
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
								/>
							</Stack>
							<ResponsiveButtonControl
								prefix="plus"
								label="Give feedback"
								variant="secondary"
								compact
								accessibilityLabel={`Give feedback for ${person.name}`}
								onPress={(): void =>
									setRating({ personId: person.id, eventId: event.id })
								}
							/>
						</Row>
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
