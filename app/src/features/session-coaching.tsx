import { useRouter } from "expo-router";
import type { ReactElement } from "react";
import { useApp } from "../demo/app-state";
import {
	EmptyState,
	List,
	ListItem,
	SectionHeading,
	Stack,
	Surface,
} from "../design-system";
import { canRegister } from "../domain/app-rules";
import type { ClubEvent } from "../domain/app-types";
import { SessionPlanSection } from "./session-plan-section";
import { TeamPanel } from "./team-panel";

export const SessionCoaching = ({
	event,
	partId,
}: {
	event: ClubEvent;
	partId?: string;
}): ReactElement => {
	const { data } = useApp();
	const router = useRouter();
	const players = data.members.filter((member) => canRegister(member, event));
	return (
		<Stack gap="xl">
			<SessionPlanSection
				key={`${event.id}:${partId ?? ""}`}
				event={event}
				partId={partId}
			/>
			<TeamPanel event={event} partId={partId} />
			<Stack gap="sm">
				<SectionHeading>Player feedback</SectionHeading>
				<Surface padding="sm">
					<List>
						{players.map((member) => (
							<ListItem
								key={member.id}
								title={member.name}
								avatar={member.name}
								avatarId={member.id}
								description={member.goal}
								onPress={(): void =>
									router.push({
										pathname: "/member",
										params: { id: member.id, tab: "feedback", event: event.id },
									})
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
			</Stack>
		</Stack>
	);
};
