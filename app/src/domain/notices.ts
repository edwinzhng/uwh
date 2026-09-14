import type { Notice } from "./app-types";

export const isNoticeActive = (notice: Notice, today: string): boolean =>
	notice.date <= today && (!notice.expiresAt || notice.expiresAt > today);

export const bannerNotices = (
	notices: Notice[],
	accountId: string,
	today: string,
): Notice[] =>
	notices
		.filter(
			(notice) =>
				isNoticeActive(notice, today) &&
				!notice.dismissedBy?.includes(accountId),
		)
		.toSorted((a, b) => b.date.localeCompare(a.date));
