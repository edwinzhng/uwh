import { useRouter } from "expo-router";
import { type ReactElement, useState } from "react";
import { useApp } from "../demo/app-state";
import {
	Button,
	EmptyState,
	List,
	ListItem,
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
				<List>
					{players.map((person) => (
						<Stack key={person.id} gap="none">
							<ListItem
								title={person.name}
								avatar={person.name}
								avatarId={person.id}
								description={person.goal}
								descriptionLines={2}
							/>
							<Row wrap justify="end" gap="xs">
								<Button
									label="Profile"
									variant="ghost"
									compact
									accessibilityLabel={`Profile for ${person.name}`}
									onPress={(): void =>
										router.push({
											pathname: "/member",
											params: {
												id: person.id,
												tab: "feedback",
												event: event.id,
											},
										})
									}
								/>
								<Button
									label="Rate session"
									variant="secondary"
									compact
									accessibilityLabel={`Rate session for ${person.name}`}
									onPress={(): void =>
										setRating({ personId: person.id, eventId: event.id })
									}
								/>
							</Row>
						</Stack>
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
