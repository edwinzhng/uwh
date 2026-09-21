import { useLocalSearchParams, useRouter } from "expo-router";
import { type ReactElement, useState } from "react";
import { api } from "../../convex/_generated/api";
import { useRetainedQuery } from "../backend/use-retained-query";
import { useApp } from "../demo/app-state";
import {
	Button,
	LoadingContent,
	SectionHeading,
	Stack,
	TabContent,
	Tabs,
} from "../design-system";
import type { Notice } from "../domain/app-types";
import { isNoticeActive } from "../domain/notices";
import { ClubShell } from "./club-shell";
import { NoticeComposer } from "./notice-composer";
import { NoticeList } from "./notice-list";
import { useClubToday } from "./use-club-today";

const AnnouncementsContent = ({
	notices,
	loading = false,
}: {
	notices: Notice[];
	loading?: boolean;
}): ReactElement => {
	const { account } = useApp();
	const router = useRouter();
	const params = useLocalSearchParams<{ tab?: string }>();
	const tab = account.admin && params.tab === "manage" ? "manage" : "live";
	const [composing, setComposing] = useState(false);
	const today = useClubToday();
	const active = notices
		.filter((notice) => isNoticeActive(notice, today))
		.slice()
		.sort((a, b) => b.date.localeCompare(a.date));
	return (
		<ClubShell
			title="Announcements"
			subtitle="Current club updates"
			tabs={
				account.admin ? (
					<Tabs
						page
						label="Announcements"
						hideLabel
						value={tab}
						onValueChange={(value): void => router.setParams({ tab: value })}
						options={[
							{ value: "live", label: "Announcements" },
							{ value: "manage", label: "Manage" },
						]}
					/>
				) : undefined
			}
			action={
				account.admin && tab === "live" ? (
					<Button
						label={composing ? "Cancel" : "New announcement"}
						staffRole="admin"
						prefix={composing ? undefined : "plus"}
						onPress={(): void => setComposing((value) => !value)}
					/>
				) : undefined
			}
		>
			<TabContent value={tab}>
				{tab === "manage" ? (
					<Stack gap="sm">
						<SectionHeading size="small">Manage announcements</SectionHeading>
						{loading ? (
							<LoadingContent />
						) : (
							<NoticeList notices={active} manageable />
						)}
					</Stack>
				) : (
					<Stack gap="sm">
						{composing ? (
							<NoticeComposer onPublished={(): void => setComposing(false)} />
						) : undefined}
						{loading ? <LoadingContent /> : <NoticeList notices={active} />}
					</Stack>
				)}
			</TabContent>
		</ClubShell>
	);
};

const LiveAnnouncementsScreen = (): ReactElement => {
	const today = useClubToday();
	const notices = useRetainedQuery(api.pages.activeNotices, { today });
	return (
		<AnnouncementsContent
			notices={notices ?? []}
			loading={notices === undefined}
		/>
	);
};

export const AnnouncementsScreen = (): ReactElement => {
	const { source, data } = useApp();
	return source === "preview" ? (
		<AnnouncementsContent notices={data.notices} />
	) : (
		<LiveAnnouncementsScreen />
	);
};
