import { useQuery } from "convex/react";
import { useRouter } from "expo-router";
import { type ReactElement, useRef } from "react";
import { api } from "../../convex/_generated/api";
import { useApp } from "../demo/app-state";
import {
	formatTimeLocation,
	PracticeBanner,
	usePageLoading,
} from "../design-system";
import {
	type ChatPractice,
	chatProgramId,
	isUpcomingPractice,
	nextChatPractice,
} from "../domain/chat-practice";
import { eventTimeRange } from "../domain/event-card-presentation";
import { clubTimestamp } from "../domain/event-time";
import { defaultClubTimeZone } from "../domain/time-zones";
import { venueName } from "../domain/venue";
import { useClubNow } from "./use-club-now";

const PracticeLink = ({
	practice,
	now,
}: {
	practice?: ChatPractice | null;
	now: number;
}): ReactElement | undefined => {
	const router = useRouter();
	if (!practice || !isUpcomingPractice(practice.event, now)) return undefined;
	const { event, attending } = practice;
	const start = clubTimestamp(event.date, event.start, event.timeZone);
	const date = new Intl.DateTimeFormat("en", {
		weekday: "short",
		month: "short",
		day: "numeric",
		timeZone: event.timeZone ?? defaultClubTimeZone,
	}).format(start);
	return (
		<PracticeBanner
			label={start <= now ? "Practice in progress" : "Next practice"}
			title={event.title}
			detail={`${date} · ${formatTimeLocation(eventTimeRange(event.start, event.end), venueName(event.venue))}`}
			attendance={`${attending} attending`}
			onPress={(): void =>
				router.push({ pathname: "/session", params: { event: event.id } })
			}
		/>
	);
};
const LivePractice = ({
	threadId,
	now,
}: {
	threadId: string;
	now: number;
}): ReactElement => {
	const practice = useQuery(api.chat_practice.next, { threadId, now });
	usePageLoading(practice === undefined);
	const previous = useRef<ChatPractice | null>(undefined);
	if (practice !== undefined) previous.current = practice;
	return (
		<PracticeLink
			practice={practice === undefined ? previous.current : practice}
			now={now}
		/>
	);
};
export const ThreadPractice = ({
	threadId,
}: {
	threadId: string;
}): ReactElement | undefined => {
	const { source, data } = useApp();
	const now = useClubNow();
	if (!chatProgramId(threadId)) return undefined;
	if (source === "convex")
		return <LivePractice key={threadId} threadId={threadId} now={now} />;
	const event = nextChatPractice(data.events, threadId, now);
	return (
		<PracticeLink
			practice={
				event
					? {
							event,
							attending: data.responses.filter(
								(response) =>
									response.eventId === event.id &&
									response.response === "going",
							).length,
						}
					: undefined
			}
			now={now}
		/>
	);
};
