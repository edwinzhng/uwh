import { type ReactElement, useState } from "react";
import { api } from "../../convex/_generated/api";
import { useRetainedQuery } from "../backend/use-retained-query";
import { useApp } from "../demo/app-state";
import {
	Button,
	Dialog,
	LoadingContent,
	Row,
	Stack,
	Surface,
	Text,
} from "../design-system";
import type { Notice } from "../domain/app-types";
import { bannerNotices } from "../domain/notices";
import { NoticeComposer } from "./notice-composer";
import { NoticeList } from "./notice-list";
import { useClubToday } from "./use-club-today";

const NoticeBannerContent = ({
	notices,
	showCreate,
	loading = false,
}: {
	notices: Notice[];
	showCreate: boolean;
	loading?: boolean;
}): ReactElement => {
	const { account, dispatch, busy } = useApp();
	const today = useClubToday();
	const [archive, setArchive] = useState(false);
	const [compose, setCompose] = useState(false);
	const visible = bannerNotices(notices, account.id, today);
	const notice = visible.at(0);
	return (
		<Stack gap="xs">
			{loading ? (
				<LoadingContent />
			) : notice ? (
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
			) : (
				<Surface padding="xs">
					<Row justify="between" wrap>
						<Text variant="small" tone="secondary">
							No new notices
						</Text>
						<Button
							label="View past notices"
							variant="secondary"
							compact
							onPress={(): void => setArchive(true)}
						/>
					</Row>
				</Surface>
			)}
			{notice ||
			(showCreate && (account.admin || account.coachPrograms.length > 0)) ? (
				<Row justify="between">
					{notice ? (
						<Button
							label={`View all notices${visible.length ? ` · ${visible.length} active` : ""}`}
							variant="ghost"
							onPress={(): void => setArchive(true)}
						/>
					) : undefined}
					{showCreate && (account.admin || account.coachPrograms.length > 0) ? (
						<Button
							label="New notice"
							variant="ghost"
							onPress={(): void => setCompose(true)}
						/>
					) : undefined}
				</Row>
			) : undefined}
			<Dialog title="Club notices" isOpen={archive} onOpenChange={setArchive}>
				<NoticeList />
			</Dialog>
			<NoticeComposer isOpen={compose} onOpenChange={setCompose} />
		</Stack>
	);
};
const LiveNoticeBanner = ({
	showCreate,
}: {
	showCreate: boolean;
}): ReactElement => {
	const today = useClubToday();
	const notices = useRetainedQuery(api.pages.activeNotices, {
		today: today,
	});
	return (
		<NoticeBannerContent
			notices={notices ?? []}
			loading={notices === undefined}
			showCreate={showCreate}
		/>
	);
};
export const NoticeBanner = ({
	showCreate = true,
}: {
	showCreate?: boolean;
}): ReactElement => {
	const { source, data } = useApp();
	return source === "preview" ? (
		<NoticeBannerContent notices={data.notices} showCreate={showCreate} />
	) : (
		<LiveNoticeBanner showCreate={showCreate} />
	);
};
