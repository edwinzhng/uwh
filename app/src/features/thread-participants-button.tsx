import { useQuery } from "convex/react";
import type { ReactElement } from "react";
import { api } from "../../convex/_generated/api";
import { useApp } from "../demo/app-state";
import { Button } from "../design-system";
import type { Conversation } from "../domain/app-types";
import { previewThreadParticipants } from "../domain/thread-participants";

type Props = { thread: Conversation; onPress: () => void };
const ParticipantsButton = ({
	count,
	onPress,
}: {
	count?: number;
	onPress: () => void;
}): ReactElement => (
	<Button
		label="Conversation info"
		accessibilityLabel={
			count === undefined
				? "Conversation info"
				: `Conversation info, ${count} ${count === 1 ? "member" : "members"}`
		}
		icon="users"
		count={count}
		variant="ghost"
		onPress={onPress}
	/>
);
const LiveParticipantsButton = ({ thread, onPress }: Props): ReactElement => {
	const participants = useQuery(api.thread_participants.current, {
		threadId: thread.id,
	});
	return (
		<ParticipantsButton
			count={participants?.members.length}
			onPress={onPress}
		/>
	);
};
const PreviewParticipantsButton = ({
	thread,
	onPress,
}: Props): ReactElement => {
	const { data, accounts, account } = useApp();
	return (
		<ParticipantsButton
			count={
				previewThreadParticipants(data, accounts, account, thread).members
					.length
			}
			onPress={onPress}
		/>
	);
};
export const ThreadParticipantsButton = (props: Props): ReactElement =>
	useApp().source === "convex" ? (
		<LiveParticipantsButton thread={props.thread} onPress={props.onPress} />
	) : (
		<PreviewParticipantsButton thread={props.thread} onPress={props.onPress} />
	);
