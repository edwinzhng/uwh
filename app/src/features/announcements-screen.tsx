import { type ReactElement, useState } from "react";
import { api } from "../../convex/_generated/api";
import { useRetainedQuery } from "../backend/use-retained-query";
import { useApp } from "../demo/app-state";
import { Button, LoadingContent } from "../design-system";
import { visibleNotices } from "../domain/app-rules";
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
	const { account, data, source, workspaceId } = useApp();
	const [editor, setEditor] = useState<{ notice?: Notice }>();
	const today = useClubToday();
	const active = visibleNotices({ ...data, notices }, account)
		.filter((notice) => isNoticeActive(notice, today))
		.slice()
		.sort((a, b) => b.date.localeCompare(a.date));
	return (
		<ClubShell
			title="Announcements"
			action={
				account.admin || account.coachPrograms.length ? (
					<Button
						label="New"
						prefix="plus"
						onPress={(): void => setEditor({})}
					/>
				) : undefined
			}
		>
			{loading ? (
				<LoadingContent />
			) : (
				<NoticeList
					notices={active}
					today={today}
					onEdit={(notice): void => setEditor({ notice })}
				/>
			)}
			{editor ? (
				<NoticeComposer
					key={`${source}:${workspaceId}:${account.id}:${editor.notice?.id ?? "new"}`}
					notice={editor.notice}
					onClose={(): void => setEditor(undefined)}
				/>
			) : undefined}
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
