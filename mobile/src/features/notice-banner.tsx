import { type ReactElement, useState } from "react";
import { api } from "../../convex/_generated/api";
import { useRetainedQuery } from "../backend/use-retained-query";
import { useApp } from "../demo/app-state";
import { Button, Dialog, Row, Stack, Surface, Text } from "../design-system";
import type { Notice } from "../domain/app-types";
import { bannerNotices } from "../domain/notices";
import { NoticeComposer } from "./notice-composer";
import { NoticeList } from "./notice-list";
import { useClubToday } from "./use-club-today";

const NoticeBannerContent = ({
	notices,
}: {
	notices: Notice[];
}): ReactElement => {
	const { account, dispatch, busy } = useApp();
	const today = useClubToday();
	const [archive, setArchive] = useState(false);
	const [compose, setCompose] = useState(false);
	const visible = bannerNotices(notices, account.id, today);
	const notice = visible.at(0);
	return (
		<Stack>
			{notice ? (
				<Surface>
					<Stack>
						<Row justify="between">
							<Text variant="h4">{notice.title}</Text>
							<Button
								label="Dismiss"
								variant="ghost"
								isDisabled={busy}
								onPress={(): void => {
									void dispatch({
										type: "dismiss-notice",
										noticeId: notice.id,
									});
								}}
							/>
						</Row>
						<Text>{notice.body}</Text>
					</Stack>
				</Surface>
			) : undefined}
			<Row justify="between">
				<Button
					label={`View all notices${visible.length ? ` · ${visible.length} active` : ""}`}
					variant="ghost"
					onPress={(): void => setArchive(true)}
				/>
				{account.admin || account.coachPrograms.length ? (
					<Button
						label="New notice"
						variant="ghost"
						onPress={(): void => setCompose(true)}
					/>
				) : undefined}
			</Row>
			<Dialog title="Club notices" isOpen={archive} onOpenChange={setArchive}>
				<NoticeList />
			</Dialog>
			<NoticeComposer isOpen={compose} onOpenChange={setCompose} />
		</Stack>
	);
};
const LiveNoticeBanner = (): ReactElement => {
	const today = useClubToday();
	const notices = useRetainedQuery(api.pages.activeNotices, {
		today: today,
	});
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
