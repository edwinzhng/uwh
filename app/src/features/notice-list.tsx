import type { ReactElement } from "react";
import { useApp } from "../demo/app-state";
import { EmptyState, Stack } from "../design-system";
import type { Notice } from "../domain/app-types";
import { canManageNotice, isNoticeActive } from "../domain/notices";
import { NoticeCard } from "./notice-card";

export const NoticeList = ({
	notices,
	today,
	onEdit,
}: {
	notices: Notice[];
	today: string;
	onEdit: (notice: Notice) => void;
}): ReactElement => {
	const { account } = useApp();
	return notices.length ? (
		<Stack gap="xl">
			{notices.map((notice) => (
				<NoticeCard
					key={notice.id}
					notice={notice}
					manageable={
						canManageNotice(account, notice) && isNoticeActive(notice, today)
					}
					onEdit={onEdit}
				/>
			))}
		</Stack>
	) : (
		<EmptyState title="No announcements" />
	);
};
