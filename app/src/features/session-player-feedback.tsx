import { useRouter } from "expo-router";
import { type ReactElement, useState } from "react";
import { useApp } from "../demo/app-state";
import {
	Button,
	EmptyState,
	List,
	ListItem,
	SectionHeading,
	Stack,
	Surface,
} from "../design-system";
import {
	canCoachMember,
	canRegister,
	eventResponse,
} from "../domain/app-rules";
import type { ClubEvent } from "../domain/app-types";
import { effectiveAttendance } from "../domain/effective-attendance";
import { FeedbackEditor } from "./feedback-editor";

export const SessionPlayerFeedback = ({
	event,
}: {
	event: ClubEvent;
}): ReactElement => {
	const { data, account } = useApp();
	const router = useRouter();
	const [feedback, setFeedback] = useState<{
		personId: string;
		eventId: string;
	}>();
	const players = data.members.filter(
		(person) =>
			canRegister(person, event) &&
			canCoachMember(account, person) &&
			effectiveAttendance(event, eventResponse(data, event.id, person.id)) ===
				"present",
	);
	return (
		<Stack gap="heading">
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
								<Button
									prefix="plus"
									label="Feedback"
									variant="secondary"
									compact
									accessibilityLabel={`Feedback for ${person.name}`}
									onPress={(): void =>
										setFeedback({ personId: person.id, eventId: event.id })
									}
								/>
							}
						/>
					))}
					{!players.length ? (
						<EmptyState title="No players marked Here" />
					) : undefined}
				</List>
			</Surface>
			{feedback ? (
				<FeedbackEditor
					personId={feedback.personId}
					eventId={feedback.eventId}
					isOpen
					onOpenChange={(open): void => {
						if (!open) setFeedback(undefined);
					}}
				/>
			) : undefined}
		</Stack>
	);
};
