import { useQuery } from "convex/react";
import { useRouter } from "expo-router";
import type { ReactElement } from "react";
import { api } from "../../convex/_generated/api";
import { useApp } from "../demo/app-state";
import {
	Button,
	List,
	ListItem,
	LoadingContent,
	SectionHeading,
	Stack,
	Surface,
	Text,
} from "../design-system";
import {
	type CoachingTasks,
	coachingTasks,
} from "../domain/coaching-dashboard";

const Tasks = ({ tasks }: { tasks?: CoachingTasks }): ReactElement => {
	const router = useRouter();
	return (
		<Stack gap="heading">
			<SectionHeading
				icon="message"
				action={
					<Button
						label="Members"
						compact
						variant="ghost"
						onPress={(): void => router.push("/members")}
					/>
				}
			>
				Needs attention
			</SectionHeading>
			{!tasks ? (
				<LoadingContent />
			) : (
				<Surface>
					<List>
						{tasks.goals.map((person) => (
							<ListItem
								key={person.id}
								title={`${person.name} · Goal request`}
								description={person.pendingGoal}
								descriptionLines={2}
								avatar={person.name}
								avatarId={person.id}
								onPress={(): void =>
									router.push({
										pathname: "/member",
										params: { id: person.id, tab: "goals" },
									})
								}
							/>
						))}
						{tasks.drafts.map((entry) => (
							<ListItem
								key={entry.id}
								title="Finish feedback draft"
								description={entry.body}
								descriptionLines={1}
								icon="edit"
								onPress={(): void =>
									router.push({
										pathname: "/member",
										params: { id: entry.personId, tab: "feedback" },
									})
								}
							/>
						))}
						{!tasks.goals.length && !tasks.drafts.length ? (
							<Text variant="small" tone="secondary">
								No goal requests or feedback drafts to review.
							</Text>
						) : undefined}
						{tasks.morePlayers || tasks.moreDrafts ? (
							<Text variant="caption" tone="secondary">
								Showing recent items. Open Members or a player’s Feedback tab
								for more.
							</Text>
						) : undefined}
					</List>
				</Surface>
			)}
		</Stack>
	);
};

const LiveTasks = (): ReactElement => (
	<Tasks tasks={useQuery(api.pages.coachingHome, {})} />
);
const PreviewTasks = (): ReactElement => {
	const { data, account } = useApp();
	return <Tasks tasks={coachingTasks(account, data.members, data.feedback)} />;
};
export const CoachingHomeTasks = (): ReactElement =>
	useApp().source === "convex" ? <LiveTasks /> : <PreviewTasks />;
