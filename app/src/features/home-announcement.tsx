import { usePaginatedQuery } from "convex/react";
import { useRouter } from "expo-router";
import { type ReactElement, useEffect } from "react";
import { api } from "../../convex/_generated/api";
import { useApp, useAppStatus } from "../demo/app-state";
import { Button, SummaryCard, Text } from "../design-system";
import { formatDate } from "../domain/app-rules";
import type { Notice } from "../domain/app-types";
import { bannerNotices } from "../domain/notices";
import { useClubToday } from "./use-club-today";

const AnnouncementContent = ({
	notices,
}: {
	notices: Notice[];
}): ReactElement | undefined => {
	const { account, dispatch } = useApp();
	const { busy } = useAppStatus();
	const router = useRouter();
	const notice = bannerNotices(notices, account.id, useClubToday()).at(0);
	return notice ? (
		<SummaryCard
			title="Announcement"
			category="coral"
			metadata={formatDate(notice.date)}
			onPress={(): void => router.push("/announcements")}
			action={
				<Button
					label="Dismiss"
					variant="ghost"
					compact
					isLoading={busy}
					onPress={(): void => {
						void dispatch({ type: "dismiss-notice", noticeId: notice.id });
					}}
				/>
			}
		>
			<Text weight="medium">{notice.body}</Text>
		</SummaryCard>
	) : undefined;
};

const LiveAnnouncement = (): ReactElement => {
	const today = useClubToday();
	const { results, status, loadMore } = usePaginatedQuery(
		api.pages.homeAnnouncements,
		{ today },
		{ initialNumItems: 20 },
	);
	useEffect((): void => {
		if (!results.length && status === "CanLoadMore") loadMore(20);
	}, [results, status, loadMore]);
	return <AnnouncementContent notices={results} />;
};

export const HomeAnnouncement = (): ReactElement => {
	const { source, data } = useApp();
	return source === "convex" ? (
		<LiveAnnouncement />
	) : (
		<AnnouncementContent notices={data.notices} />
	);
};
