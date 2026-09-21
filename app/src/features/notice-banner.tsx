import { useRouter } from "expo-router";
import type { ReactElement } from "react";
import { api } from "../../convex/_generated/api";
import { useRetainedQuery } from "../backend/use-retained-query";
import { useApp } from "../demo/app-state";
import {
	AnnouncementBanner,
	List,
	ListItem,
	Stack,
	Surface,
} from "../design-system";
import type { Notice } from "../domain/app-types";
import { bannerNotices } from "../domain/notices";
import { useClubToday } from "./use-club-today";

const NoticeBannerContent = ({
	notices,
}: {
	notices: Notice[];
}): ReactElement => {
	const router = useRouter();
	const { account, dispatch, busy } = useApp();
	const today = useClubToday();
	const notice = bannerNotices(notices, account.id, today).at(0);
	return (
		<Stack gap="xs">
			{notice ? (
				<AnnouncementBanner
					message={notice.body}
					isDismissing={busy}
					onDismiss={(): void => {
						void dispatch({
							type: "dismiss-notice",
							noticeId: notice.id,
						});
					}}
				/>
			) : undefined}
			<Surface padding="none">
				<List>
					<ListItem
						icon="megaphone"
						title="Announcements"
						onPress={(): void => router.push("/announcements")}
					/>
				</List>
			</Surface>
		</Stack>
	);
};

const LiveNoticeBanner = (): ReactElement => {
	const today = useClubToday();
	const notices = useRetainedQuery(api.pages.activeNotices, { today });
	return <NoticeBannerContent notices={notices ?? []} />;
};

export const NoticeBanner = (): ReactElement => {
	const { source, data } = useApp();
	return source === "preview" ? (
		<NoticeBannerContent notices={data.notices} />
	) : (
		<LiveNoticeBanner />
	);
};
